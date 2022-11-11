import logging
from logging import Logger

from typing import List, Optional

import aioredis
from fastapi import APIRouter, Depends, Response, HTTPException, status
from pydantic import BaseModel

from src.redisapi import redis_pool


logger: Logger = logging.getLogger(__name__)
router = APIRouter()

BASE_IMAGES_KEY = "dojo-ui:base_images"


@router.get("/ping")
async def ping_redis(redis: aioredis.Redis = Depends(redis_pool)) -> str:
    logger.debug("ping")
    return Response(content=str(await redis.ping()), media_type="plain/text")
