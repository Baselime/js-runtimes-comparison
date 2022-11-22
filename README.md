# lambda-js-runtimes-comparison

Comparing JavaScript runtimes on AWS Lambda.

## Intro

I'm deploying a sample application to AWS Lambda using multiple JS runtimes.

- node
- deno
- bun

The applications is a single endpoint `GET /`. It takes as query string parameter the English name of a pokemon and returns more details about the pokemon.

All Lambda functions have the same memory size: `512`.

I'll use [Baselime](https://baselime.io) to compare various metrics about the execution.


## Simulate traffic

To simulate traffic on the service:

```bash
node ping.js
```

## Deployment

I looked for the easiest way to deploy each runtime.

- Node: using the [serverless](https://serverless.com) framerowk
- Deno: using the [Arc](https://arc.codes) framework
- Bun: I used a pre-compiled version of bun, and the deployment is done with CloudFormation and custom run-times

## Dataset

Data for the pokedex from [here](https://github.com/fanzeyi/pokemon.json)
