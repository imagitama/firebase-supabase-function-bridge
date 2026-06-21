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
  sqlCondition?: string
}

export type FirebaseFunctionWithSupabase = FirebaseHttps.HttpsFunction & {
  _supabase: SupabaseFunctionInfo
}

type TableRecord<T> = T

enum PayloadType {
  Insert = 'INSERT',
  Update = 'UPDATE',
  Delete = 'DELETE',
}

export interface BasePayload<T> {
  type: PayloadType
  table: string
  schema: string
}

// inspired by https://supabase.com/docs/guides/database/webhooks#payload
export interface InsertPayload<T> extends BasePayload<T> {
  type: PayloadType.Insert
  record: TableRecord<T>
  old_record: null
}

export interface UpdatePayload<T> extends BasePayload<T> {
  type: PayloadType.Update
  record: TableRecord<T>
  old_record: TableRecord<T>
}

export interface DeletePayload<T> extends BasePayload<T> {
  type: PayloadType.Delete
  record: null
  old_record: TableRecord<T>
}

export type Payload<T> = InsertPayload<T> | UpdatePayload<T> | DeletePayload<T>
