import crypto from "crypto";
import type { Endpoint, PayloadRequest } from "payload";
import { generateCookie } from "payload";
import { resolveOAuthConfig, type OAuthConfigInput } from "./oauth-config";

const isNextRscRequest = (req: PayloadRequest): boolean =>
  req.headers.get("RSC") === "1" ||
  req.headers.has("Next-Router-State-Tree") ||
  req.headers.has("Next-Router-Prefetch") ||
  req.searchParams.has("_rsc");

export const createAuthorizeEndpoint = (input: OAuthConfigInput): Endpoint => {
  const config = resolveOAuthConfig(input);

  return {
    method: "get",
    path: config.authorizePath,
    handler: async (req: PayloadRequest) => {
      if (isNextRscRequest(req)) {
        return new Response(null, { status: 204 });
      }

      const url = new URL(config.providerAuthorizationUrl);
      url.searchParams.append("client_id", config.clientId);
      url.searchParams.append("redirect_uri", config.redirectUri);
      url.searchParams.append("scope", config.scope);
      url.searchParams.append("response_type", "code");
      url.searchParams.append("access_type", "offline");

      if (config.prompt) {
        url.searchParams.append("prompt", config.prompt);
      }
      if (config.responseMode) {
        url.searchParams.append("response_mode", config.responseMode);
      }
      if (config.authType) {
        url.searchParams.append("auth_type", config.authType);
      }

      // Forward state from request query if available
      const state = req.searchParams.get("state");
      if (state) url.searchParams.append("state", state);

      url.searchParams.append("nonce", crypto.randomBytes(16).toString("hex"));

      if (config.pkceEnabled) {
        const { challenge, challengeMethod, verifier } = config.getPkceCodes();
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
  };
};
