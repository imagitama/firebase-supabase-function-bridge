import { Operation } from '../common'
import { getCliArgs } from '../env'
import { connectToPostgres, createSupabaseFunctions } from '../sql'

jest.mock('../env', () => ({
  getCliArgs: (() => ({
    args: {
      baseUrl: 'http://firebase',
      customApiKey: 'CORRECT_API_KEY',
    },
    functionNames: null,
  })) as typeof getCliArgs,
}))

const mockRunQuery = jest.fn(() => Promise.resolve())

jest.mock('pg', () => ({
  Client: function () {
    return {
      connect: () => Promise.resolve(),
      end: () => Promise.resolve(),
      query: mockRunQuery,
    }
  },
}))

describe('SQL tests', () => {
  describe('createSupabaseFunctions', () => {
    const functionName = 'myCoolFunc'
    const tableName = 'myTable'
    const url = `http://firebase/${functionName}`
    const method = 'POST'
    const headers = {
      'content-type': 'application/json',
      'x-api-key': 'CORRECT_API_KEY',
    }

    beforeAll(async () => {
      const mockFunctions = {
        [functionName]: {
          name: functionName,
          table: tableName,
          event: Operation.Create,
        },
      }

      await connectToPostgres()

      await createSupabaseFunctions(mockFunctions)
    })

    it('drops the existing SQL trigger', () => {
      expect(mockRunQuery).toHaveBeenCalledWith(
        `DROP TRIGGER IF EXISTS ${functionName} ON public.${tableName}`,
        []
      )
    })

    it('creates the new trigger', () => {
      expect(mockRunQuery).toHaveBeenCalledWith(
        `CREATE TRIGGER ${functionName}
AFTER INSERT ON public.${tableName}
FOR EACH ROW
EXECUTE PROCEDURE supabase_functions.http_request('${url}', '${method}', '${JSON.stringify(
          headers
        )}', '{}', '1000');`,
        []
      )
    })
  })
})
