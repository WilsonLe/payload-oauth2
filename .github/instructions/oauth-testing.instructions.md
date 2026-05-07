---
description: "OAuth plugin test layering and provider coverage conventions."
applyTo: "test/**,src/**"
---

# OAuth Testing

- Keep `pnpm test` deterministic: no live provider calls; live provider tests must skip unless `RUN_LIVE_OAUTH_TESTS=true` and provider-specific env vars exist.
- Exercise callback behavior through `createCallbackEndpoint(...).handler(req)`; avoid replacing callback assertions with direct mock Payload `create` or `update` calls.
- Preserve provider matrix coverage for Google, Zitadel, Apple, and Microsoft Entra ID; share contract helpers but keep provider quirks in fixtures.
- Use mocked external-provider integration for authorize + callback happy paths and token-failure redirects; `pnpm test:mocked` runs that focused layer.
- Use live provider tests only for env-gated token/userinfo smoke with one-time auth codes; load local secrets from `test/.env` and `dev/.env`.
