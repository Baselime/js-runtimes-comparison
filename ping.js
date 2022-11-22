const axios = require("axios");
const util = require("util");
const AWS = require("aws-sdk");

const wait = util.promisify(setTimeout);

const runtimes = {
  node: { endpoint: "https://15qyeltpxj.execute-api.eu-west-1.amazonaws.com/prod", arn: "arn:aws:lambda:eu-west-1:893175024177:function:node-prod-pokedex" },
  deno: { endpoint: "https://a07r6wt3fj.execute-api.eu-west-1.amazonaws.com", arn: "arn:aws:lambda:eu-west-1:893175024177:function:DenoProduction-GetIndexHTTPLambda-I7EpW58lZ0DR" },
  bun:  { endpoint: "https://0yf8qwrahb.execute-api.eu-west-1.amazonaws.com/prod", arn: "arn:aws:lambda:eu-west-1:893175024177:function:bun" },
}

async function ping() {
  const pokemons = ["Bulbasaur", "Spearow", "Nidorino", "Zubat", "Dugtrio", "Gateway", "Josman", "Luffy", "Goku", "Raticate", "Fearow", "Charizard", "Pikachu", "Charmander"];
  const runtimeNames = Object.keys(runtimes);
  let count = 0;
  while (true) {
    const promises = runtimeNames.map(async runtime => {
      // Send goku more often
      const index = count === 3 ? pokemons.findIndex(p => p === "Goku") : Math.floor(Math.random() * pokemons.length);
      const pokemon = pokemons[index];
      await makeRequest(runtime, pokemon);
      if(count > 10) {
        await updateLambda(runtimes[runtime].arn);
        count = 0;
      }
    });
    count += 1;
    await Promise.all(promises);
    await wait(100 * Math.floor(Math.random() * 2) );
  }
}

async function makeRequest(runtime, pokemon) {
  const url = `${runtimes[runtime].endpoint}?name=${pokemon}`;
  try {
    const response = (await axios(url)).data;
    console.log(`Calling ${runtime} with ${pokemon}`, response.pokemon.id);
  } catch (error) {
    console.error("Error", runtime);
    // swallow the error
  }
}

async function updateLambda(arn) {
  console.log("Updating a lambda function", arn);
  const configArgs = {
    FunctionName: arn,
    Environment: {
      Variables: {
        TIMESTAMP: (new Date()).getMilliseconds().toString(),
      }
    },
  }

  try {
    const lambda = new AWS.Lambda({ region: "eu-west-1" });
    await lambda.updateFunctionConfiguration(configArgs).promise();
  } catch (error) {
    console.error("There was an error udating a lambda function", { error, configArgs });
    // Swallow the error
  }
}

ping();
