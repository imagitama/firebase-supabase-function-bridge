import admin from 'firebase-admin'
import { getCliArgs } from './env'
import {
  connectToPostgres,
  createSupabaseFunctions,
  disconnectFromPostgres,
  getFirebaseFunctionsAsSupabaseFunctions,
} from './sql'

async function main() {
  try {
    console.info('Starting up...')

    const { args, functionNames } = getCliArgs()

    if (args.initApp) {
      console.debug(`initializing firebase admin app...`)
      admin.initializeApp()
    }

    const allSupabaseFunctions = getFirebaseFunctionsAsSupabaseFunctions()

    if (!Object.keys(allSupabaseFunctions).length) {
      throw new Error(
        'Found no firebase functions - are you sure the path is to the firebase functions index.js?'
      )
    }

    console.info(
      `Found ${Object.keys(allSupabaseFunctions).length} firebase functions`
    )

    let supabaseFunctionsToOperateOn = allSupabaseFunctions

    if (functionNames !== null && functionNames.length) {
      console.debug(`Only operating on functions: ${functionNames.join(', ')}`)

      const newFuncs = {}

      for (const functionName of functionNames) {
        if (!(functionName in allSupabaseFunctions)) {
          throw new Error(
            `Cannot operate on function "${functionName}": does not exist!`
          )
        }
        newFuncs[functionName] = allSupabaseFunctions[functionName]
      }

      supabaseFunctionsToOperateOn = newFuncs
    }

    console.info('Connecting to PostgreSQL...')

    await connectToPostgres()

    console.info('Connected!')

    console.info(
      `Functions will be called via URL ${args.baseUrl}/myFunctionName`
    )

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
