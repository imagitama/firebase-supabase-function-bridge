'use strict'

const dotenv = require('dotenv')
const { Client } = require('pg')
const path = require('path')
const admin = require('firebase-admin')
const args = require('process').argv
const { FunctionTypes } = require('./')

dotenv.config()

if (args.includes('--initApp')) {
  admin.initializeApp()
}

const isDebug = args.includes('--debug')

const getCliArgument = (nameWithDashes, defaultVal) => {
  const arg = args.find((arg) => arg.includes(nameWithDashes))

  if (arg) {
    const val = arg.split('=')[1]

    if (isDebug) {
      console.debug(`${nameWithDashes} = "${val}"`)
    }

    return val
  }

  if (defaultVal !== undefined) {
    if (isDebug) {
      console.debug(`${nameWithDashes} = "${defaultVal}" (default)`)
    }

    return defaultVal
  }

  if (isDebug) {
    console.debug(`${nameWithDashes} empty`)
  }

  return ''
}

const supabaseFunctionNamesToOnlyWorkWith = getCliArgument('--functions', '')
  .split(',')
  .filter((arg) => arg)
const baseUrl = getCliArgument('--baseUrl')
const customApiKey = getCliArgument('--customApiKey')

if (!baseUrl) {
  throw new Error('Base URL is not set!')
}
if (!customApiKey) {
  throw new Error('Custom API key is not set!')
}

const pathToFirebaseFunctionsFile = path.resolve(process.cwd(), 'index.js')

let postgresClient

async function connectToPostgres() {
  postgresClient = new Client(process.env.POSTGRESQL_CONNECTION_URL)
  await postgresClient.connect()
  return postgresClient
}

async function disconnectFromPostgres() {
  await postgresClient.end()
}

async function runSqlQuery(query, params = []) {
  // if (isDryRun) {
  //   if (isDebug) console.debug(`Skipping query (dry run)`, query, params);
  //   return;
  // }

  if (isDebug) console.debug(query, params)

  return postgresClient.query(query, params)
}

function getFirebaseFunctionsAsSupabaseFunctions() {
  const functionsByName = require(pathToFirebaseFunctionsFile)

  const supabaseFunctions = {}

  for (const [functionName, functionBody] of Object.entries(functionsByName)) {
    // only accept functions created using our internal tool
    if (!functionBody._supabase) {
      continue
    }

    const { table, type } = functionBody._supabase

    supabaseFunctions[functionName] = {
      name: functionName,
      table,
      event: type,
    }
  }

  return supabaseFunctions
}

const getSqlEventForEventName = (eventName) => {
  switch (eventName) {
    case FunctionTypes.CREATE:
      return 'INSERT'
    case FunctionTypes.UPDATE:
      return 'UPDATE'
    default:
      throw new Error(
        `Cannot get SQL event for event name "${eventName}": unknown!`
      )
  }
}

async function createSupabaseFunctions(supabaseFunctions) {
  const output = {
    functions: {},
  }

  for (const [functionName, functionConfig] of Object.entries(
    supabaseFunctions
  )) {
    const method = 'POST'
    const url = `${baseUrl}/${functionName}`
    const tableName = functionConfig.table
    const eventName = functionConfig.event
    const headers = {
      'content-type': 'application/json',
      'x-api-key': customApiKey,
    }

    output.functions[functionName] = {
      name: functionName,
      table: tableName,
      event: eventName,
      type: 'http',
      request: {
        method,
        url,
      },
      headers,
    }

    console.debug(
      `Function "${functionName}": ${tableName}.${eventName} -> ${method} ${url}`
    )

    await runSqlQuery(
      `DROP TRIGGER IF EXISTS ${functionName} ON public.${tableName}`
    )

    await runSqlQuery(`CREATE TRIGGER ${functionName}
AFTER ${getSqlEventForEventName(eventName)} ON public.${tableName}
FOR EACH ROW
EXECUTE PROCEDURE supabase_functions.http_request('${url}', '${method}', '${JSON.stringify(
      headers
    )}', '{}', '1000');`)
  }
}

async function main() {
  try {
    console.info('Starting up!')
    console.info(`Using firebase functions file ${pathToFirebaseFunctionsFile}`)

    const allSupabaseFunctions = getFirebaseFunctionsAsSupabaseFunctions()

    if (!Object.keys(allSupabaseFunctions).length) {
      throw new Error(
        'Found no firebase functions - are you sure the path is to the firebase functions index.js?'
      )
    }

    console.debug(
      `Found ${Object.keys(allSupabaseFunctions).length} firebase functions`
    )

    let supabaseFunctionsToOperateOn = allSupabaseFunctions

    if (supabaseFunctionNamesToOnlyWorkWith.length) {
      console.debug(
        `Only operating on functions: ${supabaseFunctionNamesToOnlyWorkWith.join(
          ', '
        )}`
      )

      const newFuncs = {}

      for (const functionName of supabaseFunctionNamesToOnlyWorkWith) {
        if (!(functionName in allSupabaseFunctions)) {
          throw new Error(
            `Cannot operate on function "${functionName}": does not exist!`
          )
        }
        newFuncs[functionName] = allSupabaseFunctions[functionName]
      }

      supabaseFunctionsToOperateOn = newFuncs
    }

    console.debug('Connecting to PostgreSQL...')

    await connectToPostgres()

    console.debug('Connected!')

    console.info(`Functions will be called via URL ${baseUrl}/myFunctionName`)

    await createSupabaseFunctions(supabaseFunctionsToOperateOn)

    console.info('Job done!')

    await disconnectFromPostgres()

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
