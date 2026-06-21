import { Client } from 'pg'
import { getCliArgs } from './env'
import { FirebaseFunctionWithSupabase, Operation } from './'

let postgresClient: Client

export async function connectToPostgres(): Promise<Client> {
  const args = getCliArgs().args
  postgresClient = new Client(args.connectionUrl)
  await postgresClient.connect()
  return postgresClient
}

export async function disconnectFromPostgres(): Promise<void> {
  await postgresClient.end()
}

// TODO: use pg.Pool to protect against (very unlikely) SQL injection (or poor coding more likely)
async function runSqlQuery(query: string, params = []): Promise<void> {
  if (!postgresClient) throw new Error('Missing a client')
  console.debug(query, params)
  await postgresClient.query(query, params)
}

export interface SupabaseFunctionConfig {
  name: string
  table: string
  event: string
  sqlCondition?: string
}

type SupabaseFunctions = { [functionName: string]: SupabaseFunctionConfig }

interface FirebaseFunctionIndex {
  [functionName: string]: FirebaseFunctionWithSupabase
}

export function getFirebaseFunctionsAsSupabaseFunctions(): SupabaseFunctions {
  const functionsByName = require(getCliArgs().args
    .indexPath) as FirebaseFunctionIndex

  const supabaseFunctions: { [functionName: string]: SupabaseFunctionConfig } =
    {}

  for (const [functionName, functionBody] of Object.entries(functionsByName)) {
    // only accept functions created using our internal tool
    if (!functionBody._supabase) {
      continue
    }

    const { table, type, sqlCondition } = functionBody._supabase

    supabaseFunctions[functionName] = {
      name: functionName,
      table,
      event: type,
      sqlCondition,
    }
  }

  return supabaseFunctions
}

enum SqlOperation {
  Insert = 'INSERT',
  Update = 'UPDATE',
}

const getSqlEventForOperation = (operation: Operation): SqlOperation => {
  switch (operation) {
    case Operation.Create:
      return SqlOperation.Insert
    case Operation.Update:
      return SqlOperation.Update
    default:
      throw new Error(`Unknown operation ${operation}`)
  }
}

export async function createSupabaseFunctions(
  supabaseFunctions: SupabaseFunctions,
  timeoutMs: number
): Promise<void> {
  const { args } = getCliArgs()

  if (!args.customApiKey) throw new Error('Need a custom API key')

  for (const [
    functionName,
    { table: tableName, event: operationName, sqlCondition },
  ] of Object.entries(supabaseFunctions)) {
    const method = 'POST'
    const url = `${args.baseUrl}/${functionName}`
    const headers = {
      'content-type': 'application/json',
      'x-api-key': args.customApiKey,
    }

    console.debug(
      `Function "${functionName}": ${tableName}.${operationName} -> ${method} ${url}`
    )

    console.info(`Deploying ${functionName} (${tableName}.${operationName})...`)

    await runSqlQuery(
      `DROP TRIGGER IF EXISTS ${functionName} ON public.${tableName};`
    )

    await runSqlQuery(`CREATE TRIGGER ${functionName}
AFTER ${getSqlEventForOperation(
      operationName as Operation
    )} ON public.${tableName}
FOR EACH ROW
${sqlCondition ? `WHEN (${sqlCondition})` : ``}
EXECUTE PROCEDURE supabase_functions.http_request('${url}', '${method}', '${JSON.stringify(
      headers
    )}', '{}', '${timeoutMs}');`)
  }
}
