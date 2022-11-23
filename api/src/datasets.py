from __future__ import annotations

import re
import time
from datetime import datetime
import tempfile
from typing import Any, Dict, List, Optional

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
from src.utils import (
    put_rawfile,
    get_rawfile,
    list_files,
    stream_csv_from_data_paths,
    compress_stream,
)
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

tds_url = settings.TDS_URL


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

    persons_response = requests.post(f"{tds_url}/persons", json=person_payload)

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

    response = requests.post(f"{tds_url}/datasets", json=dataset_payload)

    response_obj = response.json()

    return response_obj


@router.put("/datasets")
def update_indicator(
    payload: Dict[Any, Any]
):  # IndicatorSchema.IndicatorMetadataSchema

    id = payload["id"]
    dataset_payload = {**payload}
    annotations = dataset_payload["annotations"]
    annotations["data_paths"] = dataset_payload["data_paths"]
    dataset_payload["annotations"] = json.dumps(annotations)

    response = requests.patch(
        f"{tds_url}/datasets/{id}",
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
def patch_indicator(payload: IndicatorSchema.IndicatorMetadataSchema, dataset_id: str):
    payload.created_at = current_milli_time()
    body = json.loads(payload.json(exclude_unset=True))
    es.update(index="datasets", body={"doc": body}, id=dataset_id)
    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{dataset_id}"},
        content=f"Updated indicator with id = {dataset_id}",
    )


@router.get("/datasets/latest")
def get_latest_datasets(size=100):
    dataArray = requests.get(f"{tds_url}/datasets?page_size={size}")
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


@router.get("/datasets/{dataset_id}")
def get_datasets(dataset_id: str):
    dataset = requests.get(f"{tds_url}/datasets/{dataset_id}")
    return dataset.json()


# UNMODIFIED
@router.put("/datasets/{dataset_id}/publish")
def publish_indicator(dataset_id: str):
    try:
        indicator = es.get(index="datasets", id=dataset_id)["_source"]
        indicator["published"] = True
        es.index(index="datasets", body=indicator, id=dataset_id)

    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{dataset_id}/publish"},
        content=f"Published indicator with id {dataset_id}",
    )


@router.post("/datasets/download/csv")
def get_csv(request: Request, data_path_list: List[str] = Query(...)):

    if "deflate" in request.headers.get("accept-encoding", ""):
        return StreamingResponse(
            compress_stream(stream_csv_from_data_paths(data_path_list)),
            media_type="text/csv",
            headers={"Content-Encoding": "deflate"},
        )
    else:
        return StreamingResponse(
            stream_csv_from_data_paths(data_path_list),
            media_type="text/csv",
        )


@router.put("/datasets/{dataset_id}/deprecate")
def deprecate_indicator(dataset_id: str):
    try:
        response = requests.post(f"{tds_url}/datasets/deprecate/{dataset_id}")
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/api/datasets/{dataset_id}"},
        content=f"Deprecated indicator with id {dataset_id}",
    )


@router.get(
    "/datasets/{dataset_id}/annotations", response_model=MetadataSchema.MetaModel
)
def get_annotations(dataset_id: str) -> MetadataSchema.MetaModel:
    """Get annotations for a dataset.

    Args:
        dataset_id (str): The UUID of the dataset to retrieve annotations for from elasticsearch.

    Raises:
        HTTPException: This is raised if no annotation is found for the dataset in elasticsearch.

    Returns:
        MetadataSchema.MetaModel: Returns the annotations pydantic schema for the dataset that contains a metadata dictionary and an annotations object validated via a nested pydantic schema.
    """
    try:
        db_response = get_datasets(dataset_id)
        annotation = db_response["annotations"]
        return annotation
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        return None


@router.post("/datasets/{dataset_id}/annotations")
def post_annotation(payload: MetadataSchema.MetaModel, dataset_id: str):
    """Post annotations for a dataset.

    Args:
        payload (MetadataSchema.MetaModel): Payload needs to be a fully formed json object representing the pydantic schema MettaDataSchema.MetaModel.
        dataset_id (str): The UUID of the dataset to retrieve annotations for from elasticsearch.

    Returns:
        Response: Returns a response with the status code of 201 and the location of the annotation.
    """
    try:

        body = json.loads(payload.json())

        existing_dataset = get_datasets(dataset_id)

        existing_dataset["annotations"] = json.dumps(body)

        patch_response = requests.patch(
            f"{tds_url}/datasets/{dataset_id}",
            json=existing_dataset,
        )

        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/api/annotations/{dataset_id}"},
            content=f"Updated annotation with id = {dataset_id}",
        )
    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Could not update annotation with id = {dataset_id}",
        )


@router.put("/datasets/{dataset_id}/annotations")
def put_annotation(payload: MetadataSchema.MetaModel, dataset_id: str):
    """Put annotation for a dataset to Elasticsearch.

    Args:
        payload (MetadataSchema.MetaModel): Payload needs to be a fully formed json object representing the pydantic schema MettaDataSchema.MetaModel.
        dataset_id (str): The UUID of the dataset for which the annotations apply.

    Returns:
        Response: Response object with status code, informational messages, and content.
    """
    try:

        body = json.loads(payload.json())

        existing_dataset = get_datasets(dataset_id)

        existing_dataset["annotations"] = json.dumps(body)

        patch_response = requests.patch(
            f"{tds_url}/datasets/{dataset_id}",
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
                    "dataset_id": dataset_id,
                    "description": feature["description"],
                    "display_name": feature["display_name"],
                    "name": feature["name"],
                    "value_type": feature["feature_type"],
                }
                feature_response = requests.post(
                    f"{tds_url}/datasets/features",
                    json=feature_payload,
                )

            for feature in qualifier_list:
                qualifier_payload = {
                    "id": 0,
                    "dataset_id": dataset_id,
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
                    f"{tds_url}/datasets/qualifiers",
                    json=post_payload,
                )
        except:
            logger.warn("No annotations currently")

        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/api/annotations/{dataset_id}"},
            content=f"Created annotation with id = {dataset_id}",
        )
    except Exception as e:
        logger.exception(e)

        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Could not create annotation with id = {dataset_id}",
        )


@router.patch("/datasets/{dataset_id}/annotations")
def patch_annotation(payload: MetadataSchema.MetaModel, dataset_id: str):
    """Patch annotation for a dataset to Elasticsearch.

    Args:
        payload (MetadataSchema.MetaModel): Payload needs to be a partially formed json object valid for the pydantic schema MettaDataSchema.MetaModel.
        dataset_id (str): The UUID of the dataset for which the annotations apply.

    Returns:
        Response: Response object with status code, informational messages, and content.
    """
    try:

        body = json.loads(payload.json(exclude_unset=True))

        logger.warn(f"Annotations PATCH: {body}")

        existing_dataset = get_datasets(dataset_id)

        existing_dataset["annotations"] = json.dumps(body)

        patch_response = requests.patch(
            f"{tds_url}/datasets/{dataset_id}",
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
                    "dataset_id": dataset_id,
                    "description": feature["description"],
                    "display_name": feature["display_name"],
                    "name": feature["name"],
                    "value_type": feature["feature_type"],
                }
                feature_response = requests.post(
                    f"{tds_url}/datasets/features",
                    json=feature_payload,
                )

            for feature in qualifier_list:
                qualifier_payload = {
                    "id": 0,
                    "dataset_id": dataset_id,
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
                    f"{tds_url}/datasets/qualifiers",
                    json=post_payload,
                )
        except:
            logger.warn("No annotations currently")

        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/api/annotations/{dataset_id}"},
            content=f"Updated annotation with id = {dataset_id}",
        )
    except Exception as e:
        logger.exception(e)
        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Could not update annotation with id = {dataset_id}",
        )


@router.post("/datasets/{dataset_id}/upload")
def upload_file(
    dataset_id: str,
    file: UploadFile = File(...),
    filename: Optional[str] = None,
    append: Optional[bool] = False,
):
    original_filename = file.filename
    _, ext = os.path.splitext(original_filename)
    dir_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, dataset_id)
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
    dest_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, dataset_id, filename)
    put_rawfile(path=dest_path, fileobj=file.file)

    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={
            "location": f"/api/datasets/{dataset_id}",
            "content-type": "application/json",
        },
        content=json.dumps({"id": dataset_id, "filename": filename}),
    )


@router.get("/datasets/{dataset_id}/verbose")
def get_all_indicator_info(dataset_id: str):
    indicator = get_datasets(dataset_id)
    annotations = get_annotations(dataset_id)

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


@router.get("/datasets/{dataset_id}/data")
async def get_data(dataset_id: str):
    """Get representation of dataset as 2d array (list of lists).

    Args:
        dataset_id (str): The UUID of the dataset to return a preview of.

    Returns:
        JSON: Returns a json object containing the preview for the dataset.
    """
    try:
        rawfile_path = os.path.join(
            settings.DATASET_STORAGE_BASE_URL, dataset_id, "raw_data.csv"
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


@router.post("/datasets/{dataset_id}/data")
async def update_data(dataset_id: str, payload: List[List[Any]]):
    """Update representation of dataset as 2d array (list of lists).

    Args:
        dataset_id (str): The UUID of the dataset to return a preview of.

    Returns:
        JSON: Returns a json object containing the preview for the dataset.
    """
    try:
        rawfile_path = os.path.join(
            settings.DATASET_STORAGE_BASE_URL, dataset_id, "raw_data.csv"
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


@router.post("/datasets/{dataset_id}/preview/{preview_type}")
async def create_preview(
    dataset_id: str,
    preview_type: IndicatorSchema.PreviewType,
    filename: Optional[str] = Query(None),
    filepath: Optional[str] = Query(None),
):
    """Get preview for a dataset.

    Args:
        dataset_id (str): The UUID of the dataset to return a preview of.

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
                    dataset_id,
                    f"{dataset_id}{file_suffix}.parquet.gzip",
                )

            file = get_rawfile(rawfile_path)
            df = pd.read_parquet(file)
            try:
                strparquet_path = os.path.join(
                    settings.DATASET_STORAGE_BASE_URL,
                    dataset_id,
                    f"{dataset_id}_str{file_suffix}.parquet.gzip",
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
                    settings.DATASET_STORAGE_BASE_URL, dataset_id, "raw_data.csv"
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
