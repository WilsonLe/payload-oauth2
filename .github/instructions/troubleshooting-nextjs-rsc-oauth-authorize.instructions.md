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
- When application UI starts login with Next client routing (`next/link` or `router.push`) to that same-origin API URL, Next tries to fetch an RSC payload first. The redirect/API response cannot satisfy that RSC request, so Next logs the fetch failure before falling back to full browser navigation.

## Fix

- Start OAuth with a document navigation instead of Next client routing: use a plain `<a href="/api/users/oauth/authorize">`, a form/action, or `window.location.assign('/api/users/oauth/authorize')`.
- Do not use `next/link` or `router.push()` for the authorize endpoint. `prefetch={false}` may reduce prefetching, but it does not turn the click into a document navigation.

## Verification

- Click the login control and confirm the browser navigates directly to `/api/<auth-collection>/oauth/authorize` and follows the provider redirect.
- Confirm the console no longer emits the RSC payload fetch failure during login.
- Confirm the OAuth callback still completes and authenticates the user.
