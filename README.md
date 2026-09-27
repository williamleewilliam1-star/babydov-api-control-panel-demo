# BABYDOV Local REST API Control Panel Demo

A compact Electron sample showing how I approach desktop control panels that operate an existing local REST API safely and predictably.

## What it demonstrates

- API-key authentication
- Profile create/list/delete operations
- Start/stop session controls
- Proxy configuration and connectivity checks
- Request IDs and idempotency keys
- Explicit timeouts and error handling
- Verification after state-changing operations
- API-key redaction in the UI log
- A reproducible local mock API and automated test

The sample intentionally keeps the underlying service mocked. The desktop application is only the control layer, matching the architecture where the real service owns the business operations.

## Run the verified API test

Requires Node.js 18+.

    npm test

Expected result:

    PASS: create → start → proxy-test → stop → list
## Run the desktop UI

Install dependencies and start the mock API:

    npm install
    npm run mock

In another terminal:

    npm start

Use these defaults in the application:

- Base URL: `http://127.0.0.1:18777`
- API key: `demo-key`

## Reliability choices

The control panel does not assume that a button click means success. Every mutation waits for an API response and reports the verified state returned by the backend. Requests time out rather than hanging indefinitely, errors remain visible, and secrets are never printed into the result log.

For a production integration I would replace the mock routes with the supplied API contract, move credentials to OS-backed secure storage, add schema validation, and add end-to-end acceptance tests for each workflow.

## Scope

This repository is a technical demonstration created for API-integration portfolio purposes. It does not contain client code, private credentials, or copied proprietary assets.
