# Payload OAuth2 Plugin

<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License" />
</a>
<a href="https://github.com/wilsonle/payload-oauth2/issues">
  <img src="https://img.shields.io/github/issues/wilsonle/payload-oauth2.svg" alt="Issues" />
</a>
<a href="https://npmjs.org/package/payload-oauth2">
  <img src="https://img.shields.io/npm/v/payload-oauth2.svg?style=flat-squar" alt="NPM" />
</a>

# Features

- ✅ Compatible with Payload v3
- 🔐 Configures OAuth2 with any providers
- ✨ Zero dependencies
- ⚙ Highly customizable

# Integrations

Technically this plugin should work with all generic OAuth2 providers. Here are the list of providers that have been tested:

| Provider | Status                                                                                                                                                                                                      | Example                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Google   | [![Test Google OAuth](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-google-oauth.yml/badge.svg)](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-google-oauth.yml)    | [Config](./examples/google.ts)  |
| Zitadel  | [![Test Zitadel OAuth](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-zitadel-oauth.yml/badge.svg)](https://github.com/WilsonLe/payload-oauth2/actions/workflows/test-zitadel-oauth.yml) | [Config](./examples/zitadel.ts) |
| Apple    | Test not implemented                                                                                                                                                                                        | [Config](./examples/apple.ts)   |

# Installation

```
npm install payload-oauth2
yarn install payload-oauth2
pnpm install payload-oauth2
```

If you are feeling adventurous and want to manage the plugin yourself, you can copy the `src` directory into your payload projects.

# Starting the OAuth flow

Create a normal browser navigation to the Payload authorize endpoint from your login UI:

```tsx
export function GoogleLoginButton() {
  return <a href="/api/users/oauth/google">Continue with Google</a>
}
```

In Next.js App Router apps, do not start OAuth with `next/link` or `router.push()` for the authorize endpoint. The endpoint returns a redirect to the OAuth provider, not a React Server Component payload, so client-side routing can briefly log `Failed to fetch RSC payload ... Falling back to browser navigation` before the login continues.

# Contributing

Contributions and feedback are very welcome.

To get it running:

1. Clone the project.
2. `pnpm install`
3. `pnpm dev`

# License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

# Credits

This package was inspired by [Payload Plugin OAuth](https://github.com/thgh/payload-plugin-oauth).
