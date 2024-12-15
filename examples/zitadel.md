# Google OAuth2

```ts
export default buildConfig({
  // ...
  admin: {
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      // A simple button with <a> tag that links to your authorization path
      // which defaults to /api/users/oauth/authorize
      afterLogin: ["app/components/OAuthLoginButton#OAuthLoginButton"],
    },
    user: "users", // assuming you already have a users collection with auth enabled
  },
  // ...
  plugins: [
    OAuth2Plugin({
      enabled:
        typeof process.env.ZITADEL_CLIENT_ID === "string" &&
        typeof process.env.ZITADEL_CLIENT_SECRET === "string" &&
        typeof process.env.ZITADEL_TOKEN_ENDPOINT === "string" &&
        typeof process.env.ZITADEL_AUTHORIZATION_URL === "string" &&
        typeof process.env.ZITADEL_USERINFO_ENDPOINT === "string",
      strategyName: "zitadel",
      useEmailAsIdentity: true,
      serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
      clientId: process.env.ZITADEL_CLIENT_ID || "",
      clientSecret: process.env.ZITADEL_CLIENT_SECRET || "",
      authorizePath: "/oauth/zitadel",
      callbackPath: "/oauth/zitadel/callback",
      authCollection: "users",
      tokenEndpoint: process.env.ZITADEL_TOKEN_ENDPOINT || "",
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "urn:zitadel:iam:user:metadata",
      ],
      providerAuthorizationUrl: process.env.ZITADEL_AUTHORIZATION_URL || "",
      getUserInfo: async (accessToken: string) => {
        const response = await fetch(
          process.env.ZITADEL_USERINFO_ENDPOINT || "",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const user = await response.json();
        return { email: user.email, sub: user.sub };
      },
      successRedirect: (req) => {
        return "/admin";
      },
      failureRedirect: (req, err) => {
        req.payload.logger.error(err);
        return "/admin/login";
      },
    }),
  ],
  // ...
});
```
