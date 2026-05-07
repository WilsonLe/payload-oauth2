import crypto from "crypto";
import type { Endpoint, PayloadRequest } from "payload";
import { generateCookie } from "payload";
import { defaultGetPkceCodes } from "./default-get-pkce-codes";
import type { PluginOptions } from "./types";

const isNextRscRequest = (req: PayloadRequest): boolean =>
  req.headers.get("RSC") === "1" ||
  req.headers.has("Next-Router-State-Tree") ||
  req.headers.has("Next-Router-Prefetch") ||
  req.searchParams.has("_rsc");

export const createAuthorizeEndpoint = (
  pluginOptions: PluginOptions,
): Endpoint => ({
  method: "get",
  path: pluginOptions.authorizePath || "/oauth/authorize",
  handler: async (req: PayloadRequest) => {
    if (isNextRscRequest(req)) {
      return new Response(null, { status: 204 });
    }

    const clientId = pluginOptions.clientId;
    const authCollection = pluginOptions.authCollection || "users";
    const callbackPath = pluginOptions.callbackPath || "/oauth/callback";
    const redirectUri =
      pluginOptions.authorizeRedirectUri ||
      `${pluginOptions.serverURL}/api/${authCollection}${callbackPath}`;

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
    const state = req.searchParams.get("state");
    if (state) url.searchParams.append("state", state);

    url.searchParams.append("nonce", crypto.randomBytes(16).toString("hex"));

    if (pluginOptions.pkceEnabled) {
      const { challenge, challengeMethod, verifier } =
        typeof pluginOptions.getPkceCodes === "function"
          ? pluginOptions.getPkceCodes()
          : defaultGetPkceCodes();
      url.searchParams.append("code_challenge", challenge);
      url.searchParams.append("code_challenge_method", challengeMethod);
      const cookie = generateCookie({
        name: "pkce_verifier",
        value: verifier,
        maxAge: 10 * 60, // 10 minutes
        returnCookieAsObject: false,
        sameSite: "Lax",
      });
      return new Response(null, {
        headers: {
          "Set-Cookie": cookie as string,
          Location: url.toString(),
        },
        status: 302,
      });
    }

    return Response.redirect(url.toString());
  },
});
