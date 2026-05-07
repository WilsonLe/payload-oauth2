import { JWTPayload, jwtVerify } from "jose";
import {
  AuthStrategy,
  AuthStrategyResult,
  CollectionSlug,
  User,
  extractJWT,
} from "payload";
import {
  shouldUsePayloadSessions,
  userHasPayloadSession,
} from "./auth-sessions";
import { PluginOptions } from "./types";

const getStringClaim = (
  jwtUser: JWTPayload,
  claimName: string,
): string | undefined => {
  const claim = jwtUser[claimName];
  return typeof claim === "string" && claim.length > 0 ? claim : undefined;
};

const getJWTUserID = (jwtUser: JWTPayload): number | string | undefined => {
  const userID = jwtUser.id;
  return typeof userID === "string" || typeof userID === "number"
    ? userID
    : undefined;
};

export const createAuthStrategy = (
  pluginOptions: PluginOptions,
  subFieldName: string,
): AuthStrategy => {
  const authStrategy: AuthStrategy = {
    name: pluginOptions.strategyName,
    authenticate: async ({ headers, payload }): Promise<AuthStrategyResult> => {
      try {
        const token = extractJWT({ headers, payload });
        if (!token) return { user: null };

        let jwtUser: JWTPayload | null = null;
        try {
          const { payload: verifiedPayload } = await jwtVerify(
            token,
            new TextEncoder().encode(payload.secret),
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
        const collectionConfig = payload.collections[userCollection]?.config;
        if (!collectionConfig) return { user: null };

        if (shouldUsePayloadSessions(collectionConfig)) {
          const sid = getStringClaim(jwtUser, "sid");
          const userID = getJWTUserID(jwtUser);
          if (!sid || userID === undefined) return { user: null };

          const user = (await payload.findByID({
            collection: userCollection,
            disableErrors: true,
            id: userID,
            showHiddenFields: true,
          })) as User | null;

          if (!user || !userHasPayloadSession(user, sid)) {
            return { user: null };
          }

          if (
            typeof collectionConfig.auth === "object" &&
            collectionConfig.auth.verify &&
            !user._verified
          ) {
            return { user: null };
          }

          user.collection = userCollection;
          user._sid = sid;
          user._strategy = pluginOptions.strategyName;

          return { user } as AuthStrategyResult;
        }

        let user: User | null = null;

        if (pluginOptions.useEmailAsIdentity) {
          if (!jwtUser.email || typeof jwtUser.email !== "string") {
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
        user._strategy = pluginOptions.strategyName;

        // Return the user object
        return { user } as AuthStrategyResult;
      } catch (e) {
        payload.logger.error(e);
        return { user: null };
      }
    },
  };
  return authStrategy;
};
