import { Request, onRequest } from 'firebase-functions/https'
import { createClient } from '@supabase/supabase-js'
import * as express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// you would think Firebase would handle all of this but it doesn't

const devEnvPath = path.resolve(process.cwd(), `.env.dev`)
const prodEnvPath = path.resolve(process.cwd(), `.env.prod`)

dotenv.config({
  path:
    process.env.NODE_ENV === 'development' && fs.existsSync(devEnvPath)
      ? devEnvPath
      : fs.existsSync(prodEnvPath)
      ? prodEnvPath
      : undefined,
})

// TODO: Support google's secret manager
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleSecret = process.env.SUPABASE_SERVICE_ROLE_SECRET
const customApiKey = process.env.SUPABASE_CUSTOM_API_KEY

if (!supabaseUrl) {
  throw new Error('Cannot create Supabase client without URL!')
}
if (!supabaseServiceRoleSecret) {
  throw new Error('Cannot create Supabase client without key!')
}
if (!customApiKey) {
  throw new Error('Cannot continue without a custom API key!')
}

export let client = createClient(supabaseUrl, supabaseServiceRoleSecret)

const validateRequest = (req, res, tableName, functionType) => {
  try {
    if (req.method !== 'POST') {
      console.error('Request method is not POST')
      throw new Error('Method not allowed')
    }

    if (!req.body) {
      console.error('Request is missing a body')
      throw new Error('Body is malformed (missing)')
    }

    if (req.body.table !== tableName) {
      console.error('Request does not match the configured table', {
        theirs: req.body.table,
        ours: tableName,
      })
      throw new Error('Body is malformed (table)')
    }

    if (functionType === FunctionTypes.CREATE) {
      if (req.body.type !== 'INSERT') {
        console.error('Request does not match the configured type', {
          theirs: req.body.type,
          ours: functionType,
        })
        throw new Error('Body is malformed (type)')
      }

      if (!req.body.record) {
        console.error('Request body is missing the "record" property', {
          body: req.body,
        })
        throw new Error('Body is malformed (record)')
      }
    }

    if (functionType === FunctionTypes.UPDATE) {
      if (!req.body.record) {
        console.error('Request body is missing the "record" property', {
          body: req.body,
        })
        throw new Error('Body is malformed (new record)')
      }
      if (!req.body.old_record) {
        console.error('Request body is missing the "old_record" property', {
          body: req.body,
        })
        throw new Error('Body is malformed (old record)')
      }
    }

    const providedApiKey = req.headers['x-api-key']

    if (!providedApiKey || !customApiKey || providedApiKey !== customApiKey) {
      if (!providedApiKey) {
        console.error('No provided API key')
      } else if (!customApiKey) {
        console.error('No custom API key set')
      } else if (providedApiKey !== customApiKey) {
        console.error('Provided API key does not match custom API key', {
          theirs: providedApiKey,
          ours: customApiKey,
        })
      }
      throw new Error('API key is not valid or not provided')
    }

    return true
  } catch (err) {
    console.error(err)
    res.status(400).send({
      message: err.message,
    })
    return false
  }
}

export const createSupabaseFunction = (
  tableName: string,
  functionType: FunctionTypes,
  body: (
    request: Request,
    response: express.Response<any, Record<string, any>>
  ) => void | Promise<void>
) => {
  if (!customApiKey) {
    throw new Error(`Cannot create supabase function without a custom API key!`)
  }

  const firebaseFunction = onRequest(async (req, res) => {
    if (validateRequest(req, res, tableName, functionType)) {
      try {
        await body(req, res)
        if (!res.headersSent) {
          res.status(200).send({
            message: 'Done',
          })
        }
      } catch (err) {
        console.error(err)
        res.status(500).send({
          message: 'Internal server error',
        })
      }
    }
  })

  // append these special properties for other tools to sniff and do their stuff
  // @ts-ignore
  firebaseFunction._supabase = {
    table: tableName,
    type: functionType,
  }

  return firebaseFunction
}

export enum FunctionTypes {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}
