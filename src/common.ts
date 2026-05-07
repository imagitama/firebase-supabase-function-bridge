import * as FirebaseHttps from 'firebase-functions/https'

/**
 * The different operations you can subscribe to.
 */
export enum Operation {
  Create = 'CREATE',
  Update = 'UPDATE',
}

/**
 * The different operations you can subscribe to.
 * @deprecated Use `Operation` instead.
 */
export enum FunctionTypes {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

export interface SupabaseFunctionInfo {
  table: string
  type: Operation
}

export type FirebaseFunctionWithSupabase = FirebaseHttps.HttpsFunction & {
  _supabase: SupabaseFunctionInfo
}

type TableRecord<T> = T

// copied from https://supabase.com/docs/guides/database/webhooks#payload
export type InsertPayload<T> = {
  type: 'INSERT'
  table: string
  schema: string
  record: TableRecord<T>
  old_record: null
}
export type UpdatePayload<T> = {
  type: 'UPDATE'
  table: string
  schema: string
  record: TableRecord<T>
  old_record: TableRecord<T>
}
export type DeletePayload<T> = {
  type: 'DELETE'
  table: string
  schema: string
  record: null
  old_record: TableRecord<T>
}
export type Payload<T> = InsertPayload<T> | UpdatePayload<T> | DeletePayload<T>
