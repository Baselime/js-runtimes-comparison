const {
  AWS_LAMBDA_RUNTIME_API,
  LAMBDA_TASK_ROOT = process.cwd(),
  _HANDLER,
} = process.env;

const VERBOSE = false;

if (!AWS_LAMBDA_RUNTIME_API || AWS_LAMBDA_RUNTIME_API === "") {
  throw new Error("AWS_LAMBDA_RUNTIME_API is not set");
}

const nextURL = `http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next`;
const sourceDir = LAMBDA_TASK_ROOT;
if (!sourceDir) {
  throw new Error("handler is not set");
}

// don't care if this fails
if (process.cwd() !== sourceDir) {
  try {
    process.chdir(sourceDir);
  } catch (e) {}
}

var sourcefile = _HANDLER.split(".")[0];
if (sourcefile.length === 0) {
  throw new Error("handler is not set");
}
if (!sourcefile.startsWith("/")) {
  sourcefile = `./${sourcefile}`;
}
function noop() {}

if (VERBOSE) {
  console.time(`Loaded ${sourcefile}`);
}
var Handler;

try {
  Handler = await import(sourcefile);
} catch (e) {
  console.error("Error loading sourcefile:", e);
  try {
    await fetch(
      new URL(`http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/init/error`)
        .href,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errorMessage: e.message,
          errorType: e.name,
          stackTrace: e?.stack?.split("\n") ?? [],
        }),
      }
    );
  } catch (e2) {
    console.error("Error sending error to runtime:", e2);
  }
  process.exit(1);
}

if (VERBOSE) {
  console.timeEnd(`Loaded ${sourcefile}`);
}

var method = _HANDLER.split(".")[1];
const handlerFunction = Handler.default[method];
if (typeof handlerFunction !== "function") {
  const e = new Error(`${sourcefile} must export default a function
Here is an example:
export default {
    handler(req) {
        return new Response("Hello World");
    }
}
`);

  console.error(e);

  try {
    await fetch(
      new URL(`http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/init/error`)
        .href,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errorMessage: e.message,
          errorType: e.name,
          stackTrace: e?.stack?.split("\n") ?? [],
        }),
      }
    );
  } catch (e2) {
    console.error("Error sending error to runtime:", e2);
  }

  process.exit(1);
}

var baseURLString = `http://${AWS_LAMBDA_RUNTIME_API}`;
if ("baseURI" in Handler.default) {
  baseURLString = Handler.default.baseURI?.toString();
}

var baseURL;
try {
  baseURL = new URL(baseURLString);
} catch (e) {
  console.error("Error parsing baseURI:", e);
  try {
    await fetch(
      new URL(`http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/init/error`)
        .href,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errorMessage: e.message,
          errorType: e.name,
          stackTrace: e?.stack?.split("\n") || [],
        }),
      }
    );
  } catch (e2) {
    console.error("Error sending error to runtime:", e2);
  }

  process.exit(1);
}

async function runHandler(response: Response) {
  if (VERBOSE) {
    console.log("Begin handler for response", response);
  }
  const traceID = response.headers.get("Lambda-Runtime-Trace-Id");
  const requestID = response.headers.get("Lambda-Runtime-Aws-Request-Id");
  const arn = response.headers.get("lambda-runtime-invoked-function-arn");
  var context = {
    awsRequestId: requestID,
    invokedFunctionArn: arn,
    logGroupName: process.env.AWS_LAMBDA_LOG_GROUP_NAME,
    logStreamName: process.env.AWS_LAMBDA_LOG_STREAM_NAME,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    memoryLimitInMB: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
  }
  var event = await response.json();
  var result: Response;
  try {
    result = await handlerFunction(event, context);
  } catch (e1) {
    if (VERBOSE) {
      console.error(`[${traceID}] Error running handler:`, e1);
    }
    fetch(
      `http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/${requestID}/error`,
      {
        method: "POST",

        body: JSON.stringify({
          errorMessage: e1.message,
          errorType: e1.name,
          stackTrace: e1?.stack?.split("\n") ?? [],
        }),
      }
    ).finally(noop);
    return;
  }

  if (VERBOSE) {
    console.time(`[${traceID}] Send response`);
  }

  const url = `http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/${requestID}/response`;

  if (VERBOSE) {
    console.log(`[${traceID}] Sending to ${url}`, result);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(result),
    });
    if (VERBOSE) {
      console.log(`[${traceID}] Response from ${url}`, response);
    }
  } catch (e) {
    console.error(`[${traceID}] Error sending response:`, e);
  } finally {
    if (VERBOSE) {
      console.timeEnd(`[${traceID}] Send response`);
    }
    await response.blob();
  }

  result = undefined;
  response = undefined;
}

if (VERBOSE) {
  console.log("Begin fetch loop");
}

function errorHandler(err) {
  console.error("Error fetching next request:", err);
  process.exit(1);
}

while (true) { 
  try {
    const response = await fetch(nextURL, {
      timeout: false,
      keepalive: false,
    });
    await runHandler(response);
  } catch(error) {
    errorHandler(error)
  }
}

if (VERBOSE) {
  console.log("End fetch loop");
}

export {};
