import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { OAuth2Plugin } from "../../src/plugin";
import Users from "./collections/Users";
import { migrations } from "./migrations";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "super-secret",
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterLogin: ["app/components/OAuthLoginButton#OAuthLoginButton"],
    },
    user: Users.slug,
  },
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || "file:./payload-oauth2.db" },
    migrationDir: path.resolve(dirname, "migrations"),
    prodMigrations: migrations,
  }),
  editor: lexicalEditor({}),
  collections: [Users],
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  plugins: [
    ////////////////////////////////////////////////////////////////////////////
    // Google OAuth
    ////////////////////////////////////////////////////////////////////////////
    OAuth2Plugin({
      enabled:
        typeof process.env.GOOGLE_CLIENT_ID === "string" &&
        typeof process.env.GOOGLE_CLIENT_SECRET === "string",
      strategyName: "google",
      useEmailAsIdentity: true,
      serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorizePath: "/oauth/google",
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
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const user = await response.json();
        return { email: user.email, sub: user.sub };
      },
      successRedirect: (req) => {
        return "/admin";
      },
      failureRedirect: (req, err) => {
        return "/admin/login";
      },
    }),
  ],
  sharp,
});
