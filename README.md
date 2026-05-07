# Firebase Supabase Function Bridge

Do you use Firebase and Supabase together? This package aims to bridge them using Supabase's webhooks (similar to triggering a function from a Firestore change).

Instead of calling Firebase to create your functions, create this package's wrapper instead. It will ensure the payload is correct (including a custom API token to ensure it's really you):

```ts
import {
  createSupabaseFunction,
  Operation,
} from 'firebase-supabase-function-bridge'

interface PhotoRecord {
  id: string
}

export const myFunctionName = createSupabaseFunction<PhotoRecord>(
  'photos',
  Operation.Create,
  (req, res) => {
    const myPhoto = req.body.record

    // do stuff...
  }
)
```

## Testing

Tested in my local Docker environment and deployed to prod (May 2026) with separate `.env` files:

- Firebase functions [Node.js 20]
- Supabase local with Docker [Postgres 17.1]
- Supabase deployed [Postgres 15.1]

Unit tests have been written too :)

## Usage

1.  Install the package:

        npm i firebase-supabase-function-bridge

2.  Add these required env vars to your Firebase `.env` file (eg. `.env.dev` or `.env.prod`):

| Env var                     | Desc                                                                           | Example                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BRIDGE_FUNCTIONS_BASE_URL` | The base URL of your Firebase functions.                                       | Prod: `https://us-central1-$projectId.cloudfunctions.net`<br />Dev: `http://host.docker.internal:5000/$projectId/us-central1`                                                       |
| `SUPABASE_CUSTOM_API_KEY`   | An API key to prove the HTTP request is coming from your Supabase SQL trigger. | `my-custom-secret-key`                                                                                                                                                              |
| `POSTGRESQL_CONNECTION_URL` | The connection URL to your Supabase Postgres database.                         | Prod: `postgresql://postgres.$projectid:$password@aws-0-us-east-1.pooler.supabase.com:5432/postgres`<br />Dev: `postgresql://postgres:postgres@host.docker.internal:54322/postgres` |

Then create your function using `createSupabaseFunction`:

```ts
import {
  createSupabaseFunction,
  Operation,
} from 'firebase-supabase-function-bridge'

interface PhotoRecord {
  id: string
}

export const myFunctionName = createSupabaseFunction<PhotoRecord>(
  'photos',
  Operation.Create,
  (req, res) => {
    const myPhoto = req.body.record

    res.status(200).send({ message: 'Success!' })
  }
)
```

```ts
export default createSupabaseFunction<PhotoRecord>(
  'users',
  Operation.Update,
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

#### `--project=your_project_id_or_alias`

The Firebase project ID or alias, used to determine the `.env` file location. eg. `--project=dev` will look for `.env.dev`.

#### `--env=path/to/.env`

Override the path to the `.env` file instead of determining it from `--project`.

#### `--functions=myFuncName,anotherFuncName`

A comma delimited list of Firebase function names to deploy.

#### `--debug`

Show extra output such as SQL statements.

#### `--initApp`

Initialise Firebase Admin for you. This usually conflicts with your Firebase Functions code so not recommended.

## Development

    npm i

## Publishing

    npm run build
    cd dist
    npm publish
