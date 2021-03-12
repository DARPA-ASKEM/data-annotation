import itertools
import logging
import os
import pathlib
import sys
import time
from datetime import datetime

import uvicorn
from fastapi import FastAPI

from api import cubes, experiments, jobs, models

logger = logging.getLogger(__name__)

api = FastAPI(docs_url="/")
api.include_router(models.router, prefix="/api/v1")
api.include_router(cubes.router, prefix="/api/v1")
api.include_router(jobs.router, prefix="/api/v1")
api.include_router(experiments.router, prefix="/api/v1")

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    if os.environ.get("UVICORN_RELOAD") is not None:
        uvicorn.run(f"{__name__}:api", host="0.0.0.0", reload=True)
    else:
        uvicorn.run(api, host="0.0.0.0")
