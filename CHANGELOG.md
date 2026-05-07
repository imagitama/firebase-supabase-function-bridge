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
