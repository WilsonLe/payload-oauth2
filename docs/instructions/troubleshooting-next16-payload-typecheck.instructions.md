---
description: "Troubleshooting Next 16 / Payload typed build failures in the dev app after dependency refreshes."
applyTo: "dev/**,src/**,examples/**,package.json,pnpm-lock.yaml"
---

# Next 16 / Payload typed build failures

## Symptoms

- `corepack pnpm dev:build` compiles, then fails during the TypeScript phase.
- Payload logger calls like `logger.error("message", error)` can fail with `No overload matches this call` when the caught error is `unknown`.
- Returning a dynamic Payload user from `src/auth-strategy.ts` can fail with `UntypedUser is not assignable` to generated collection user types.
- Next may add `import "./.next/types/routes.d.ts"` to `dev/next-env.d.ts`, set `jsx` to `react-jsx`, and add `.next/dev/types/**/*.ts` to `dev/tsconfig.json`.

## Root cause

- Next 16 type-checks the dev app against generated route and Payload collection types; root `tsc` may not exercise the same generated app types.
- Payload logger typings use object-first overloads for structured error payloads, so a string plus `unknown` argument may not type-check.
- The OAuth auth strategy is package-level generic and can authenticate a dynamic collection slug, while the dev app's generated Payload types expect a concrete collection-user union.

## Fix

- Run `corepack pnpm dev:build` after Next/Payload dependency refreshes, not just root `tsc`.
- Keep Next's required `dev/next-env.d.ts` and `dev/tsconfig.json` additions when they are emitted by `next build`.
- Log caught errors with structured object-first calls, for example `logger.error({ err: error }, "message")`.
- For dynamic auth-collection users, cast at the auth strategy return boundary after validation and metadata assignment: `return { user } as AuthStrategyResult`.

## Verification

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm build`
- `corepack pnpm test`
- `corepack pnpm dev:build`
