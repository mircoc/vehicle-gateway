#!/bin/bash

DEVICEID=$1

curl -X GET \
 "http://localhost:8080/api/device/$DEVICEID" \
  -H "Accept: application/json" -s | python -m json.tool