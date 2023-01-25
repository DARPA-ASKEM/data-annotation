import csv
import json
import os
import tempfile
import time
from urllib.parse import urlparse
from io import StringIO
from zlib import compressobj

import boto3
import botocore
import numpy as np
import pandas as pd

from src.settings import settings

# S3 OBJECT

storage_host=os.getenv("STORAGE_HOST")
if "minio" in storage_host:
    s3 = boto3.resource(
        "s3",
        endpoint_url=os.getenv("STORAGE_HOST"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=None,
        config=boto3.session.Config(signature_version="s3v4"),
        verify=False,
    )
else:
    s3 = boto3.resource(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=None,
    config=boto3.session.Config(signature_version="s3v4"),
    verify=False,
)


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)


def try_parse_int(s: str, default: int = 0) -> int:
    try:
        return int(s)
    except ValueError:
        return default


def get_rawfile(path):
    """Gets a file from a filepath

    Args:
        path (str): URI to file

    Raises:
        FileNotFoundError: If the file cannnot be found on S3.
        RuntimeError: If the path URI does not begin with 'file' or 's3'
        there is no handler for it yet.

    Returns:
        file: a file-like object
    """
    location_info = urlparse(path)

    if location_info.scheme.lower() == "file":
        return open(location_info.path, "rb")
    if location_info.scheme.lower() in ["minio","s3"]:
        try:
            file_path = location_info.path.lstrip("/")
            raw_file = tempfile.TemporaryFile()
            s3.Object(location_info.netloc, file_path).download_fileobj(raw_file)
            raw_file.seek(0)
        except botocore.exceptions.ClientError as error:
            raise FileNotFoundError() from error

    else:
        raise RuntimeError("File storage format is unknown")

    return raw_file


def put_rawfile(path, fileobj):
    """Puts/uploads a file at URI specified

    Args:
        path (str): URI to put/upload the file to.
        fileobj (file): The file-like object to upload.

    Raises:
        RuntimeError: If the path URI does not begin with 'file' or 's3'
        there is no handler for it yet.
    """

    location_info = urlparse(path)

    if location_info.scheme.lower() == "file":
        if not os.path.isdir(os.path.dirname(location_info.path)):
            os.makedirs(os.path.dirname(location_info.path), exist_ok=True)
        with open(location_info.path, "wb") as output_file:
            output_file.write(fileobj.read())
    elif location_info.scheme.lower() in ["s3", "minio"]:
        output_path = location_info.path.lstrip("/")
        s3.Object(location_info.netloc, output_path).put(Body=fileobj)
    else:
        raise RuntimeError("File storage format is unknown")


def list_files(path):
    location_info = urlparse(path)
    if location_info.scheme.lower() == "file":
        return os.listdir(location_info.path)
    elif location_info.scheme.lower() == "s3":
        s3_list = s3.list_objects(
            Bucket=location_info.netloc, Marker=location_info.path
        )
        s3_contents = s3_list["Contents"]
        final_file_list = []
        for x in s3_contents:
            filename = x["Key"]
            final_file_list.append(f"{location_info.path}/{filename}")

        return final_file_list
    else:
        raise RuntimeError("File storage format is unknown")


async def stream_csv_from_data_paths(data_paths):
    # Build single dataframe
    df = pd.concat(pd.read_parquet(file) for file in data_paths)

    # Ensure pandas floats are used because vanilla python ones are problematic
    df = df.fillna("").astype(
        {
            col: "str"
            for col in df.select_dtypes(include=["float32", "float64"]).columns
        },
        # Note: This links it to the previous `df` so not a full copy
        copy=False,
    )

    # Prepare for writing CSV to a temporary buffer
    buffer = StringIO()
    writer = csv.writer(buffer)

    # Write out the header row
    writer.writerow(df.columns)

    yield buffer.getvalue()
    buffer.seek(0)  # To clear the buffer we need to seek back to the start and truncate
    buffer.truncate()

    # Iterate over dataframe tuples, writing each one out as a CSV line one at a time
    for record in df.itertuples(index=False, name=None):
        writer.writerow(str(i) for i in record)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate()


async def compress_stream(content):
    compressor = compressobj()
    async for buff in content:
        yield compressor.compress(buff.encode())
    yield compressor.flush()
