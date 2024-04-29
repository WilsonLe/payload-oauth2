import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload/config";
import sharp from "sharp";
import { oAuthPlugin } from "../../src/plugin";
import Examples from "./collections/Examples";
import Users from "./collections/Users";
import { OAuthLoginButton } from "./components/OAuthLoginButton";

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "super-secret",
  admin: {
    user: Users.slug,
  },
  editor: lexicalEditor({}),
  collections: [Examples, Users],
  typescript: {
    outputFile: path.resolve(__dirname, "payload-types.ts"),
  },
  plugins: [
    oAuthPlugin({
      enabled: true,
      clientId: process.env.CLIENT_ID || "",
      clientSecret: process.env.CLIENT_SECRET || "",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      authorizePath: "/oauth/users/google/authorize",
      callbackPath: "/oauth/users/google/callback",
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
        return {
          email: user.email,
          sub: user.sub,
        };
      },
      successRedirect: () => "/admin",
      failureRedirect: () => "/admin",
      OAuthLoginButton,
    }),
  ],
  db: mongooseAdapter({ url: process.env.DATABASE_URI || "" }),
  sharp,
});
