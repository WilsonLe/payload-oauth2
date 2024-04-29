import { Endpoint } from "payload/config";
import { PluginTypes } from "./types";

export const createAuthorizeEndpoint = (
  pluginOptions: PluginTypes
): Endpoint => ({
  method: "get",
  path: pluginOptions.authorizePath || "/oauth/authorize",
  handler: async () => {
    const clientId = pluginOptions.clientId;
    const authCollection = pluginOptions.authCollection || "users";
    const callbackPath = pluginOptions.callbackPath || "/oauth/callback";
    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_URL}/api/${authCollection}${callbackPath}`
    );
    const scope = encodeURIComponent(pluginOptions.scopes.join(" "));
    const responseType = "code";
    const accessType = "offline";
    const authorizeUrl = `${pluginOptions.providerAuthorizationUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&access_type=${accessType}`;
    return Response.redirect(authorizeUrl);
  },
});
