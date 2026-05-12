---
description: "OAuth plugin architecture seams, identity policy, and public interface compatibility rules."
applyTo: "src/**,test/**,examples/**"
---

# OAuth Architecture

- Keep the package generic and zero-dependency; do not add built-in provider adapters unless the public direction changes.
- Preserve the public `PluginOptions` interface. Normalize defaults and validate invariants inside implementation modules; warn and keep legacy values rather than throwing for newly detected invalid config.
- When `useEmailAsIdentity` is true, always sign email into the JWT even if `excludeEmailFromJwtToken` is true; warn about the conflict so callback-issued JWTs still authenticate.
- Treat the callback flow as the only module that may create OAuth users. It respects `onUserNotFoundBehavior`, creates on first OAuth login, fails closed for invalid missing-user behavior, and reuses existing users without updating provider profile data.
- Preserve Payload session semantics. Callback transactions add Payload sessions before signing JWTs, and auth strategy validates `sid` for session-backed collections before normal identity lookup.
- Treat the auth strategy as authentication-only. A valid JWT that references no Payload user returns `{ user: null }` with a warning; invalid JWT verification errors surface to the caller.
- Keep provider behavior deterministic in tests. Use the provider matrix for Google, Zitadel, Apple, and Microsoft Entra ID instead of shallow per-provider specs that only assert copied options or mocks.
