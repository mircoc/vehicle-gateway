#!/bin/bash

DEVICEID=$1

curl -X POST \
 "http://localhost:8080/api/device/$DEVICEID/run" \
  -H "Accept: application/json" \
  -s | python -m json.tool
