import type { Endpoint } from "payload";
import type { PluginTypes } from "./types";

export const createAuthorizeEndpoint = (
  pluginOptions: PluginTypes,
): Endpoint => ({
  method: "get",
  path: pluginOptions.authorizePath || "/oauth/authorize",
  handler: async () => {
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

    return Response.redirect(url.toString());
  },
});
