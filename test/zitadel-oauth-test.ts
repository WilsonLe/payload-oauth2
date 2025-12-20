import type { PayloadRequest } from "payload";
import type { PluginOptions } from "../src/types";
import {
  BaseOAuthTestSuite,
  MockUserInfo,
  OAuthTestContext,
} from "./base-oauth-test";

/**
 * Zitadel OAuth test configuration
 */
export const ZITADEL_TEST_CONFIG = {
  clientId: "test-zitadel-client-id",
  clientSecret: "test-zitadel-client-secret",
  serverURL: "http://localhost:3000",
  tokenEndpoint: "https://test.zitadel.cloud/oauth/v2/token",
  providerAuthorizationUrl: "https://test.zitadel.cloud/oauth/v2/authorize",
  userinfoEndpoint: "https://test.zitadel.cloud/oidc/v1/userinfo",
  scopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "urn:zitadel:iam:user:metadata",
  ],
};

/**
 * Default mock user info for Zitadel OAuth tests
 */
export const DEFAULT_ZITADEL_MOCK_USER: MockUserInfo = {
  email: "test@zitadel-org.com",
  sub: "zitadel-user-123456789",
  name: "Test Zitadel User",
  preferred_username: "testuser",
  email_verified: true,
};

/**
 * Zitadel-specific OAuth test suite
 */
export class ZitadelOAuthTestSuite extends BaseOAuthTestSuite {
  protected createDefaultContext(): OAuthTestContext {
    return {
      mockUserInfo: { ...DEFAULT_ZITADEL_MOCK_USER },
      mockTokenResponse: {
        access_token: "mock-zitadel-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "mock-zitadel-refresh-token",
        id_token: "mock-zitadel-id-token",
      },
      mockAuthorizationCode: "mock-zitadel-auth-code",
      createdUser: null,
      updatedUser: null,
      foundUsers: [],
    };
  }

  protected getProviderName(): string {
    return "zitadel";
  }

  protected getPluginOptions(): PluginOptions {
    return {
      enabled: true,
      strategyName: "zitadel",
      useEmailAsIdentity: true,
      serverURL: ZITADEL_TEST_CONFIG.serverURL,
      clientId: ZITADEL_TEST_CONFIG.clientId,
      clientSecret: ZITADEL_TEST_CONFIG.clientSecret,
      authorizePath: "/oauth/zitadel",
      callbackPath: "/oauth/zitadel/callback",
      authCollection: "users",
      tokenEndpoint: ZITADEL_TEST_CONFIG.tokenEndpoint,
      scopes: ZITADEL_TEST_CONFIG.scopes,
      providerAuthorizationUrl: ZITADEL_TEST_CONFIG.providerAuthorizationUrl,
      getUserInfo: async (accessToken: string, _req: PayloadRequest) => {
        // In real tests, this would call fetch which is mocked
        const response = await fetch(ZITADEL_TEST_CONFIG.userinfoEndpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = await response.json();
        return { email: user.email, sub: user.sub };
      },
      successRedirect: (_req: PayloadRequest, _accessToken?: string) => {
        return "/admin";
      },
      failureRedirect: (_req: PayloadRequest, _err?: unknown) => {
        return "/admin/login";
      },
    };
  }

  /**
   * Get plugin options with custom overrides
   */
  getPluginOptionsWithOverrides(
    overrides: Partial<PluginOptions>,
  ): PluginOptions {
    return {
      ...this.getPluginOptions(),
      ...overrides,
    };
  }
}

/**
 * Creates Zitadel-specific mock fetch that simulates Zitadel OAuth endpoints
 */
export function createZitadelMockFetch(context: OAuthTestContext) {
  return jest
    .fn()
    .mockImplementation(async (url: string, options?: RequestInit) => {
      // Mock Zitadel token endpoint
      if (url.includes("zitadel.cloud/oauth/v2/token")) {
        // Verify the request includes required parameters
        if (options?.method === "POST" && options?.body) {
          const body = options.body.toString();
          if (!body.includes("code=") || !body.includes("client_id=")) {
            return new Response(JSON.stringify({ error: "invalid_request" }), {
              status: 400,
            });
          }
        }
        return new Response(JSON.stringify(context.mockTokenResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Mock Zitadel userinfo endpoint
      if (url.includes("zitadel.cloud/oidc/v1/userinfo")) {
        const authHeader = (options?.headers as Record<string, string>)
          ?.Authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
          });
        }
        return new Response(JSON.stringify(context.mockUserInfo), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default 404 for unknown endpoints
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
}
