# Firebase Supabase Function Bridge

This Node.js module lets Supabase securely call your Firebase Functions using HTTP triggers.

It also lets you automatically create Supabase HTTP triggers using your Firebase Functions.

## Usage

    npm i firebase-supabase-function-bridge

Then create your Firebase Function like you normally would except use our helper function. Under the covers this module creates a Firebase HTTP function for you that checks to see if Supabase really is calling it.

```js
const {
  createSupabaseFunction,
  FunctionTypes,
} = require('firebase-supabase-function-bridge')

module.exports.myFunctionName = createSupabaseFunction(
  'photos',
  FunctionTypes.CREATE,
  (req, res) => {
      const myPhoto = req.body.record

      res.status(200)
  }
)

module.exports.myFunctionName = createSupabaseFunction(
  'users',
  FunctionTypes.UPDATE,
  (req, res) => {
      const oldProfile = req.body.old_record
      const newProfile = req.body.record

      console.log(`You changed your username from "${oldProfile.username}" to "${newProfile.username}"`)

      res.status(200)
  }
)
```

Your function can either return any value or a `Promise` with a value and the module will return a 200 status code. Or you can send any status code using Express. If you do not do anything it will always send a 200.

Then add some additional Firebase Function config:

    firebase functions:config:set supabase.url="YOUR SUPABASE APP URL" supabase.service_role_secret="YOUR SERVICE ROLE SECRET" supabase.custom_api_key="YOUR CUSTOM API KEY"

Then deploy your Firebase Functions using the Firebase CLI as normal.

### Custom API key

To ensure only Supabase is calling your Firebase Functions we use a simple API key system. Set any string as your API key and this module will check if a `x-api-key` header includes your key.

## Deploy Supabase HTTP triggers

If you create your Firebase Functions using our helper function, our script can look at your functions and automatically create Supabase HTTP triggers for you (instead of doing it manually in the web console).

Note this will replace any existing triggers with the same names.

First set an environment variable so we can connect to your Postgres database:

    POSTGRESQL_CONNECTION_URL=postgres://postgres:YOUR_PASSWORD@YOUR_DB_URL:5432/postgres

Then run the module and provide some details to configure your triggers:

    firebase-supabase-function-bridge
        --baseUrl=https://us-central1-my-project.cloudfunctions.net
        --customApiKey=[YOUR CUSTOM API KEY]

### Options

#### `--debug`

Show extra output.

#### `--functions=myFuncName,anotherFuncName`

A comma delimited list of function names to deploy.