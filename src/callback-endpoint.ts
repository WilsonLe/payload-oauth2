import payload from "payload";
import { Endpoint } from "payload/config";
import { PluginTypes } from "./types";

export const createCallbackEndpoint = (
  pluginOptions: PluginTypes
): Endpoint => ({
  method: "get",
  path: pluginOptions.callbackPath || "/oauth/callback",
  handler: async (req) => {
    const { code } = req.query;
    if (typeof code !== "string") {
      return Response.json({ error: "Code not provided" }, { status: 400 });
    }
    // shorthands
    const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api${pluginOptions.callbackPath}`;
    const subFieldName = pluginOptions.subFieldName || "sub";
    const authCollection = pluginOptions.authCollection || "users";

    try {
      const response = await fetch(pluginOptions.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: pluginOptions.clientId,
          client_secret: pluginOptions.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });
      const { access_token } = await response.json();
      if (typeof access_token !== "string")
        return Response.json(
          { error: "Failed to retrieve access token" },
          { status: 401 }
        );
      const userInfo = await pluginOptions.getUserInfo(access_token);
      const users = await payload.find({
        req,
        collection: authCollection,
        where: { [subFieldName]: { equals: userInfo[subFieldName] } },
        showHiddenFields: true,
        limit: 1,
      });
      if (users.docs.length === 0) {
        await payload.create({
          req,
          collection: authCollection,
          data: userInfo,
        });
      }

      // Redirect or handle authentication session setup here:
      return Response.redirect(`${process.env.NEXT_PUBLIC_URL}/admin`); // Redirect to a profile page or dashboard
    } catch (error) {
      console.error("Error during token exchange:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
