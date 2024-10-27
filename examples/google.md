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
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const user = await response.json();
        return { email: user.email, sub: user.sub };
      },
      successRedirect: (req) => {
        return "/admin";
      },
      failureRedirect: (req, error) => {
        console.error(error);
        return "/login";
      },
    }),
  ],
  // ...
});
```
