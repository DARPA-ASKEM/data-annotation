#!/usr/bin/env sh

DT=$(date +"%Y%m%d")
GIT=${DT}.git.$(git rev-parse --short HEAD)
VERSION="0.5.13"
TAG="${VERSION}"

GROUP=jataware
NAME=data-annotation-ui
IMAGE="${GROUP}/${NAME}"

docker build -f deploy/Dockerfile \
       -t "${IMAGE}:dev" \
       -t "${IMAGE}:${TAG}" \
       -t "${IMAGE}:${TAG}-dev" \
       -t "${IMAGE}:${GIT}" \
       .
