---
description: "Troubleshooting Payload v3 auth session issues in the OAuth2 auth strategy and callback flow."
applyTo: "src/auth-strategy.ts,src/callback-endpoint.ts,src/auth-sessions.ts,test/**,README.md"
---

# Payload auth sessions with OAuth2

## Symptoms

- Payload refresh fails or returns forbidden after OAuth login when `auth.useSessions` is enabled.
- Logging out removes the Payload session, but restoring an old `payload-token` cookie still authenticates.
- Captured JWTs remain valid until `tokenExpiration` even after logout.

## Root cause

- Payload v3 session-backed JWTs include a `sid` claim that must match an entry in `user.sessions`.
- The OAuth2 callback previously signed Payload JWTs without creating a session or including `sid`.
- The OAuth2 auth strategy verified Payload JWTs independently and returned users by email/sub without validating `sid`.
- Because custom auth strategies run before Payload's built-in `local-jwt` strategy, the OAuth2 strategy could bypass Payload's native session revocation.

## Fix

- When Payload sessions are active for the auth collection, create a Payload session during OAuth callback and include its `sid` in the signed JWT.
- In the OAuth2 auth strategy, require `sid` for session-backed collections and validate it against `user.sessions` before returning a user.
- Set `user._sid` after validation so Payload refresh/logout operations can use the session ID.
- Do not create users from JWT authentication when sessions are active.

## Verification

- Unit-test OAuth callback to confirm a session is persisted and the generated JWT contains `sid`.
- Unit-test the auth strategy with a valid `sid`, missing `sid`, and revoked `sid`.
- Confirm Payload refresh succeeds after OAuth login with sessions enabled.
- Confirm logout removes the session and a restored old cookie no longer authenticates.
