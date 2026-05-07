---
description: "Troubleshooting Next.js App Router RSC fetch failures when starting OAuth through the authorize endpoint."
applyTo: "src/authorize-endpoint.ts,src/modify-auth-collection.ts,README.md,dev/**,examples/**"
---

# Next.js RSC fetch failure on OAuth authorize

## Symptoms

- Browser console logs `Failed to fetch RSC payload for .../api/<auth-collection>/oauth/authorize. Falling back to browser navigation.`
- The OAuth login still continues after the fallback, usually by navigating to the provider authorization URL.

## Root cause

- The authorize endpoint is a Payload API endpoint that returns an HTTP redirect (`302`) to the external OAuth provider, not a Next.js App Router page or RSC payload.
- When application UI starts login with Next client routing (`next/link` or `router.push`) to that same-origin API URL, Next tries to fetch an RSC payload first. If that probe follows the provider redirect, the fetch can fail before Next falls back to full browser navigation.

## Fix

- Prefer a document navigation for OAuth: use a plain `<a href="/api/users/oauth/authorize">`, a form/action, or `window.location.assign('/api/users/oauth/authorize')`.
- The package should also defensively detect Next RSC probe requests (`RSC: 1`, `Next-Router-State-Tree`, `Next-Router-Prefetch`, or `_rsc`) and return `204 No Content` instead of the provider redirect. This lets Next fall back without the noisy failed-fetch log; the subsequent document navigation still receives the normal `302`.
- `prefetch={false}` may reduce prefetching, but it does not turn a `next/link` click into a document navigation.

## Verification

- Unit-test the authorize endpoint with Next RSC probe headers and assert `204` with no `Location` header.
- Unit-test a normal authorize request and assert it still returns `302` with the provider authorization `Location`.
- In a Next.js app, click the login control and confirm the OAuth flow redirects to the provider without the RSC payload fetch failure log, then returns through the callback and authenticates the user.
