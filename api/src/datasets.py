from __future__ import annotations

import csv
import io
import re
import time
import zlib
import uuid
from datetime import datetime
import tempfile
from typing import Any, Dict, Generator, List, Optional
from urllib.parse import urlparse

import json
import pandas as pd
import requests

from elasticsearch import Elasticsearch
import pandas as pd
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Response,
    status,
    UploadFile,
    File,
    Request,
)
from fastapi.logger import logger
from fastapi.responses import StreamingResponse

from validation import IndicatorSchema, DojoSchema, MetadataSchema
from src.settings import settings

from src.dojo import search_and_scroll
from src.utils import put_rawfile, get_rawfile, list_files, NpEncoder
from validation.IndicatorSchema import (
    # DataRepresentationSchema,
    IndicatorMetadataSchema,
    QualifierOutput,
    Output,
    Period,
    Geography,
)

import os

router = APIRouter()

es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)


# For created_at times in epoch milliseconds
def current_milli_time():
    return round(time.time() * 1000)


@router.post("/datasets")
def create_indicator(payload: Dict[Any, Any]):

    person_payload = {
        "id": 0,
        "name": payload["maintainer"]["name"],
        "email": payload["maintainer"]["email"],
        "org": payload["maintainer"]["organization"],
        "website": payload["maintainer"]["website"],
        "is_registered": True,
    }

    persons_response = requests.post(
        "http://data-service_api_1:8000/persons", json=person_payload
    )

    p_response_obj = persons_response.json()

    dataset_payload = {
        "id": 0,
        "name": payload["name"],
        "url": payload["maintainer"]["website"],
        "description": payload["description"],
        "deprecated": False,
        "sensitivity": payload["data_sensitivity"],
        "quality": payload["data_quality"],
        "annotations": "{}",
        "maintainer": p_response_obj["id"],
    }
    try:
        dataset_payload["temporal_resolution"] = payload["temporal_resolution"]
    except:
        logger.debug("No temporal resolution")
    try:
        dataset_payload["geospatial_resolution"] = payload["spatial_resolution"]
    except:
        logger.debug("No spatial resolution")

    response = requests.post(
        "http://data-service_api_1:8000/datasets/datasets", json=dataset_payload
    )

    response_obj = response.json()

    # association_payload = {
    #     "id": 0,
    #     "person_id": p_response_obj["id"],
    #     "asset_id": response_obj["id"],
    #     "type": "dataset",
    #     "role": "maintainer",
    # }

    # association_response = requests.post(
    #     "http://data-service_api_1:8000/associations",
    #     json=association_payload,
    # )

    return response_obj


@router.put("/datasets")
def update_indicator(
    payload: Dict[Any, Any]
):  # IndicatorSchema.IndicatorMetadataSchema

    id = payload["id"]
    dataset_payload = {**payload}
    dataset_payload["annotations"] = json.dumps(dataset_payload["annotations"])

    response = requests.patch(
        f"http://data-service_api_1:8000/datasets/datasets/{id}",
        json=dataset_payload,
    )

    response_obj = response.json()

    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{id}"},
        content=f"Updated indicator with id = {id}",
    )


# UNMODIFIED
@router.patch("/datasets")
def patch_indicator(
    payload: IndicatorSchema.IndicatorMetadataSchema, indicator_id: str
):
    payload.created_at = current_milli_time()
    body = json.loads(payload.json(exclude_unset=True))
    es.update(index="datasets", body={"doc": body}, id=indicator_id)
    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{indicator_id}"},
        content=f"Updated indicator with id = {indicator_id}",
    )


@router.get("/datasets/latest")
def get_latest_datasets(size=100):
    dataArray = requests.get(
        f"http://data-service_api_1:8000/datasets/datasets?count={size}"
    )
    logger.warn(f"Data Array: {dataArray}")
    return dataArray.json()


# UNMODIFIED
@router.get("/datasets", response_model=DojoSchema.IndicatorSearchResult)
def search_datasets(
    query: str = Query(None),
    size: int = 10,
    scroll_id: str = Query(None),
    include_ontologies: bool = True,
    include_geo: bool = True,
) -> DojoSchema.IndicatorSearchResult:
    indicator_data = search_and_scroll(
        index="datasets", size=size, query=query, scroll_id=scroll_id
    )
    # if request wants ontologies and geo data return all
    if include_ontologies and include_geo:
        return indicator_data
    else:
        for indicator in indicator_data["results"]:
            if not include_ontologies:
                for q_output in indicator["qualifier_outputs"]:
                    try:
                        q_output["ontologies"] = {
                            "concepts": None,
                            "processes": None,
                            "properties": None,
                        }
                    except Exception as e:
                        print(e)
                        logger.exception(e)
                for outputs in indicator["outputs"]:
                    try:
                        outputs["ontologies"] = {
                            "concepts": None,
                            "processes": None,
                            "properties": None,
                        }
                    except Exception as e:
                        print(e)
                        logger.exception(e)
            if not include_geo:
                indicator["geography"]["country"] = []
                indicator["geography"]["admin1"] = []
                indicator["geography"]["admin2"] = []
                indicator["geography"]["admin3"] = []

        return indicator_data


@router.get("/datasets/{indicator_id}")
def get_datasets(indicator_id: str):
    dataset = requests.get(
        f"http://data-service_api_1:8000/datasets/datasets/{indicator_id}"
    )
    return dataset.json()


# UNMODIFIED
@router.put("/datasets/{indicator_id}/publish")
def publish_indicator(indicator_id: str):
    try:
        indicator = es.get(index="datasets", id=indicator_id)["_source"]
        indicator["published"] = True
        es.index(index="datasets", body=indicator, id=indicator_id)

    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{indicator_id}/publish"},
        content=f"Published indicator with id {indicator_id}",
    )


# UNMODIFIED
@router.get("/datasets/{indicator_id}/download/csv")
def get_csv(indicator_id: str, request: Request):
    try:
        indicator = es.get(index="datasets", id=indicator_id)["_source"]
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    async def iter_csv():
        # Build single dataframe
        df = pd.concat(pd.read_parquet(file) for file in indicator["data_paths"])

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
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        # Write out the header row
        writer.writerow(df.columns)

        yield buffer.getvalue()
        buffer.seek(
            0
        )  # To clear the buffer we need to seek back to the start and truncate
        buffer.truncate()

        # Iterate over dataframe tuples, writing each one out as a CSV line one at a time
        for record in df.itertuples(index=False, name=None):
            writer.writerow(str(i) for i in record)
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate()

    async def compress(content):
        compressor = zlib.compressobj()
        async for buff in content:
            yield compressor.compress(buff.encode())
        yield compressor.flush()

    if "deflate" in request.headers.get("accept-encoding", ""):
        return StreamingResponse(
            compress(iter_csv()),
            media_type="text/csv",
            headers={"Content-Encoding": "deflate"},
        )
    else:
        return StreamingResponse(
            iter_csv(),
            media_type="text/csv",
        )


@router.put("/datasets/{indicator_id}/deprecate")
def deprecate_indicator(indicator_id: str):
    try:
        response = requests.post(
            f"http://data-service_api_1:8000/datasets/datasets/deprecate/{indicator_id}"
        )
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{indicator_id}"},
        content=f"Deprecated indicator with id {indicator_id}",
    )


@router.get(
    "/datasets/{indicator_id}/annotations", response_model=MetadataSchema.MetaModel
)
def get_annotations(indicator_id: str) -> MetadataSchema.MetaModel:
    """Get annotations for a dataset.

    Args:
        indicator_id (str): The UUID of the dataset to retrieve annotations for from elasticsearch.

    Raises:
        HTTPException: This is raised if no annotation is found for the dataset in elasticsearch.

    Returns:
        MetadataSchema.MetaModel: Returns the annotations pydantic schema for the dataset that contains a metadata dictionary and an annotations object validated via a nested pydantic schema.
    """
    try:
        db_response = get_datasets(indicator_id)
        annotation = db_response["annotations"]
        return annotation
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        return None


@router.post("/datasets/{indicator_id}/annotations")
def post_annotation(payload: MetadataSchema.MetaModel, indicator_id: str):
    """Post annotations for a dataset.

    Args:
        payload (MetadataSchema.MetaModel): Payload needs to be a fully formed json object representing the pydantic schema MettaDataSchema.MetaModel.
        indicator_id (str): The UUID of the dataset to retrieve annotations for from elasticsearch.

    Returns:
        Response: Returns a response with the status code of 201 and the location of the annotation.
    """
    try:

        body = json.loads(payload.json())

        existing_dataset = get_datasets(indicator_id)

        existing_dataset["annotations"] = json.dumps(body)

        patch_response = requests.patch(
            f"http://data-service_api_1:8000/datasets/datasets/{indicator_id}",
            json=existing_dataset,
        )

        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/api/annotations/{indicator_id}"},
            content=f"Updated annotation with id = {indicator_id}",
        )
    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Could not update annotation with id = {indicator_id}",
        )


@router.put("/datasets/{indicator_id}/annotations")
def put_annotation(payload: MetadataSchema.MetaModel, indicator_id: str):
    """Put annotation for a dataset to Elasticsearch.

    Args:
        payload (MetadataSchema.MetaModel): Payload needs to be a fully formed json object representing the pydantic schema MettaDataSchema.MetaModel.
        indicator_id (str): The UUID of the dataset for which the annotations apply.

    Returns:
        Response: Response object with status code, informational messages, and content.
    """
    try:

        body = json.loads(payload.json())

        existing_dataset = get_datasets(indicator_id)

        existing_dataset["annotations"] = json.dumps(body)

        patch_response = requests.patch(
            f"http://data-service_api_1:8000/datasets/datasets/{indicator_id}",
            json=existing_dataset,
        )

        for feature in body["annotations"]["feature"]:
            logger.info(feature)
            if "qualifies" in feature:
                qualifier_payload = {
                    "id": 0,
                    "dataset_id": indicator_id,
                    "description": feature["description"],
                    "display_name": feature["display_name"],
                    "name": feature["name"],
                    "value_type": feature["feature_type"],
                }
                qualifier_response = requests.post(
                    f"http://data-service_api_1:8000/qualifiers", json=qualifier_payload
                )
            feature_payload = {
                "id": 0,
                "dataset_id": indicator_id,
                "description": feature["description"],
                "display_name": feature["display_name"],
                "name": feature["name"],
                "value_type": feature["feature_type"],
            }
            feature_response = requests.post(
                f"http://data-service_api_1:8000/features", json=feature_payload
            )

        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/api/annotations/{indicator_id}"},
            content=f"Created annotation with id = {indicator_id}",
        )
    except Exception as e:
        logger.exception(e)

        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Could not create annotation with id = {indicator_id}",
        )


@router.patch("/datasets/{indicator_id}/annotations")
def patch_annotation(payload: MetadataSchema.MetaModel, indicator_id: str):
    """Patch annotation for a dataset to Elasticsearch.

    Args:
        payload (MetadataSchema.MetaModel): Payload needs to be a partially formed json object valid for the pydantic schema MettaDataSchema.MetaModel.
        indicator_id (str): The UUID of the dataset for which the annotations apply.

    Returns:
        Response: Response object with status code, informational messages, and content.
    """
    try:

        body = json.loads(payload.json(exclude_unset=True))

        logger.warn(f"Annotations PATCH: {body}")

        existing_dataset = get_datasets(indicator_id)

        existing_dataset["annotations"] = json.dumps(body)

        patch_response = requests.patch(
            f"http://data-service_api_1:8000/datasets/datasets/{indicator_id}",
            json=existing_dataset,
        )

        try:
            qualifier_list = []
            for feature in body["annotations"]["feature"]:
                logger.info(feature)
                if feature["qualifies"]:
                    qualifier_list.append(feature)
                feature_payload = {
                    "id": 0,
                    "dataset_id": indicator_id,
                    "description": feature["description"],
                    "display_name": feature["display_name"],
                    "name": feature["name"],
                    "value_type": feature["feature_type"],
                }
                feature_response = requests.post(
                    f"http://data-service_api_1:8000/features", json=feature_payload
                )

            for feature in qualifier_list:
                qualifier_payload = {
                    "id": 0,
                    "dataset_id": indicator_id,
                    "description": feature["description"],
                    "display_name": feature["display_name"],
                    "name": feature["name"],
                    "value_type": feature["feature_type"],
                }
                post_payload = {
                    "payload": qualifier_payload,
                    "qualifies_array": feature["qualifies"],
                }
                qualifier_response = requests.post(
                    f"http://data-service_api_1:8000/qualifiers", json=post_payload
                )
        except:
            logger.warn("No annotations currently")

        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/api/annotations/{indicator_id}"},
            content=f"Updated annotation with id = {indicator_id}",
        )
    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Could not update annotation with id = {indicator_id}",
        )


@router.post("/datasets/{indicator_id}/upload")
def upload_file(
    indicator_id: str,
    file: UploadFile = File(...),
    filename: Optional[str] = None,
    append: Optional[bool] = False,
):
    original_filename = file.filename
    _, ext = os.path.splitext(original_filename)
    dir_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, indicator_id)
    if filename is None:
        if append:
            filenum = len(
                [
                    f
                    for f in list_files(dir_path)
                    if f.startswith("raw_data") and f.endswith(ext)
                ]
            )
            filename = f"raw_data_{filenum}{ext}"
        else:
            filename = f"raw_data{ext}"

    # Upload file
    dest_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, indicator_id, filename)
    put_rawfile(path=dest_path, fileobj=file.file)

    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={
            "location": f"/api/datasets/{indicator_id}",
            "content-type": "application/json",
        },
        content=json.dumps({"id": indicator_id, "filename": filename}),
    )


@router.get("/datasets/{indicator_id}/verbose")
def get_all_indicator_info(indicator_id: str):
    indicator = get_datasets(indicator_id)
    annotations = get_annotations(indicator_id)

    verbose_return_object = {"datasets": indicator, "annotations": annotations}

    return verbose_return_object


@router.post(
    "/datasets/validate_date",
    response_model=IndicatorSchema.DateValidationResponseSchema,
)
def validate_date(payload: IndicatorSchema.DateValidationRequestSchema):
    valid = True
    try:
        for value in payload.values:
            datetime.strptime(value, payload.format)
    except ValueError as e:
        logger.exception(e)
        valid = False

    return {
        "format": payload.format,
        "valid": valid,
    }


@router.get("/datasets/{indicator_id}/data")
async def get_data(indicator_id: str):
    """Get representation of dataset as 2d array (list of lists).

    Args:
        indicator_id (str): The UUID of the dataset to return a preview of.

    Returns:
        JSON: Returns a json object containing the preview for the dataset.
    """
    try:
        rawfile_path = os.path.join(
            settings.DATASET_STORAGE_BASE_URL, indicator_id, "raw_data.csv"
        )
        file = get_rawfile(rawfile_path)
        df = pd.read_csv(file, delimiter=",").fillna("")

        columns = [
            "" if column.startswith("Unnamed: ") else column
            for column in list(df.columns)
        ]
        records = [columns] + list(map(list, df.to_records(index=False)))

        body = json.dumps(records)
        return Response(
            status_code=200,
            headers={
                "content-type": "application/json",
            },
            content=body,
        )

    except FileNotFoundError as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_400_BAD_REQUEST,
            headers={"msg": f"Error: {e}"},
            content=f"Error fetching data",
        )


@router.post("/datasets/{indicator_id}/data")
async def update_data(indicator_id: str, payload: List[List[Any]]):
    """Update representation of dataset as 2d array (list of lists).

    Args:
        indicator_id (str): The UUID of the dataset to return a preview of.

    Returns:
        JSON: Returns a json object containing the preview for the dataset.
    """
    try:
        rawfile_path = os.path.join(
            settings.DATASET_STORAGE_BASE_URL, indicator_id, "raw_data.csv"
        )
        logger.warn(payload)
        df = pd.DataFrame.from_records(data=payload[1:], columns=payload[0])
        logger.warn(df)

        with tempfile.NamedTemporaryFile("rb") as temp_csv:
            df.to_csv(temp_csv.name, index=False)
            put_rawfile(rawfile_path, temp_csv)

        return True

    except IOError as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_400_BAD_REQUEST,
            headers={"msg": f"Error: {e}"},
            content=f"Error saving data",
        )


@router.post("/datasets/{indicator_id}/preview/{preview_type}")
async def create_preview(
    indicator_id: str,
    preview_type: IndicatorSchema.PreviewType,
    filename: Optional[str] = Query(None),
    filepath: Optional[str] = Query(None),
):
    """Get preview for a dataset.

    Args:
        indicator_id (str): The UUID of the dataset to return a preview of.

    Returns:
        JSON: Returns a json object containing the preview for the dataset.
    """
    try:
        if filename:
            file_suffix_match = re.search(r"raw_data(_\d+)?\.", filename)
            if file_suffix_match:
                file_suffix = file_suffix_match.group(1) or ""
            else:
                file_suffix = ""
        else:
            file_suffix = ""
        # TODO - Get all potential string files concatenated together using list file utility
        if preview_type == IndicatorSchema.PreviewType.processed:
            if filepath:
                rawfile_path = os.path.join(
                    settings.DATASET_STORAGE_BASE_URL,
                    filepath.replace(".csv", ".parquet.gzip"),
                )
            else:
                rawfile_path = os.path.join(
                    settings.DATASET_STORAGE_BASE_URL,
                    indicator_id,
                    f"{indicator_id}{file_suffix}.parquet.gzip",
                )

            file = get_rawfile(rawfile_path)
            df = pd.read_parquet(file)
            try:
                strparquet_path = os.path.join(
                    settings.DATASET_STORAGE_BASE_URL,
                    indicator_id,
                    f"{indicator_id}_str{file_suffix}.parquet.gzip",
                )
                file = get_rawfile(strparquet_path)
                df_str = pd.read_parquet(file)
                df = pd.concat([df, df_str])
            except FileNotFoundError:
                pass

        else:
            if filepath:
                rawfile_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, filepath)
            else:
                rawfile_path = os.path.join(
                    settings.DATASET_STORAGE_BASE_URL, indicator_id, "raw_data.csv"
                )
            file = get_rawfile(rawfile_path)
            df = pd.read_csv(file, delimiter=",")

        obj = json.loads(
            df.sort_index().reset_index(drop=True).head(100).to_json(orient="index")
        )
        indexed_rows = [{"__id": key, **value} for key, value in obj.items()]

        return indexed_rows
    except FileNotFoundError as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_400_BAD_REQUEST,
            headers={"msg": f"Error: {e}"},
            content=f"Queue could not be deleted.",
        )