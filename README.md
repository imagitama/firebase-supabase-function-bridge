# Firebase Supabase Function Bridge

_Supports Firebase Functions V2 with environment variables as config._

This Node.js module bridges the gap between your Supabase Postgres database and your Firebase functions (like how Firestore can trigger functions).

It exposes a Node.js API for creating your functions which just ensures the trigger provided the correct API key, function name and verb.

## Usage

1. Install the package:

   npm i firebase-supabase-function-bridge

2. Add env vars to your `.env` file (eg. `.env.dev` or `.env.prod`):

| Env var                     | Desc                                                                           | Example                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `BRIDGE_FUNCTIONS_BASE_URL` | The base URL of your Firebase functions.                                       | `https://us-central1-myproject.cloudfunctions.net`                                             |
| `SUPABASE_CUSTOM_API_KEY`   | An API key to prove the HTTP request is coming from your Supabase SQL trigger. | `abcdef`                                                                                       |
| `POSTGRESQL_CONNECTION_URL` | The connection URL to your Supabase Postgres database.                         | `postgresql://postgres.$projectid:$password@aws-0-us-east-1.pooler.supabase.com:5432/postgres` |

Then create your function using `createSupabaseFunction`:

```ts
import {
  createSupabaseFunction,
  FunctionTypes,
} from 'firebase-supabase-function-bridge'

interface PhotoRecord {
  id: string
}

export const myFunctionName = createSupabaseFunction<PhotoRecord>(
  'photos',
  FunctionTypes.CREATE,
  (req, res) => {
    const myPhoto = req.body.record

    res.status(200).send({ message: 'Success!' })
  }
)
```

```ts
export default createSupabaseFunction<PhotoRecord>(
  'users',
  FunctionTypes.UPDATE,
  (req, res) => {
    const oldProfile = req.body.old_record
    const newProfile = req.body.record

    console.log(
      `You changed your username from "${oldProfile.username}" to "${newProfile.username}"`
    )

    res.status(200).send({ message: 'Success!' })
  }
)
```

**Note:** Firebase automatically sends status 200 if you do not specify a status.

### Options

#### `--debug`

Show extra output.

#### `--functions=myFuncName,anotherFuncName`

A comma delimited list of function names to deploy.

#### `--initApp`

Initialise Firebase Admin for you. This usually conflicts with your Firebase Functions code.

## Development

    npm i

## Publishing

    npm run build
    cd dist
    npm publish
