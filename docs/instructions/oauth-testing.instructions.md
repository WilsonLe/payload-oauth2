---
description: "OAuth plugin test layering and provider coverage conventions."
applyTo: "test/**,src/**"
---

# OAuth Testing

- Keep `pnpm test` and GitHub Actions deterministic: no live provider calls, browser automation, or OAuth secrets; model provider behavior with mocks.
- Exercise callback behavior through `createCallbackEndpoint(...).handler(req)`; avoid replacing callback assertions with direct mock Payload `create` or `update` calls.
- Preserve provider matrix coverage for Google, Zitadel, Apple, and Microsoft Entra ID; share contract helpers but keep provider quirks in fixtures.
- Use mocked external-provider integration for authorize + callback happy paths, create/update branches, provider response failures, token request bodies, PKCE authorize behavior, and PKCE callback `code_verifier` exchange; `pnpm test` runs this layer with the rest of the suite.
- Keep roundtrip tests for callback-issued JWTs authenticating through the auth strategy, and idempotency tests for plugin collection wiring.
