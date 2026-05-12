import type { Endpoint, PayloadHandler, PayloadRequest } from "payload";
import { runOAuthCallbackTransaction } from "./oauth-callback-transaction";
import { resolveOAuthConfig, type OAuthConfigInput } from "./oauth-config";

export const createCallbackEndpoint = (input: OAuthConfigInput): Endpoint[] => {
  const config = resolveOAuthConfig(input);

  const handler: PayloadHandler = async (req: PayloadRequest) => {
    try {
      const result = await runOAuthCallbackTransaction(req, config);

      return new Response(null, {
        headers: {
          "Set-Cookie": result.cookie,
          Location: result.location,
        },
        status: 302,
      });
    } catch (error) {
      return new Response(null, {
        headers: {
          "Content-Type": "application/json",
          Location: await config.failureRedirect(req, error),
        },
        status: 302,
      });
    }
  };

  return [
    { method: "get", path: config.callbackPath, handler },
    { method: "post", path: config.callbackPath, handler },
  ];
};
