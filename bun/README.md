# bun

Demo application deployed by providing the runtime myself.

Heavily inspired by [this repo](https://github.com/Jarred-Sumner/bun-aws-lambda).

[./lambda.ts](./lambda.ts) has the code necessary to respond to incoming requests through the Lambda API

[./function.js](./function.js) runs the runtime code.

There's a modified version of the bun binary in [./bun](./bun). It was downloaded from the repo above. It statically links glibc which makes this unfit for production workloads.

# Deploy

To deploy, the binary and the runtime code must be zipped and uploaded to S3. And there's a CloudFormation template in [./cf.yaml](./cf.yaml) to create the Lambda function, its log group, and API Gateway and all the permissions.

You can use:

```sh
./deploy.sh
```