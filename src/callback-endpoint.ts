import crypto from "crypto";
import { SignJWT } from "jose";
import {
  CollectionSlug,
  Endpoint,
  generatePayloadCookie,
  getFieldsToSign,
} from "payload";
import { defaultGetToken } from "./default-get-token";
import { PluginTypes } from "./types";

export const createCallbackEndpoint = (
  pluginOptions: PluginTypes,
): Endpoint => ({
 // Support both GET (default OAuth2) and POST (required for Apple OAuth with form_post)
	// - GET: Used by most OAuth providers (Google, GitHub, etc.)
	// - POST: Required by Apple when requesting name/email scopes with response_mode=form_post
	method: ['get', 'post'],
	path: pluginOptions.callbackPath || '/oauth/callback',
  handler: async (req) => {
    try {
   // Handle authorization code from both GET query params and POST body
			// This enables support for Apple's form_post response mode while maintaining
			// compatibility with traditional OAuth2 GET responses
			const code = req.method === 'POST' ? req.body?.code : req.query?.code
      	// Improved error handling to clearly indicate whether we're missing the code
			// from POST body (Apple OAuth) or GET query parameters (standard OAuth)
    	if (typeof code !== 'string')
				throw new Error(
						`Code not found in ${req.method === 'POST' ? 'body' : 'query'}: ${JSON.stringify(req.method === 'POST' ? req.body : req.query)}`,
				)

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
      // Not implemented

      // /////////////////////////////////////
      // obtain access token
      // /////////////////////////////////////

      let access_token: string;

      if (pluginOptions.getToken) {
        access_token = await pluginOptions.getToken(code, req);
      } else {
        access_token = await defaultGetToken(
          pluginOptions.tokenEndpoint,
          pluginOptions.clientId,
          pluginOptions.clientSecret,
          redirectUri,
          code,
        );
      }

      if (typeof access_token !== "string")
        throw new Error(`No access token: ${access_token}`);

      // /////////////////////////////////////
      // get user info
      // /////////////////////////////////////
      const userInfo = await pluginOptions.getUserInfo(access_token, req);

      // /////////////////////////////////////
      // ensure user exists
      // /////////////////////////////////////
      let existingUser: any;
      if (useEmailAsIdentity) {
        existingUser = await req.payload.find({
          req,
          collection: authCollection,
          where: { email: { equals: userInfo.email } },
          showHiddenFields: true,
          limit: 1,
        });
      } else {
        existingUser = await req.payload.find({
          req,
          collection: authCollection,
          where: { [subFieldName]: { equals: userInfo[subFieldName] } },
          showHiddenFields: true,
          limit: 1,
        });
      }

      let user: any;
      if (existingUser.docs.length === 0) {
        user = await req.payload.create({
          req,
          collection: authCollection,
          data: {
            ...userInfo,
            // Stuff breaks when password is missing
            password: crypto.randomBytes(32).toString("hex"),
          },
          showHiddenFields: true,
        });
      } else {
        user = await req.payload.update({
          req,
          collection: authCollection,
          id: existingUser.docs[0].id,
          data: userInfo,
          showHiddenFields: true,
        });
      }

      // /////////////////////////////////////
      // beforeLogin - Collection
      // /////////////////////////////////////

      await collectionConfig.hooks.beforeLogin.reduce(
        async (priorHook, hook) => {
          await priorHook;

          user =
            (await hook({
              collection: collectionConfig,
              context: req.context,
              req,
              user,
            })) || user;
        },
        Promise.resolve(),
      );

      // /////////////////////////////////////
      // login - OAuth2
      // /////////////////////////////////////
      const fieldsToSign = getFieldsToSign({
        collectionConfig,
        email: user.email,
        user,
      });

      const token = await new SignJWT(fieldsToSign)
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

          user =
            (await hook({
              collection: collectionConfig,
              context: req.context,
              req,
              token,
              user,
            })) || user;
        },
        Promise.resolve(),
      );

      // /////////////////////////////////////
      // afterRead - Fields
      // /////////////////////////////////////
      // Not implemented

      // /////////////////////////////////////
      // generate and set cookie
      // /////////////////////////////////////
      const cookie = generatePayloadCookie({
        collectionAuthConfig: collectionConfig.auth,
        cookiePrefix: payloadConfig.cookiePrefix,
        token,
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
  },
});
