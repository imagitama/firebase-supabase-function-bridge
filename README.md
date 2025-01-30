# Firebase Supabase Function Bridge

_Supports Firebase Functions V2 with environment variables as config._

This Node.js 18+ module lets Supabase securely call your Firebase Functions using HTTP triggers.

It also lets you automatically create Supabase HTTP triggers using your Firebase Functions.

## Usage

    npm i firebase-supabase-function-bridge

Then set some environment variables (Firebase Functions V2) in either `.env.dev`, `.env.prod` or `.env` (note: using your project ID or alias as the filename does **not** work):

| Env var | Desc | Example |
| --- | --- | --- |
| `SUPABASE_URL` | The URL to your Supabase project. | `https://abcdef.supabase.co` |
| `SUPABASE_SERVICE_ROLE_SECRET` | The service role secret. | `abcdef` |
| `SUPABASE_CUSTOM_API_KEY` | An API key to prove the HTTP request is coming from your Supabase SQL trigger. | `abcdef` |

Then create your function using `createSupabaseFunction`:

```ts
import {
  createSupabaseFunction,
  FunctionTypes,
} from 'firebase-supabase-function-bridge'

export const myFunctionName = createSupabaseFunction(
  'photos',
  FunctionTypes.CREATE,
  (req, res) => {
    const myPhoto = req.body.record

    res.status(200)
  }
)

export default createSupabaseFunction(
  'users',
  FunctionTypes.UPDATE,
  (req, res) => {
    const oldProfile = req.body.old_record
    const newProfile = req.body.record

    console.log(
      `You changed your username from "${oldProfile.username}" to "${newProfile.username}"`
    )

    res.status(200)
  }
)
```

**Note:** If your handler does not return a success response but it is successful, this module will automatically send 200.

Now deploy your Firebase Functions using the Firebase CLI as normal.

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

#### `--initApp`

Initialise Firebase Admin for you. This usually conflicts with your Firebase Functions code.
