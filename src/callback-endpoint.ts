import crypto from "node:crypto";
import { SignJWT } from "jose";
import type {
  CollectionSlug,
  Endpoint,
  PayloadHandler,
  PayloadRequest,
  RequestContext,
  User,
} from "payload";
import { generatePayloadCookie, getFieldsToSign } from "payload";
import { defaultGetToken } from "./default-get-token";
import type { PluginTypes } from "./types";

export const createCallbackEndpoint = (
  pluginOptions: PluginTypes,
): Endpoint => {
  const handler: PayloadHandler = async (req: PayloadRequest) => {
    try {
      // Handle authorization code from both GET query params and POST body
      // This enables support for Apple's form_post response mode while maintaining
      // compatibility with traditional OAuth2 GET responses
      let code: string | undefined;

      if (req.method === "POST") {
        // Handle form data from POST request (used by Apple OAuth)
        const contentType = req.headers.get("content-type");
        if (contentType?.includes("application/x-www-form-urlencoded")) {
          const text = await (req as unknown as Request).text();
          const formData = new URLSearchParams(text);
          code = formData.get("code") || undefined;
        }
      } else if (req.method === "GET") {
        // Handle query parameters (used by Google OAuth)
        code = typeof req.query === "object" && req.query ? (req.query as { code?: string }).code : undefined;
      }

      // Improved error handling to clearly indicate whether we're missing the code
      // from POST body (Apple OAuth) or GET query parameters (standard OAuth)
      if (typeof code !== "string") {
        throw new Error(
          `Code not found in ${req.method === "POST" ? "body" : "query"}: ${
            req.method === "POST"
              ? "form-data"
              : JSON.stringify(req.query)
          }`,
        );
      }

      // /////////////////////////////////////
      // shorthands
      // /////////////////////////////////////
      const subFieldName = pluginOptions.subFieldName || "sub";
      const authCollection = (pluginOptions.authCollection ||
        "users") as CollectionSlug;
      const collectionConfig = req.payload.collections[authCollection].config;
      const payloadConfig = req.payload.config;
      const callbackPath = pluginOptions.callbackPath || "/oauth/callback";
      const redirectUri = `${pluginOptions.serverURL}/api/${authCollection}${callbackPath}`;
      const useEmailAsIdentity = pluginOptions.useEmailAsIdentity ?? false;

      // /////////////////////////////////////
      // beforeOperation - Collection
      // /////////////////////////////////////
      // Not implemented - reserved for future use

      // /////////////////////////////////////
      // obtain access token or id_token
      // /////////////////////////////////////
      let token: string;

      if (pluginOptions.getToken) {
        token = await pluginOptions.getToken(code, req);
      } else {
        token = await defaultGetToken(
          pluginOptions.tokenEndpoint,
          pluginOptions.clientId,
          pluginOptions.clientSecret,
          redirectUri,
          code,
        );
      }

      if (typeof token !== "string") {
        throw new Error(`Invalid token response: ${token}`);
      }

      // /////////////////////////////////////
      // get user info
      // /////////////////////////////////////
      const userInfo = await pluginOptions.getUserInfo(token, req);

      // /////////////////////////////////////
      // ensure user exists
      // /////////////////////////////////////
      let existingUser: { docs: Array<Record<string, unknown>> };
      if (useEmailAsIdentity) {
        // Use email as the unique identifier
        existingUser = await req.payload.find({
          req,
          collection: authCollection,
          where: { email: { equals: userInfo.email } },
          showHiddenFields: true,
          limit: 1,
        });
      } else {
        // Use provider's sub field as the unique identifier
        existingUser = await req.payload.find({
          req,
          collection: authCollection,
          where: { [subFieldName]: { equals: userInfo[subFieldName] } },
          showHiddenFields: true,
          limit: 1,
        });
      }

      let user = existingUser.docs[0] as User;
      if (!user) {
        // Create new user if they don't exist
        const result = await req.payload.create({
          req,
          collection: authCollection,
          data: {
            ...userInfo,
            collection: authCollection,
            // Generate secure random password for OAuth users
            password: crypto.randomBytes(32).toString("hex"),
          },
          showHiddenFields: true,
        });
        user = result as User;
      } else {
        // Update existing user with latest info from provider
        const result = await req.payload.update({
          req,
          collection: authCollection,
          id: user.id,
          data: {
            ...userInfo,
            collection: authCollection,
          },
          showHiddenFields: true,
        });
        user = result as User;
      }

      // /////////////////////////////////////
      // beforeLogin - Collection
      // /////////////////////////////////////
      await collectionConfig.hooks.beforeLogin.reduce(
        async (priorHook, hook) => {
          await priorHook;

          const hookResult = await hook({
            collection: collectionConfig,
            context: req.context || {} as RequestContext,
            req,
            user,
          });

          if (hookResult) {
            user = hookResult as User;
          }
        },
        Promise.resolve(),
      );

      // /////////////////////////////////////
      // login - OAuth2
      // /////////////////////////////////////
      const fieldsToSign = getFieldsToSign({
        collectionConfig,
        email: user.email || "",
        user,
      });

      const jwtToken = await new SignJWT(fieldsToSign)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(`${collectionConfig.auth.tokenExpiration} secs`)
        .sign(new TextEncoder().encode(req.payload.secret));
      req.user = user;

      // /////////////////////////////////////
      // afterLogin - Collection
      // /////////////////////////////////////
      await collectionConfig.hooks.afterLogin.reduce(
        async (priorHook, hook) => {
          await priorHook;

          const hookResult = await hook({
            collection: collectionConfig,
            context: req.context || {} as RequestContext,
            req,
            token: jwtToken,
            user,
          });

          if (hookResult) {
            user = hookResult as User;
          }
        },
        Promise.resolve(),
      );

      // /////////////////////////////////////
      // afterRead - Fields
      // /////////////////////////////////////
      // Not implemented - reserved for future use

      // /////////////////////////////////////
      // generate and set cookie
      // /////////////////////////////////////
      const cookie = generatePayloadCookie({
        collectionAuthConfig: collectionConfig.auth,
        cookiePrefix: payloadConfig.cookiePrefix,
        token: jwtToken,
      });

      // /////////////////////////////////////
      // success redirect
      // /////////////////////////////////////
      return new Response(null, {
        headers: {
          "Set-Cookie": cookie,
          Location: await pluginOptions.successRedirect(req),
        },
        status: 302,
      });
    } catch (error) {
      // /////////////////////////////////////
      // failure redirect
      // /////////////////////////////////////
      return new Response(null, {
        headers: {
          "Content-Type": "application/json",
          Location: await pluginOptions.failureRedirect(req, error),
        },
        status: 302,
      });
    }
  };

  return {
    // We use GET as the primary method since that's what most OAuth providers use
    // The handler itself will accept both GET and POST internally
    method: "get",
    path: pluginOptions.callbackPath || "/oauth/callback",
    handler,
  };
};
