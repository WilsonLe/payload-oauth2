import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { googleOAuth } from "../../examples/google";
import { microsoftEntraIdOAuth } from "../../examples/microsoft-entra-id";
import { zitadelOAuth } from "../../examples/zitadel";
import LocalUsers from "./collections/LocalUsers";
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
      afterLogin: [
        "src/components/GoogleOAuthLoginButton#GoogleOAuthLoginButton",
        "src/components/ZitadelOAuthLoginButton#ZitadelOAuthLoginButton",
        "src/components/MicrosoftEntraIdOAuthLoginButton#MicrosoftEntraIdOAuthLoginButton",
      ],
    },
    user: Users.slug,
  },
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || "file:./payload-oauth2.db" },
    migrationDir: path.resolve(dirname, "migrations"),
    prodMigrations: migrations,
  }),
  editor: lexicalEditor({}),
  collections: [Users, LocalUsers],
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  plugins: [googleOAuth, zitadelOAuth, microsoftEntraIdOAuth],
  sharp,
});
