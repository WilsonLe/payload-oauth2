import { AuthStrategy, AuthStrategyResult, type CollectionConfig, type CollectionSlug, type User} from "payload";
import { createAuthorizeEndpoint } from "./authorize-endpoint";
import { createCallbackEndpoint } from "./callback-endpoint";
import { PluginTypes } from "./types";
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

export const modifyAuthCollection = (
  pluginOptions: PluginTypes,
  existingCollectionConfig: CollectionConfig,
  subFieldName: string,
): CollectionConfig => {
  // /////////////////////////////////////
  // modify fields
  // /////////////////////////////////////

  const fields = existingCollectionConfig.fields || [];
  const existingSubField = fields.find(
    (field) => "name" in field && field.name === subFieldName,
  );
  if (!existingSubField) {
    fields.push({
      name: subFieldName,
      type: "text",
      index: true,
      access: {
        read: () => true,
        create: () => true,
        update: () => false,
      },
    });
  }

  // /////////////////////////////////////
  // modify strategies
  // /////////////////////////////////////

  const authStrategy: AuthStrategy = {
    name: "oauth",
    authenticate:  async ({ headers, payload }):Promise<AuthStrategyResult> => {
      const cookieMap = new Map<string, string>();
      const cookie = headers.get("Cookie");
      if (cookie) {
        // Parse the cookie header and set the cookieMap
        cookie.split(";").forEach((cookie) => {
          const parts = cookie.split("=");
          const key = parts.shift()?.trim();
          const encodedValue = parts.join("=");
          if (key) {
            try {
              const decodedValue = decodeURI(encodedValue);
              cookieMap.set(key, decodedValue);
            } catch (e) {
              return { user: null };
          }
          }
        });
        // Create a hash from the secret and verify the token
        const token = cookieMap.get(`${payload.config.cookiePrefix}-token`);

        if (!token) {
          return { user: null };
        }

        let jwtUser: string | JwtPayload | null = null;
        let user: User | null = null;
        const hash = crypto
          .createHash("sha256")
          .update(payload.config.secret)
          .digest("hex")
          .slice(0, 32);
        try {
          jwtUser = jwt.verify(token, hash, { algorithms: ["HS256"] });
        } catch (error) {
          return { user: null };
        }

        // Find the user by email from the verified jwt token
        if (typeof jwtUser !== 'string' && jwtUser.email) {
        const usersQuery = await payload.find({
          collection: payload.config.admin.user as CollectionSlug,
          where: {
            email: {
              equals: jwtUser.email,
            },
          },
        });

        user = usersQuery.docs[0] as User;
        user.collection = payload.config.admin.user;

        // Return the user object
        return { user: user };
      } else {
        return { user: null };
      }
    } else {
      return { user: null };
    }
    },
  };

  let strategies: AuthStrategy[] = [];
  if (typeof existingCollectionConfig.auth === 'object' && existingCollectionConfig.auth !== null) {
    strategies = existingCollectionConfig.auth.strategies || [];
  }
  strategies.push(authStrategy as AuthStrategy);

  // /////////////////////////////////////
  // modify endpoints
  // /////////////////////////////////////
  const endpoints = existingCollectionConfig.endpoints || [];
  endpoints.push(createAuthorizeEndpoint(pluginOptions));
  endpoints.push(createCallbackEndpoint(pluginOptions));
  return {
    ...existingCollectionConfig,
    fields,
    endpoints,
    auth: {
      ...(typeof existingCollectionConfig.auth === 'object' && existingCollectionConfig.auth !== null ? existingCollectionConfig.auth : {}),
      strategies,
    },
  };
};
