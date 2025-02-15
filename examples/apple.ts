import { PayloadRequest } from "payload";
import { OAuth2Plugin } from "../src/index";

////////////////////////////////////////////////////////////////////////////////
// Apple OAuth
////////////////////////////////////////////////////////////////////////////////
export const appleOAuth = OAuth2Plugin({
  enabled:
    typeof process.env.APPLE_CLIENT_ID === "string" &&
    typeof process.env.APPLE_CLIENT_SECRET === "string",
  strategyName: "apple",
  useEmailAsIdentity: true,
  serverURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  clientId: process.env.APPLE_CLIENT_ID || "",
  clientSecret: process.env.APPLE_CLIENT_SECRET || "",
  authorizePath: "/oauth/apple",
  callbackPath: "/oauth/apple/callback",
  authCollection: "users",
  tokenEndpoint: "https://appleid.apple.com/auth/token",
  scopes: ["name", "email"],
  providerAuthorizationUrl: "https://appleid.apple.com/auth/authorize",
  // Required for Apple OAuth when requesting name or email scopes
  responseMode: "form_post",
  getUserInfo: async (accessToken: string, req: PayloadRequest) => {
    try {
      // For Apple, the ID token is a JWT that contains user info
      const tokenParts = accessToken.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Invalid ID token format");
      }

      // Decode the base64 payload
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], "base64").toString(),
      );

      if (!payload.email) {
        throw new Error("No email found in payload");
      }

      return {
        email: payload.email,
        sub: payload.sub,
        // Apple provides name only on first login
        firstName: payload.given_name || "",
        lastName: payload.family_name || "",
      };
    } catch (error) {
      req.payload.logger.error("Error parsing Apple token:", error);
      throw error;
    }
  },
  getToken: async (code: string, req: PayloadRequest) => {
    try {
      const redirectUri = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/users/oauth/apple/callback`;

      // Make the token exchange request
      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID || "",
        client_secret: process.env.APPLE_CLIENT_SECRET || "",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      const response = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokenResponse = await response.json();

      // Return the id_token which contains the user info
      return tokenResponse.id_token;
    } catch (error) {
      req.payload.logger.error("Error in getToken:", error);
      throw error;
    }
  },
  successRedirect: (req) => {
    // Check user roles to determine redirect
    const user = req.user;
    if (user && Array.isArray(user.roles)) {
      if (user.roles.includes("admin")) {
        return "/admin";
      }
    }
    return "/"; // Default redirect for customers
  },
  failureRedirect: (req, err) => {
    req.payload.logger.error(err);
    return "/login?error=apple-auth-failed";
  },
});
