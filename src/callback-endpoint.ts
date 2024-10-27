import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  CollectionSlug,
  Endpoint,
  generatePayloadCookie,
  getFieldsToSign,
} from "payload";
import { PluginTypes } from "./types";

export const createCallbackEndpoint = (
  pluginOptions: PluginTypes,
): Endpoint => ({
  method: "get",
  path: pluginOptions.callbackPath || "/oauth/callback",
  handler: async (req) => {
    try {
      const { code } = req.query;
      if (typeof code !== "string")
        throw new Error(
          `Code not in query string: ${JSON.stringify(req.query)}`,
        );

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
        access_token = await pluginOptions.getToken(code);
      } else {
        const tokenResponse = await fetch(pluginOptions.tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams({
            code,
            client_id: pluginOptions.clientId,
            client_secret: pluginOptions.clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }).toString(),
        });
        const tokenData = await tokenResponse.json();

        access_token = tokenData?.access_token;
      }

      if (typeof access_token !== "string")
        throw new Error(`No access token: ${access_token}`);

      // /////////////////////////////////////
      // get user info
      // /////////////////////////////////////
      const userInfo = await pluginOptions.getUserInfo(access_token);
      console.log("userInfo", userInfo);

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

      console.log("existingUser", existingUser);
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

      console.log("user", user);
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

      const token = jwt.sign(fieldsToSign, req.payload.secret, {
        expiresIn: collectionConfig.auth.tokenExpiration,
      });
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
      console.log("error", error);
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
