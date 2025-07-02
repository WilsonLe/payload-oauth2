import crypto from "crypto";
import type { Endpoint } from "payload";
import type { PluginOptions } from "./types";

export const createAuthorizeEndpoint = (
  pluginOptions: PluginOptions,
): Endpoint => ({
  method: "get",
  path: pluginOptions.authorizePath || "/oauth/authorize",
  handler: async (req) => {
    const clientId = pluginOptions.clientId;
    const authCollection = pluginOptions.authCollection || "users";
    const callbackPath = pluginOptions.callbackPath || "/oauth/callback";
    const redirectUri = `${pluginOptions.serverURL}/api/${authCollection}${callbackPath}`;

    const scope = pluginOptions.scopes.join(" ");
    const responseType = "code";
    const accessType = "offline";

    // Create a URL object and set search parameters
    const url = new URL(pluginOptions.providerAuthorizationUrl);
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("scope", scope);
    url.searchParams.append("response_type", responseType);
    url.searchParams.append("access_type", accessType);

    if (pluginOptions.prompt) {
      url.searchParams.append("prompt", pluginOptions.prompt);
    }
    if (pluginOptions.responseMode) {
      url.searchParams.append("response_mode", pluginOptions.responseMode);
    }
    if (pluginOptions.authType) {
      url.searchParams.append("auth_type", pluginOptions.authType);
    }

    // Forward state from request query if available
    const state = req.query?.state;
    if (state) url.searchParams.append("state", state);

    url.searchParams.append("nonce", crypto.randomBytes(16).toString("hex"));

    return Response.redirect(url.toString());
  },
});
