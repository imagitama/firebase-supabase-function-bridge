import * as FirebaseHttps from 'firebase-functions/https'
import * as express from 'express'
import { getFunctionArgs } from './env'
import {
  FirebaseFunctionWithSupabase,
  FunctionTypes,
  Operation,
  Payload,
} from './common'

export type SupabaseWebhookRequest<TRecord> = Omit<
  FirebaseHttps.Request,
  'body'
> & {
  body: Payload<TRecord>
}

/**
 * Validates the request by returning true/false and sends a 400 response if invalid.
 * @param req The request.
 * @param res The response we can send.
 * @param tableName The name of the table.
 * @param functionType The operation on the table to subscribe to.
 * @returns If the request is valid or not. Sends a 400 response if invalid.
 */
export const validateRequest = <TRecord>(
  req: SupabaseWebhookRequest<TRecord>,
  res: express.Response,
  tableName: string,
  operation: Operation
): boolean => {
  try {
    const { args } = getFunctionArgs()

    if (req.method !== 'POST') {
      console.error(`Request method is ${req.method} not POST`)
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

    if (operation === Operation.Create) {
      if (req.body.type !== 'INSERT') {
        console.error('INSERT request does not match the configured type', {
          theirs: req.body.type,
          ours: operation,
        })
        throw new Error('Body is malformed (type)')
      }

      if (!req.body.record) {
        console.error('INSERT request body is missing the "record" property', {
          body: req.body,
        })
        throw new Error('Body is malformed (record)')
      }
    }

    if (operation === Operation.Update) {
      if (req.body.type !== 'UPDATE') {
        console.error('UPDATE request does not match the configured type', {
          theirs: req.body.type,
          ours: operation,
        })
        throw new Error('Body is malformed (type)')
      }

      if (!req.body.record) {
        console.error('UPDATE request body is missing the "record" property', {
          body: req.body,
        })
        throw new Error('Body is malformed (new record)')
      }

      if (!req.body.old_record) {
        console.error(
          'UPDATE request body is missing the "old_record" property',
          {
            body: req.body,
          }
        )
        throw new Error('Body is malformed (old record)')
      }
    }

    const providedApiKey = req.headers['x-api-key']

    if (!providedApiKey) {
      console.error('No provided API key')
      throw new Error('API key not provided')
    } else if (providedApiKey !== args.customApiKey) {
      console.error('Provided API key does not match custom API key', {
        theirs: providedApiKey,
        ours: args.customApiKey,
      })
      throw new Error('API key invalid')
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

/**
 * Creates a "Supabase" function which performs all of the wiring to bridge Supabase with Firebase.
 * Sends status 200 on success (if you don't send it yourself).
 * Sends status 500 on any error.
 * @param tableName The table to subscribe to.
 * @param functionType The operation to subscribe to (INSERT/UPDATE).
 * @param body The function body.
 * @returns A Firebase HTTP function.
 */
export const createSupabaseFunction = <TRecord>(
  tableName: string,
  operation: Operation | FunctionTypes,
  body: (
    request: SupabaseWebhookRequest<TRecord>,
    response: express.Response
  ) => void | Promise<void>,
  options: FirebaseHttps.HttpsOptions = {}
): FirebaseHttps.HttpsFunction => {
  const firebaseFunction: FirebaseHttps.HttpsFunction = FirebaseHttps.onRequest(
    options,
    async (req, res) => {
      if (
        validateRequest<TRecord>(req, res, tableName, operation as Operation)
      ) {
        try {
          await body(req as SupabaseWebhookRequest<TRecord>, res)
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
    }
  )

  // deploy code checks this
  ;(firebaseFunction as FirebaseFunctionWithSupabase)._supabase = {
    table: tableName,
    type: operation as Operation,
  }

  return firebaseFunction
}

export * from './common'
