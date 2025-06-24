import { PayloadRequest } from "payload";
import { OAuth2Plugin } from "../src/index";
/**
To setup Apple OAuth, refer to official documentation:
https://developer.apple.com/sign-in-with-apple/get-started/

However, the process is quite complex and requires several steps, so here's a quick start guide:

To setup Apple OAuth in Payload CMS, you need the following 4 values:
1. APPLE_CLIENT_ID: Your Service ID from the Apple Developer portal (e.g. com.example.myapp)
2. APPLE_CLIENT_SECRET: Your client secret, which is a JWT signed with your private key. This requires value 3 and 4 to generate:
3. APPLE_KEY_ID: The Key ID from the Apple Developer portal
4. APPLE_TEAM_ID: Your Apple Developer Team ID, which can be found in the Apple Developer portal.

Prerequisites: Have a valid Apple Developer account and access to the Apple Developer portal.

1. Create an App ID in the Apple Developer portal
  - Quick links: https://developer.apple.com/account/resources/identifiers/bundleId/add/bundle
  - Step by step instruction:
    > https://developer.apple.com/account
    > Certificates, IDs & Profiles
    > Identifiers
    > Create new identifiders
    > Select App IDs
    > Select App
    > Arbitrary description, explicit bundle ID (e.g. com.example.myapp)
    > Capabilities: Enable Sign In with Apple > Save (ignore Server-to-Server Notification Endpoint)
    > Continue/Register
2. Create a service ID in the Apple Developer portal
  - Quick links: https://developer.apple.com/account/resources/identifiers/serviceId/add
  - Step by step instruction:
    > https://developer.apple.com/account
    > Certificates, IDs & Profiles
    > Identifiers
    > Create new identifiders
    > Select Service IDs
    > Arbitrary description, identifier (e.g. com.example.myapp.si) - IMPORTANT, I have found that this must be a subdomain of your app's bundle ID, notice the ".si" suffix.
    > Continue/Register
    > Value (1) APPLE_CLIENT_ID should be the identifier you just created (e.g. com.example.myapp.si)
3. Create a new key in the Apple Developer portal
  - Quick links: https://developer.apple.com/account/resources/authkeys/add
  - Step by step instruction:
    > https://developer.apple.com/account
    > Certificates, IDs & Profiles
    > Keys
    > Create new key
    > Arbitrary key name and key usage description.
    > Enable Sign In with Apple
    > Configure
    > Select the App ID you created in step 1
    > Continue/Register
    > Download the key file, which is a .p8 file. This file contains your private key.
    > Value (3) APPLE_KEY_ID is the Key ID from the key you just created.
4. Obtain your Apple Developer Team ID
    > https://developer.apple.com/account
    > Membership details
    > Your Team ID is listed there, this should be value (4) APPLE_TEAM_ID.
5. Based on value (3) APPLE_KEY_ID, value (4) APPLE_TEAM_ID and the private key file you downloaded in step 3, generate value (2) APPLE_CLIENT_SECRET by running:
```sh
pnpm payload-oauth2:generate-apple-client-secret --team-id 4659F6UUC3 --client-id com.example.app.sso --key-id XXXXXXXXXX --private-key-path AuthKey_XXXXXXXXXX.p8
```

In the example below:
- `process.env.APPLE_CLIENT_ID` is (1) APPLE_CLIENT_ID
- `process.env.APPLE_CLIENT_SECRET` is (2) APPLE_CLIENT_SECRET,

Dev Note:
- I consistently got an `invalid_client` error when redirecting to `https://appleid.apple.com/auth/authorize`. I noticed that newly generated keys took 2 days for it to go into effect. After waiting for 2 days, the error went away.
- For web, I noticed that service id works if it is a subdomain of the app's bundle id. For example, if your app's bundle id is `com.example.myapp`, then your service id must be something like `com.example.myapp.sso`. I tried to use a service id that is not a subdomain of the app's bundle id, I got an `invalid_client` error when redirecting to `https://appleid.apple.com/auth/authorize`.
 */

////////////////////////////////////////////////////////////////////////////////
// Apple OAuth
////////////////////////////////////////////////////////////////////////////////

export const appleOAuth = OAuth2Plugin({
  enabled:
    typeof process.env.APPLE_CLIENT_ID === "string" &&
    typeof process.env.APPLE_TEAM_ID === "string" &&
    typeof process.env.APPLE_KEY_ID === "string" &&
    (typeof process.env.APPLE_CLIENT_SECRET === "string" ||
      typeof process.env.APPLE_CLIENT_AUTH_KEY_CONTENT === "string"),
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
  successRedirect: (req: PayloadRequest, token?: string) => {
    return "/admin";
  },
  failureRedirect: (req, err) => {
    req.payload.logger.error(err);
    return `/admin/login?error=${JSON.stringify(err)}`;
  },
});
