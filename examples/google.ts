import { PayloadRequest } from "payload";
import { OAuth2Plugin, defaultGetToken } from "../src/index";

////////////////////////////////////////////////////////////////////////////////
// Google OAuth
////////////////////////////////////////////////////////////////////////////////
export const googleOAuth = OAuth2Plugin({
  enabled:
    typeof process.env.GOOGLE_CLIENT_ID === "string" &&
    typeof process.env.GOOGLE_CLIENT_SECRET === "string",
  strategyName: "google",
  useEmailAsIdentity: true,
  serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  authorizePath: "/oauth/google",
  callbackPath: "/oauth/google/callback",
  authCollection: "users",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  scopes: [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  providerAuthorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  getUserInfo: async (accessToken: string, req: PayloadRequest) => {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const user = await response.json();
    return { email: user.email, sub: user.sub };
  },
  /**
   * This param is optional to demonstrate how to customize your own
   * `getToken` function (i.e. add hooks to run after getting the token)
   * Leave this blank should you wish to use the default getToken function
   */
  getToken: async (code: string, req: PayloadRequest) => {
    const redirectUri = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/users/oauth/google/callback`;
    const token = await defaultGetToken(
      "https://oauth2.googleapis.com/token",
      process.env.GOOGLE_CLIENT_ID || "",
      process.env.GOOGLE_CLIENT_SECRET || "",
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
  successRedirect: (req) => {
    return "/admin";
  },
  failureRedirect: (req, err) => {
    req.payload.logger.error(err);
    return "/admin/login";
  },
});
