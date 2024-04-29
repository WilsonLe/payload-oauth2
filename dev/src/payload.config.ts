import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload/config";
import sharp from "sharp";
import { oauth } from "../../src/plugin";
import Users from "./collections/Users";
import { OAuthLoginButton } from "./components/OAuthLoginButton";

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "super-secret",
  admin: { user: Users.slug },
  editor: lexicalEditor({}),
  collections: [Users],
  typescript: { outputFile: path.resolve(__dirname, "payload-types.ts") },
  plugins: [
    oauth({
      enabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authCollection: "users",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
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
      OAuthLoginButton, // a simple link to authorization path
    }),
  ],
  db: mongooseAdapter({ url: process.env.DATABASE_URI || "" }),
  sharp,
});
