import type { JWTPayload } from "jose";
import { jwtVerify } from "jose";
import {
  extractJWT,
  type AuthStrategy,
  type AuthStrategyResult,
  type CollectionSlug,
  type User,
} from "payload";
import {
  shouldUsePayloadSessions,
  userHasPayloadSession,
} from "./auth-sessions";
import { resolveOAuthConfig, type OAuthConfigInput } from "./oauth-config";
import { findUserByOAuthIdentity, tryGetOAuthIdentity } from "./oauth-identity";

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
  input: OAuthConfigInput,
  subFieldName?: string,
): AuthStrategy => {
  const config = resolveOAuthConfig(input, { subFieldName });

  const authStrategy: AuthStrategy = {
    name: config.strategyName,
    authenticate: async ({ headers, payload }): Promise<AuthStrategyResult> => {
      const token = extractJWT({ headers, payload });
      if (!token) return { user: null };

      const { payload: jwtUser } = await jwtVerify(
        token,
        new TextEncoder().encode(payload.secret),
        { algorithms: ["HS256"] },
      );

      const userCollection = ((typeof jwtUser.collection === "string" &&
        jwtUser.collection) ||
        config.authCollection) as CollectionSlug;
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
        user._strategy = config.strategyName;

        return { user };
      }

      const identity = tryGetOAuthIdentity(
        config,
        jwtUser as JWTPayload,
        "jwt token",
      );
      if (!identity) {
        payload.logger.warn(
          config.useEmailAsIdentity
            ? "Using email as identity but no email is found in jwt token"
            : `No ${config.subFieldName} found in jwt token. Make sure the jwt token contains the ${config.subFieldName} field`,
        );
        return { user: null };
      }

      const usersQuery = await findUserByOAuthIdentity({
        payload,
        collection: userCollection,
        identity,
      });
      const user = usersQuery.docs[0] as User | undefined;

      if (!user) {
        payload.logger.warn(
          `OAuth user not found in ${userCollection} for ${identity.field}: ${identity.value}`,
        );
        return { user: null };
      }

      user.collection = userCollection;
      user._strategy = config.strategyName;
      return { user };
    },
  };
  return authStrategy;
};
