#!/bin/bash

DEVICEID=$1

curl -X PUT \
 "http://localhost:8080/api/device/$DEVICEID/update" \
  -H "Accept: application/json" \
  -d "frequency=10" -s | python -m json.tool
