import { Endpoint } from "payload";
import { PluginTypes } from "./types";

export const createAuthorizeEndpoint = (
  pluginOptions: PluginTypes,
): Endpoint => ({
  method: "get",
  path: pluginOptions.authorizePath || "/oauth/authorize",
  handler: async () => {
    const clientId = pluginOptions.clientId;
    const prompt = pluginOptions.prompt
      ? `&prompt=${encodeURIComponent(pluginOptions.prompt)}`
      : "";
    const authCollection = pluginOptions.authCollection || "users";
    const callbackPath = pluginOptions.callbackPath || "/oauth/callback";
    const redirectUri = encodeURIComponent(
      `${pluginOptions.serverURL}/api/${authCollection}${callbackPath}`,
    );
    const scope = encodeURIComponent(pluginOptions.scopes.join(" "));

    const responseType = "code";
    const accessType = "offline";
    const authorizeUrl = `${pluginOptions.providerAuthorizationUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&access_type=${accessType}${prompt}`;

    return Response.redirect(authorizeUrl);
  },
});
