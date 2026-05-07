import dotenv from "dotenv";
import type { PayloadRequest } from "payload";
import { createCallbackEndpoint } from "../src/callback-endpoint";
import { defaultGetToken } from "../src/default-get-token";
import type { PluginOptions } from "../src/types";
import {
  createMockOAuthTestContext,
  createMockPayload,
} from "./base-oauth-test";

dotenv.config({ path: ".env" });
dotenv.config({ path: "../.env" });

type LiveProviderCase = {
  name: string;
  strategyName: string;
  callbackMethod: "GET" | "POST";
  authCodeEnv: string;
  requiredEnv: string[];
  createPluginOptions: () => PluginOptions;
};

const env = (name: string) => process.env[name] || "";
const serverURL = (prefix: string) =>
  env(`LIVE_${prefix}_SERVER_URL`) ||
  env("NEXT_PUBLIC_URL") ||
  "http://localhost:3000";

const decodeJwtPayload = (token: string) => {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) throw new Error("Invalid ID token format");
  return JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
};

const liveProviderCases: LiveProviderCase[] = [
  {
    name: "Google",
    strategyName: "google",
    callbackMethod: "GET",
    authCodeEnv: "LIVE_GOOGLE_AUTH_CODE",
    requiredEnv: [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "LIVE_GOOGLE_AUTH_CODE",
    ],
    createPluginOptions: () => ({
      enabled: true,
      strategyName: "google",
      useEmailAsIdentity: true,
      serverURL: serverURL("GOOGLE"),
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
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
      getUserInfo: async (accessToken: string) => {
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!response.ok) throw new Error(await response.text());
        const user = await response.json();
        return { email: user.email, sub: user.sub, name: user.name };
      },
      successRedirect: () => "/admin/google",
      failureRedirect: (_req, error) => {
        throw error instanceof Error ? error : new Error(String(error));
      },
    }),
  },
  {
    name: "Zitadel",
    strategyName: "zitadel",
    callbackMethod: "GET",
    authCodeEnv: "LIVE_ZITADEL_AUTH_CODE",
    requiredEnv: [
      "ZITADEL_CLIENT_ID",
      "ZITADEL_CLIENT_SECRET",
      "ZITADEL_TOKEN_ENDPOINT",
      "ZITADEL_AUTHORIZATION_URL",
      "ZITADEL_USERINFO_ENDPOINT",
      "LIVE_ZITADEL_AUTH_CODE",
    ],
    createPluginOptions: () => ({
      enabled: true,
      strategyName: "zitadel",
      useEmailAsIdentity: true,
      serverURL: serverURL("ZITADEL"),
      clientId: env("ZITADEL_CLIENT_ID"),
      clientSecret: env("ZITADEL_CLIENT_SECRET"),
      authorizePath: "/oauth/zitadel",
      callbackPath: "/oauth/zitadel/callback",
      authCollection: "users",
      tokenEndpoint: env("ZITADEL_TOKEN_ENDPOINT"),
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "urn:zitadel:iam:user:metadata",
      ],
      providerAuthorizationUrl: env("ZITADEL_AUTHORIZATION_URL"),
      getUserInfo: async (accessToken: string) => {
        const response = await fetch(env("ZITADEL_USERINFO_ENDPOINT"), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error(await response.text());
        const user = await response.json();
        return { email: user.email, sub: user.sub };
      },
      successRedirect: () => "/admin/zitadel",
      failureRedirect: (_req, error) => {
        throw error instanceof Error ? error : new Error(String(error));
      },
    }),
  },
  {
    name: "Apple",
    strategyName: "apple",
    callbackMethod: "POST",
    authCodeEnv: "LIVE_APPLE_AUTH_CODE",
    requiredEnv: [
      "APPLE_CLIENT_ID",
      "APPLE_CLIENT_SECRET",
      "LIVE_APPLE_AUTH_CODE",
    ],
    createPluginOptions: () => {
      const providerServerURL = serverURL("APPLE");
      return {
        enabled: true,
        strategyName: "apple",
        useEmailAsIdentity: true,
        serverURL: providerServerURL,
        clientId: env("APPLE_CLIENT_ID"),
        clientSecret: env("APPLE_CLIENT_SECRET"),
        authorizePath: "/oauth/apple",
        callbackPath: "/oauth/apple/callback",
        authCollection: "users",
        tokenEndpoint: "https://appleid.apple.com/auth/token",
        scopes: ["name", "email"],
        providerAuthorizationUrl: "https://appleid.apple.com/auth/authorize",
        responseMode: "form_post",
        getToken: async (code: string) => {
          const response = await fetch("https://appleid.apple.com/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: env("APPLE_CLIENT_ID"),
              client_secret: env("APPLE_CLIENT_SECRET"),
              code,
              grant_type: "authorization_code",
              redirect_uri: `${providerServerURL}/api/users/oauth/apple/callback`,
            }).toString(),
          });
          const tokenResponse = await response.json();
          if (typeof tokenResponse.id_token !== "string") {
            throw new Error(`No id token: ${JSON.stringify(tokenResponse)}`);
          }
          return tokenResponse.id_token;
        },
        getUserInfo: async (idToken: string) => {
          const payload = decodeJwtPayload(idToken);
          return {
            email: payload.email,
            sub: payload.sub,
            firstName: payload.given_name || "",
            lastName: payload.family_name || "",
          };
        },
        successRedirect: () => "/admin/apple",
        failureRedirect: (_req, error) => {
          throw error instanceof Error ? error : new Error(String(error));
        },
      };
    },
  },
  {
    name: "Microsoft Entra ID",
    strategyName: "microsoft-entra-id",
    callbackMethod: "GET",
    authCodeEnv: "LIVE_MICROSOFT_ENTRA_ID_AUTH_CODE",
    requiredEnv: [
      "MICROSOFT_ENTRA_ID_CLIENT_ID",
      "MICROSOFT_ENTRA_ID_CLIENT_SECRET",
      "MICROSOFT_ENTRA_ID_TENANT_ID",
      "LIVE_MICROSOFT_ENTRA_ID_AUTH_CODE",
    ],
    createPluginOptions: () => {
      const tenantId = env("MICROSOFT_ENTRA_ID_TENANT_ID");
      const providerServerURL = serverURL("MICROSOFT_ENTRA_ID");
      const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      return {
        enabled: true,
        strategyName: "microsoft-entra-id",
        useEmailAsIdentity: true,
        serverURL: providerServerURL,
        clientId: env("MICROSOFT_ENTRA_ID_CLIENT_ID"),
        clientSecret: env("MICROSOFT_ENTRA_ID_CLIENT_SECRET"),
        authorizePath: "/oauth/microsoft-entra-id",
        callbackPath: "/oauth/microsoft-entra-id/callback",
        authCollection: "users",
        tokenEndpoint,
        scopes: ["openid", "email", "profile", "offline_access", "User.Read"],
        providerAuthorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        getToken: (code: string, req: PayloadRequest) =>
          defaultGetToken(
            tokenEndpoint,
            env("MICROSOFT_ENTRA_ID_CLIENT_ID"),
            env("MICROSOFT_ENTRA_ID_CLIENT_SECRET"),
            `${providerServerURL}/api/users/oauth/microsoft-entra-id/callback`,
            code,
            false,
            req,
          ),
        getUserInfo: async (accessToken: string) => {
          const response = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) throw new Error(await response.text());
          const user = await response.json();
          return {
            email: user.mail || user.userPrincipalName,
            sub: user.id,
            name: user.displayName,
          };
        },
        successRedirect: () => "/admin/microsoft-entra-id",
        failureRedirect: (_req, error) => {
          throw error instanceof Error ? error : new Error(String(error));
        },
      };
    },
  },
];

const createLiveCallbackRequest = (
  provider: LiveProviderCase,
): PayloadRequest => {
  const code = env(provider.authCodeEnv);
  const payload = createMockPayload(createMockOAuthTestContext());

  if (provider.callbackMethod === "POST") {
    return {
      payload,
      headers: new Headers({
        "content-type": "application/x-www-form-urlencoded",
      }),
      searchParams: new URLSearchParams(),
      query: {},
      method: "POST",
      context: {},
      user: null,
      text: async () => `code=${encodeURIComponent(code)}`,
    } as unknown as PayloadRequest;
  }

  return {
    payload,
    headers: new Headers(),
    searchParams: new URLSearchParams({ code }),
    query: { code },
    method: "GET",
    context: {},
    user: null,
  } as unknown as PayloadRequest;
};

const runLiveTests = process.env.RUN_LIVE_OAUTH_TESTS === "true";

describe("Live external provider integration", () => {
  for (const provider of liveProviderCases) {
    const missingEnv = provider.requiredEnv.filter((name) => !env(name));
    const testLiveProvider =
      runLiveTests && missingEnv.length === 0 ? it : it.skip;

    testLiveProvider(
      `${provider.name} exchanges a live authorization code and logs in through callback flow`,
      async () => {
        const pluginOptions = provider.createPluginOptions();
        const endpoint = createCallbackEndpoint(pluginOptions).find(
          (candidate) =>
            candidate.method === provider.callbackMethod.toLowerCase(),
        );
        if (!endpoint) throw new Error("callback endpoint not found");

        const req = createLiveCallbackRequest(provider);
        const response = (await endpoint.handler(req)) as Response;

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `/admin/${provider.strategyName}`,
        );
        expect(response.headers.get("Set-Cookie")).toContain("payload-token=");
        expect(req.payload.create).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: "users",
            data: expect.objectContaining({
              email: expect.any(String),
              sub: expect.any(String),
              collection: "users",
            }),
          }),
        );
      },
      30000,
    );
  }
});
