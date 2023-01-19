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
s3 = boto3.client("s3")


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
    location_info = urlparse(path)

    if location_info.scheme.lower() == "file":
        raw_file = open(location_info.path, "rb")
    elif location_info.scheme.lower() == "s3":
        try:
            file_path = location_info.path.lstrip("/")
            raw_file = tempfile.TemporaryFile()
            s3.download_fileobj(
                Bucket=location_info.netloc, Key=file_path, Fileobj=raw_file
            )
            raw_file.seek(0)
        except botocore.exceptions.ClientError as e:
            raise FileNotFoundError()
    else:
        raise RuntimeError("File storage format is unknown")

    return raw_file


def put_rawfile(path, fileobj):
    location_info = urlparse(path)

    if location_info.scheme.lower() == "file":
        if not os.path.isdir(os.path.dirname(location_info.path)):
            os.makedirs(os.path.dirname(location_info.path), exist_ok=True)
        with open(location_info.path, "wb") as output_file:
            output_file.write(fileobj.read())
    elif location_info.scheme.lower() == "s3":
        output_path = location_info.path.lstrip("/")
        s3.put_object(Bucket=location_info.netloc, Key=output_path, Body=fileobj)
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
