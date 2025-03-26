import { PayloadRequest } from "payload";
import { OAuth2Plugin, defaultGetToken } from "../src/index";

////////////////////////////////////////////////////////////////////////////////
// Keycloak OAuth
////////////////////////////////////////////////////////////////////////////////
export const keycloakOAuth = OAuth2Plugin({
  enabled:
    typeof process.env.KEYCLOAK_CLIENT_ID === "string" &&
    typeof process.env.KEYCLOAK_CLIENT_SECRET === "string" &&
    typeof process.env.KEYCLOAK_TOKEN_ENDPOINT === "string" &&
    typeof process.env.KEYCLOAK_AUTHORIZATION_URL === "string" &&
    typeof process.env.KEYCLOAK_USERINFO_ENDPOINT === "string",
  strategyName: "keycloak",
  useEmailAsIdentity: true,
  serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  clientId: process.env.KEYCLOAK_CLIENT_ID || "",
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
  authorizePath: "/oauth/keycloak",
  callbackPath: "/oauth/keycloak/callback",
  authCollection: "users",
  tokenEndpoint: process.env.KEYCLOAK_TOKEN_ENDPOINT || "",
  scopes: ["openid", "profile", "email", "roles", "offline_access"],
  providerAuthorizationUrl: process.env.KEYCLOAK_AUTHORIZATION_URL || "",
  getUserInfo: async (accessToken: string, req: PayloadRequest) => {
    const response = await fetch(process.env.KEYCLOAK_USERINFO_ENDPOINT || "", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await response.json();
    return { email: user.email, sub: user.sub };
  },
  /**
   * This param is optional to demonstrate how to customize your own
   * `getToken` function (i.e. add hooks to run after getting the token)
   * Leave this blank should you wish to use the default getToken function
   */
  getToken: async (code: string, req: PayloadRequest) => {
    const redirectUri = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/users/oauth/keycloak/callback`;
    const token = await defaultGetToken(
      process.env.KEYCLOAK_TOKEN_ENDPOINT || "",
      process.env.KEYCLOAK_CLIENT_ID || "",
      process.env.KEYCLOAK_CLIENT_SECRET || "",
      redirectUri,
      code,
    );
    ////////////////////////////////////////////////////////////////////////////
    // Consider this section afterToken hook
    ////////////////////////////////////////////////////////////////////////////
    req.payload.logger.info("Received token: ${token} 👀");
    if (req.user) {
      req.payload.update({
        collection: "users",
        id: req.user.id,
        data: {},
      });
    }

    return token;
  },
  successRedirect: (req: PayloadRequest, token?: string) => {
    return "/admin";
  },
  failureRedirect: (req, err) => {
    req.payload.logger.error(err);
    return "/admin/login";
  },
});
