import dotenv from 'dotenv'
import fs from 'fs'
import { parseArgs } from 'util'
import path from 'path'

// NOTE: firebase does not provide us env vars until imports are complete
export const getFunctionArgs = () => {
  const { values: args } = parseArgs({
    args: process.argv.slice(2),
    options: {
      customApiKey: {
        type: 'string',
        short: 'k',
        default: process.env.SUPABASE_CUSTOM_API_KEY,
      },
      debug: {
        type: 'boolean',
        short: 'd',
        default: process.env.DEBUG === 'true',
      },
    },
    allowPositionals: true,
  })

  return { args }
}

const actuallyGetCliArgs = () =>
  parseArgs({
    args: process.argv.slice(2),
    options: {
      project: { type: 'string', short: 'p' },
      env: { type: 'string', short: 'e' },
      functions: { type: 'string', short: 'f' },
      baseUrl: {
        type: 'string',
        short: 'u',
        default: process.env.BRIDGE_FUNCTIONS_BASE_URL,
      },
      customApiKey: {
        type: 'string',
        short: 'k',
        default: process.env.SUPABASE_CUSTOM_API_KEY,
      },
      timeoutMs: {
        type: 'string',
        short: 't',
        default: '2000',
      },
      initApp: { type: 'boolean', default: false },
      indexPath: {
        type: 'string',
        default: path.resolve(process.cwd(), 'index.js'),
      },
      connectionUrl: {
        type: 'string',
        default: process.env.POSTGRESQL_CONNECTION_URL,
      },
      debug: {
        type: 'boolean',
        short: 'd',
        default: process.env.DEBUG === 'true',
      },
    },
    allowPositionals: true,
  })

export const getCliArgs = () => {
  let { values: args } = actuallyGetCliArgs()

  if (!args.debug) console.debug = () => {}

  args.indexPath = path.resolve(args.indexPath)

  console.debug(`index path: ${args.indexPath}`)

  const projectName = args.project || ''
  const dotEnvPath =
    args.env ||
    path.resolve(process.cwd(), `.env${projectName ? `.${projectName}` : ''}`)

  console.debug(`project: ${projectName}`)
  console.debug(`env file: ${dotEnvPath}`)

  if (!fs.existsSync(dotEnvPath))
    throw new Error(`.env file does not exist at "${dotEnvPath}"`)

  dotenv.config({
    path: dotEnvPath,
  })

  // defaults depend on env vars
  args = actuallyGetCliArgs().values

  if (!args.baseUrl) {
    throw new Error('Need functions base URL')
  }

  console.debug(`base URL: ${args.baseUrl}`)

  if (!args.customApiKey) {
    throw new Error('Need custom API key')
  }

  console.debug(
    `API key (starts with): ${args.customApiKey.substring(0, 3)} ...`
  )

  const functionNames: string[] | null = args.functions?.split(',') || null

  return {
    args,
    functionNames,
  }
}
