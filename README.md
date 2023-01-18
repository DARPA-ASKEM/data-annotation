# TERArium Data Annotation

## Setup

1. Run [TERArium Data Service (TDS)](https://github.com/DARPA-ASKEM/data-service)
2. In this repo, run run `$ make init` to generate envfile
3. Add your secrets to the file `envfile`  
  - NOTE: You should rarely, if ever, need to change any of the host names or ports. You should really only need to set the variables that are wrapped in `${...}`
4. Run `$ make up` to build and bring online all services
5. Setup is complete

## Running

- To start all services: `$ make up`
- To stop all services: `$ make down`
- To force rebuild all images: `$ make rebuild all`
- To view logs: `$ make logs` or `$ docker-compose logs {service-name}`

## Service URLs

* Data Annotation UI: http://localhost:8081/
* API: http://localhost:8000/
* Redis: http://localhost:6379/

## Information storage

All info from the registered datasets will be stored in the TERArium Data Service (TDS). 

## Deploying

To run the stack in production you should generate static files for the UI with: 

```bash
cd ui
NODE_OPTIONS=--openssl-legacy-provider make compile
```
The compiled files required for hosting will be located in the `ui/dist` folder.