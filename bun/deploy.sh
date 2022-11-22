#!/usr/bin/env bash

set -ex

zip -r deployment.zip *

aws s3 cp deployment.zip s3://bun-lambda-deployment-bucket/ --region eu-west-1

aws cloudformation create-stack \
--stack-name bun-api \
--template-body file:///$PWD/cf.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--region eu-west-1
