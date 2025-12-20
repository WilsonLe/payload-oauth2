import type { PayloadRequest } from "payload";
import type { PluginOptions } from "../src/types";
import {
  BaseOAuthTestSuite,
  MockUserInfo,
  OAuthTestContext,
} from "./base-oauth-test";

/**
 * Google OAuth test configuration
 */
export const GOOGLE_TEST_CONFIG = {
  clientId: "test-google-client-id",
  clientSecret: "test-google-client-secret",
  serverURL: "http://localhost:3000",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  providerAuthorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  userinfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
  scopes: [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
};

/**
 * Default mock user info for Google OAuth tests
 */
export const DEFAULT_GOOGLE_MOCK_USER: MockUserInfo = {
  email: "test@gmail.com",
  sub: "google-user-123456789",
  name: "Test User",
  picture: "https://example.com/photo.jpg",
  email_verified: true,
};

/**
 * Google-specific OAuth test suite
 */
export class GoogleOAuthTestSuite extends BaseOAuthTestSuite {
  protected createDefaultContext(): OAuthTestContext {
    return {
      mockUserInfo: { ...DEFAULT_GOOGLE_MOCK_USER },
      mockTokenResponse: {
        access_token: "mock-google-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "mock-google-refresh-token",
      },
      mockAuthorizationCode: "mock-google-auth-code",
      createdUser: null,
      updatedUser: null,
      foundUsers: [],
    };
  }

  protected getProviderName(): string {
    return "google";
  }

  protected getPluginOptions(): PluginOptions {
    return {
      enabled: true,
      strategyName: "google",
      useEmailAsIdentity: true,
      serverURL: GOOGLE_TEST_CONFIG.serverURL,
      clientId: GOOGLE_TEST_CONFIG.clientId,
      clientSecret: GOOGLE_TEST_CONFIG.clientSecret,
      authorizePath: "/oauth/google",
      callbackPath: "/oauth/google/callback",
      authCollection: "users",
      tokenEndpoint: GOOGLE_TEST_CONFIG.tokenEndpoint,
      scopes: GOOGLE_TEST_CONFIG.scopes,
      providerAuthorizationUrl: GOOGLE_TEST_CONFIG.providerAuthorizationUrl,
      getUserInfo: async (accessToken: string, _req: PayloadRequest) => {
        // In real tests, this would call fetch which is mocked
        const response = await fetch(GOOGLE_TEST_CONFIG.userinfoEndpoint, {
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
 * Creates Google-specific mock fetch that simulates Google OAuth endpoints
 */
export function createGoogleMockFetch(context: OAuthTestContext) {
  return jest
    .fn()
    .mockImplementation(async (url: string, options?: RequestInit) => {
      // Mock Google token endpoint
      if (url.includes("oauth2.googleapis.com/token")) {
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

      // Mock Google userinfo endpoint
      if (url.includes("googleapis.com/oauth2/v3/userinfo")) {
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
