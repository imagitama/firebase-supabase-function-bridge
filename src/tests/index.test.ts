import { Operation, validateRequest } from '..'
import * as FirebaseHttps from 'firebase-functions/https'
import * as express from 'express'
import { getFunctionArgs } from '../env'

jest.mock('../env', () => ({
  getFunctionArgs: (() => ({
    args: {
      customApiKey: 'CORRECT_API_KEY',
    },
  })) as typeof getFunctionArgs,
}))

const mockRequest = { method: 'POST' }
const mockResponse = {
  status: () => ({
    send: () => {},
  }),
}
const mockTableName = 'users'
const mockOperation = Operation.Create

const nonRequestArgs = [
  mockResponse as unknown as express.Response,
  mockTableName,
  mockOperation,
] as const

describe('Index tests', () => {
  describe('validateRequest', () => {
    it('returns false on bad method', () => {
      expect(
        validateRequest(
          { ...mockRequest, method: 'GET' } as FirebaseHttps.Request,
          mockResponse as unknown as express.Response,
          mockTableName,
          Operation.Create
        )
      ).toBe(false)
    })

    it('returns false on missing body', () => {
      expect(
        validateRequest(
          { ...mockRequest, body: undefined } as FirebaseHttps.Request,
          mockResponse as unknown as express.Response,
          mockTableName,
          Operation.Create
        )
      ).toBe(false)
    })

    it('returns false on table name mismatch', () => {
      expect(
        validateRequest(
          {
            ...mockRequest,
            body: { table: 'INCORRECT_TABLE' },
          } as FirebaseHttps.Request,
          mockResponse as unknown as express.Response,
          mockTableName,
          Operation.Create
        )
      ).toBe(false)
    })

    describe('When create', () => {
      it('returns false on incorrect type', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              body: { table: mockTableName, type: 'DELETE' },
            } as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Create
          )
        ).toBe(false)
      })

      it('returns false on missing record', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              body: { table: mockTableName, type: 'INSERT', record: undefined },
            } as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Create
          )
        ).toBe(false)
      })
    })

    describe('When update', () => {
      it('returns false on incorrect type', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              body: { table: mockTableName, type: 'DELETE' },
            } as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Update
          )
        ).toBe(false)
      })

      it('returns false on missing record', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              body: { table: mockTableName, type: 'UPDATE', record: undefined },
            } as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Update
          )
        ).toBe(false)
      })

      it('returns false on missing old record', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              body: {
                table: mockTableName,
                type: 'UPDATE',
                record: {},
                old_record: undefined,
              },
            } as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Update
          )
        ).toBe(false)
      })
    })

    describe('When has valid payload but no API key', () => {
      it('returns true', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              headers: {
                'x-api-key': undefined,
              },
              body: {
                table: mockTableName,
                type: 'UPDATE',
                record: {},
                old_record: {},
              },
            } as unknown as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Update
          )
        ).toBe(false)
      })
    })

    describe('When has valid payload but invalid API key', () => {
      it('returns true', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              headers: {
                'x-api-key': 'some invalid key lol',
              },
              body: {
                table: mockTableName,
                type: 'UPDATE',
                record: {},
                old_record: {},
              },
            } as unknown as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Update
          )
        ).toBe(false)
      })
    })

    describe('When has valid payload and API key', () => {
      it('returns true', () => {
        expect(
          validateRequest(
            {
              ...mockRequest,
              headers: {
                'x-api-key': 'CORRECT_API_KEY',
              },
              body: {
                table: mockTableName,
                type: 'UPDATE',
                record: {},
                old_record: {},
              },
            } as unknown as FirebaseHttps.Request,
            mockResponse as unknown as express.Response,
            mockTableName,
            Operation.Update
          )
        ).toBe(true)
      })
    })
  })
})
