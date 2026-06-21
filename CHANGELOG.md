# 2.3.0

- added SQL conditions to check before sending HTTP request:

```js
export default createSupabaseFunction(
  'users', 
  Operation.Update, 
  (req, res) => {}, 
  undefined, 
  `NEW.banstatus <> OLD.banstatus AND NEW.banstatus = 'banned'`
)
```

# 2.2.0

- increased default timeout from 1000ms => 2000ms
- added `timeoutMs` arg
- fix `record` and `old_record` possibly being `null`

# 2.1.1

- README

# 2.1.0

- added generic type `createSupabaseFunction<TRecord>(...)` which enforces `req.body.record` and `req.body.old_record`
- deprecated enum `FunctionTypes` in favor of better named `Operation`
- removed Supabase SDK dependency
- renamed `FIREBASE_FUNCTIONS_BASE_URL` to `BRIDGE_FUNCTIONS_BASE_URL` to fix Firebase error about reserved prefixes
- added `--project` (or `-p`) arg to load .env file at `.env.$project`
- added `--env` (or `-e`) arg to override .env file path
- added `--indexPath` to override Firebase index.js path
- added `--connectionUrl` to override Postgres connection URL (default: POSTGRESQL_CONNECTION_URL)
- added unit tests
- export more types and functions

# 2.0.1

- added missing docs

# 2.0.0

- TypeScript
- update for Firebase Functions V2 and Node.js 18+:
  - now checks env vars instead of deprecated `functions.config()`
- functions can no longer return `true` to automatically send 200
  - note: this module will still automatically send 200 if no other headers have been sent

# 1.0.0

- initial release
