import crypto from "crypto";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { AuthStrategy, AuthStrategyResult, User, parseCookies } from "payload";
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
      let jwtUser: jwt.JwtPayload | string;
      try {
        jwtUser = jwt.verify(
          token,
          crypto
            .createHash("sha256")
            .update(payload.config.secret)
            .digest("hex")
            .slice(0, 32),
          { algorithms: ["HS256"] },
        );
      } catch (e) {
        if (e instanceof TokenExpiredError) return { user: null };
        throw e;
      }
      if (typeof jwtUser === "string") return { user: null };

      // Find the user by email from the verified jwt token
      const userCollection = jwtUser.collection || pluginOptions.authCollection;
      let user: User | null = null;
      if (pluginOptions.useEmailAsIdentity) {
        if (typeof jwtUser.email !== "string") return { user: null };
        const usersQuery = await payload.find({
          collection: userCollection,
          where: { email: { equals: jwtUser.email } },
        });
        if (usersQuery.docs.length === 0) {
          user = (await payload.create({
            collection: userCollection,
            data: {
              ...jwtUser,
              // Stuff breaks when password is missing
              password: crypto.randomBytes(32).toString("hex"),
            },
          })) as User;
        } else {
          user = usersQuery.docs[0] as User;
        }
      } else {
        if (typeof jwtUser[subFieldName] !== "string") return { user: null };
        const usersQuery = await payload.find({
          collection: userCollection,
          where: { [subFieldName]: { equals: jwtUser[subFieldName] } },
        });
        if (usersQuery.docs.length === 0) {
          user = (await payload.create({
            collection: userCollection,
            data: {
              ...jwtUser,
              // Stuff breaks when password is missing
              password: crypto.randomBytes(32).toString("hex"),
            },
          })) as User;
        } else {
          user = usersQuery.docs[0] as User;
        }
      }
      user.collection = userCollection;

      // Return the user object
      return { user };
    },
  };
  return authStrategy;
};
