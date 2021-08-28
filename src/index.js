const functions = require('firebase-functions')
const { createClient } = require('@supabase/supabase-js')

const config = functions.config()
const supabaseUrl = config.supabase.url
const supabaseServiceRoleSecret = config.supabase.service_role_secret
const customApiKey = config.supabase.custom_api_key

if (!supabaseUrl) {
  throw new Error('Cannot create Supabase client without URL!')
}
if (!supabaseServiceRoleSecret) {
  throw new Error('Cannot create Supabase client without key!')
}
if (!customApiKey) {
  throw new Error('Cannot continue without a custom API key!')
}

let client = createClient(supabaseUrl, supabaseServiceRoleSecret)
module.exports.client = client

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

const createSupabaseFunction = (tableName, functionType, body) => {
  if (!customApiKey) {
    throw new Error(`Cannot create supabase function without a custom API key!`)
  }

  const firebaseFunction = functions.https.onRequest(async (req, res) => {
    if (validateRequest(req, res, tableName, functionType)) {
      try {
        const result = await body(req, res)
        if (result) {
          res.status(200).send(result)
        } else if (!res.headersSent) {
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
  firebaseFunction._supabase = {
    table: tableName,
    type: functionType,
  }

  return firebaseFunction
}
module.exports.createSupabaseFunction = createSupabaseFunction

const FunctionTypes = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
}
module.exports.FunctionTypes = FunctionTypes
