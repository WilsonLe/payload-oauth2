import type { PayloadRequest } from "payload";
import type { PluginOptions } from "../src/types";

export type OAuthProviderTestCase = {
  name: string;
  strategyName: string;
  serverURL: string;
  clientId: string;
  clientSecret: string;
  authorizePath: string;
  callbackPath: string;
  callbackMethod: "GET" | "POST";
  tokenEndpoint: string;
  providerAuthorizationUrl: string;
  scopes: string[];
  responseMode?: string;
  tokenResponse: Record<string, unknown>;
  userInfo: Record<string, unknown>;
  userInfoEndpoint?: string;
  groupsEndpoint?: string;
  groupsResponse?: Record<string, unknown>;
  createGetToken?: (
    provider: OAuthProviderTestCase,
  ) => PluginOptions["getToken"];
  createGetUserInfo: (
    provider: OAuthProviderTestCase,
  ) => PluginOptions["getUserInfo"];
};

const createUnsignedJwt = (payload: Record<string, unknown>) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
};

const googleUserInfo = {
  email: "google-user@example.com",
  sub: "google-user-123",
  name: "Google User",
  email_verified: true,
};

const zitadelUserInfo = {
  email: "zitadel-user@example.com",
  sub: "zitadel-user-123",
  preferred_username: "zitadel-user",
  email_verified: true,
};

const appleUserInfo = {
  email: "apple-user@example.com",
  sub: "apple-user-123",
  given_name: "Apple",
  family_name: "User",
};

const microsoftUserInfo = {
  id: "microsoft-user-123",
  mail: "microsoft-user@example.com",
  displayName: "Microsoft User",
};

const assertOkResponse = async (response: Response, label: string) => {
  if (!response.ok) {
    throw new Error(`${label} failed: ${await response.text()}`);
  }
};

export const oauthProviderTestCases: OAuthProviderTestCase[] = [
  {
    name: "Google",
    strategyName: "google",
    serverURL: "http://localhost:3000",
    clientId: "test-google-client-id",
    clientSecret: "test-google-client-secret",
    authorizePath: "/oauth/google",
    callbackPath: "/oauth/google/callback",
    callbackMethod: "GET",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    providerAuthorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    tokenResponse: {
      access_token: "mock-google-access-token",
      token_type: "Bearer",
      expires_in: 3600,
    },
    userInfo: googleUserInfo,
    userInfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
    createGetUserInfo: (provider) => async (accessToken: string) => {
      const response = await fetch(provider.userInfoEndpoint!, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await assertOkResponse(response, "Google userinfo");
      const user = await response.json();
      return { email: user.email, sub: user.sub, name: user.name };
    },
  },
  {
    name: "Zitadel",
    strategyName: "zitadel",
    serverURL: "http://localhost:3000",
    clientId: "test-zitadel-client-id",
    clientSecret: "test-zitadel-client-secret",
    authorizePath: "/oauth/zitadel",
    callbackPath: "/oauth/zitadel/callback",
    callbackMethod: "GET",
    tokenEndpoint: "https://test.zitadel.cloud/oauth/v2/token",
    providerAuthorizationUrl: "https://test.zitadel.cloud/oauth/v2/authorize",
    scopes: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "urn:zitadel:iam:user:metadata",
    ],
    tokenResponse: {
      access_token: "mock-zitadel-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: "mock-zitadel-id-token",
    },
    userInfo: zitadelUserInfo,
    userInfoEndpoint: "https://test.zitadel.cloud/oidc/v1/userinfo",
    createGetUserInfo: (provider) => async (accessToken: string) => {
      const response = await fetch(provider.userInfoEndpoint!, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await assertOkResponse(response, "Zitadel userinfo");
      const user = await response.json();
      return { email: user.email, sub: user.sub };
    },
  },
  {
    name: "Apple",
    strategyName: "apple",
    serverURL: "http://localhost:3000",
    clientId: "test.apple.client",
    clientSecret: "test-apple-client-secret",
    authorizePath: "/oauth/apple",
    callbackPath: "/oauth/apple/callback",
    callbackMethod: "POST",
    tokenEndpoint: "https://appleid.apple.com/auth/token",
    providerAuthorizationUrl: "https://appleid.apple.com/auth/authorize",
    scopes: ["name", "email"],
    responseMode: "form_post",
    tokenResponse: {
      id_token: createUnsignedJwt(appleUserInfo),
      token_type: "Bearer",
      expires_in: 3600,
    },
    userInfo: {
      email: appleUserInfo.email,
      sub: appleUserInfo.sub,
      firstName: appleUserInfo.given_name,
      lastName: appleUserInfo.family_name,
    },
    createGetToken: (provider) => async (code: string) => {
      const response = await fetch(provider.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${provider.serverURL}/api/users${provider.callbackPath}`,
        }).toString(),
      });
      await assertOkResponse(response, "Apple token exchange");
      const tokenResponse = await response.json();
      if (typeof tokenResponse.id_token !== "string") {
        throw new Error(`No id token: ${JSON.stringify(tokenResponse)}`);
      }
      return tokenResponse.id_token;
    },
    createGetUserInfo: () => async (idToken: string, req: PayloadRequest) => {
      const tokenParts = idToken.split(".");
      if (tokenParts.length !== 3) throw new Error("Invalid ID token format");
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], "base64").toString(),
      );
      if (!payload.email) throw new Error("No email found in payload");
      return {
        email: payload.email,
        sub: payload.sub,
        firstName: payload.given_name || "",
        lastName: payload.family_name || "",
      };
    },
  },
  {
    name: "Microsoft Entra ID",
    strategyName: "microsoft-entra-id",
    serverURL: "http://localhost:3000",
    clientId: "test-microsoft-client-id",
    clientSecret: "test-microsoft-client-secret",
    authorizePath: "/oauth/microsoft-entra-id",
    callbackPath: "/oauth/microsoft-entra-id/callback",
    callbackMethod: "GET",
    tokenEndpoint:
      "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token",
    providerAuthorizationUrl:
      "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize",
    scopes: ["openid", "email", "profile", "offline_access", "User.Read"],
    tokenResponse: {
      access_token: "mock-microsoft-access-token",
      token_type: "Bearer",
      expires_in: 3600,
    },
    userInfo: {
      email: microsoftUserInfo.mail,
      sub: microsoftUserInfo.id,
      name: microsoftUserInfo.displayName,
    },
    userInfoEndpoint: "https://graph.microsoft.com/v1.0/me",
    groupsEndpoint: "https://graph.microsoft.com/v1.0/me/memberOf",
    groupsResponse: { value: [{ id: "administrator-group-id" }] },
    createGetUserInfo: (provider) => async (accessToken: string) => {
      const userInfoResponse = await fetch(provider.userInfoEndpoint!, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await assertOkResponse(userInfoResponse, "Microsoft Graph userinfo");
      const groupsResponse = await fetch(provider.groupsEndpoint!, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await assertOkResponse(groupsResponse, "Microsoft Graph groups");
      const user = await userInfoResponse.json();
      return { email: user.mail, sub: user.id, name: user.displayName };
    },
  },
];

export const createProviderPluginOptions = (
  provider: OAuthProviderTestCase,
  overrides: Partial<PluginOptions> = {},
): PluginOptions => ({
  enabled: true,
  strategyName: provider.strategyName,
  useEmailAsIdentity: true,
  serverURL: provider.serverURL,
  clientId: provider.clientId,
  clientSecret: provider.clientSecret,
  authorizePath: provider.authorizePath,
  callbackPath: provider.callbackPath,
  authCollection: "users",
  tokenEndpoint: provider.tokenEndpoint,
  scopes: provider.scopes,
  providerAuthorizationUrl: provider.providerAuthorizationUrl,
  responseMode: provider.responseMode,
  getToken: provider.createGetToken?.(provider),
  getUserInfo: provider.createGetUserInfo(provider),
  successRedirect: () => `/admin/${provider.strategyName}`,
  failureRedirect: (_req, error) =>
    `/admin/login?provider=${provider.strategyName}&error=${encodeURIComponent(
      error instanceof Error ? error.message : String(error),
    )}`,
  ...overrides,
});

export const createMockExternalFetch = (provider: OAuthProviderTestCase) =>
  jest.fn(async (url: string | URL | Request, options?: RequestInit) => {
    const requestUrl = String(url);

    if (requestUrl === provider.tokenEndpoint) {
      return jsonResponse(provider.tokenResponse);
    }

    if (provider.userInfoEndpoint && requestUrl === provider.userInfoEndpoint) {
      return jsonResponse(
        provider.strategyName === "microsoft-entra-id"
          ? microsoftUserInfo
          : provider.userInfo,
      );
    }

    if (provider.groupsEndpoint && requestUrl === provider.groupsEndpoint) {
      return jsonResponse(provider.groupsResponse ?? { value: [] });
    }

    return jsonResponse({ error: "not_found", url: requestUrl, options }, 404);
  });

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
