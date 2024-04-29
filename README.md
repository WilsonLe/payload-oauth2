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

# Installation

```
npm install payload-oauth2
yarn install payload-oauth2
```

# Example Usage

Integrating Google OAuth2 to `users` collection.

```ts
export default buildConfig({
  // ...
  plugins: [
    oAuthPlugin({
      enabled: true,
      serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
      authCollection: "users", // assuming you already have a users collection with auth enabled
      clientId: process.env.CLIENT_ID || "",
      clientSecret: process.env.CLIENT_SECRET || "",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ],
      providerAuthorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      getUserInfo: async (accessToken: string) => {
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const user = await response.json();
        return { email: user.email, sub: user.sub };
      },
      successRedirect: () => "/admin",
      failureRedirect: () => "/login",
      OAuthLoginButton, // a simple link to authorization path (/api/users/oauth/authorize)
    }),
  ],
  // ...
});
```

# Contributing

Contributions and feedback are very welcome.

To get it running:

1. Clone the project.
2. `pnpm install`
3. `pnpm dev`

# License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

# Credits

This package was inspired by [Payload Plugin OAuth](https://github.com/thgh/payload-plugin-oauth)
