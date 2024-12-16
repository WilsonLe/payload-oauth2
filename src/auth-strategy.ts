import crypto from "crypto";
import { JWTPayload, jwtVerify } from "jose";
import {
  AuthStrategy,
  AuthStrategyResult,
  CollectionSlug,
  User,
  parseCookies,
} from "payload";
import { PluginTypes } from "./types";

export const createAuthStrategy = (
  pluginOptions: PluginTypes,
  subFieldName: string,
): AuthStrategy => {
  const authStrategy: AuthStrategy = {
    name: pluginOptions.strategyName,
    authenticate: async ({ headers, payload }): Promise<AuthStrategyResult> => {
      const cookie = parseCookies(headers);
      const token = cookie.get(`${payload.config.cookiePrefix}-token`);
      if (!token) return { user: null };

      let jwtUser: JWTPayload | null = null;
      try {
        const secret = crypto
          .createHash("sha256")
          .update(payload.config.secret)
          .digest("hex")
          .slice(0, 32);

        const { payload: verifiedPayload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
          { algorithms: ["HS256"] },
        );
        jwtUser = verifiedPayload;
      } catch (e: any) {
        // Handle token expiration
        if (e.code === "ERR_JWT_EXPIRED") return { user: null };
        throw e;
      }
      if (!jwtUser) return { user: null };

      // Find the user by email from the verified jwt token
      // coerce userCollection to CollectionSlug because it is already checked
      // in `modify-auth-collection.ts` that it is a valud collection slug
      const userCollection = ((typeof jwtUser.collection === "string" &&
        jwtUser.collection) ||
        pluginOptions.authCollection ||
        "users") as CollectionSlug;
      let user: User | null = null;

      if (pluginOptions.useEmailAsIdentity) {
        if (typeof jwtUser.email !== "string") {
          payload.logger.warn(
            "Using email as identity but no email is found in jwt token",
          );
          return { user: null };
        }
        const usersQuery = await payload.find({
          collection: userCollection,
          where: { email: { equals: jwtUser.email } },
        });
        if (usersQuery.docs.length === 0) {
          // coerce to User because `userCollection` is a valid auth collection, checked by `modify-auth-collection.ts` already
          user = (await payload.create({
            collection: userCollection,
            data: jwtUser as any,
          })) as unknown as User;
        } else {
          // coerce to User because payload warns that some collection may not have property `collection` - i.e. `PayloadMigration;
          user = usersQuery.docs[0] as unknown as User;
        }
      } else {
        if (typeof jwtUser[subFieldName] !== "string") {
          payload.logger.warn(
            `No ${subFieldName} found in jwt token. Make sure the jwt token contains the ${subFieldName} field`,
          );
          return { user: null };
        }
        const usersQuery = await payload.find({
          collection: userCollection,
          where: { [subFieldName]: { equals: jwtUser[subFieldName] } },
        });
        if (usersQuery.docs.length === 0) {
          // coerce to User because payload warns that some collection may not have property `collection` - i.e. `PayloadMigration;
          user = (await payload.create({
            collection: userCollection,
            data: jwtUser as any,
          })) as unknown as User;
        } else {
          // coerce to User because payload warns that some collection may not have property `collection` - i.e. `PayloadMigration;
          user = usersQuery.docs[0] as unknown as User;
        }
      }
      user.collection = userCollection;

      // Return the user object
      return { user };
    },
  };
  return authStrategy;
};
