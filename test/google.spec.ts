import type { CollectionConfig, Config } from "payload";
import { createAuthorizeEndpoint } from "../src/authorize-endpoint";
import { defaultCallbackExtractToken } from "../src/default-callback-extract-token";
import { defaultGetToken } from "../src/default-get-token";
import { OAuth2Plugin } from "../src/plugin";
import {
  assertAuthorizeRedirect,
  createMockPayload,
  createMockPayloadRequest,
} from "./base-oauth-test";
import {
  DEFAULT_GOOGLE_MOCK_USER,
  GOOGLE_TEST_CONFIG,
  GoogleOAuthTestSuite,
  createGoogleMockFetch,
} from "./google-oauth-test";

describe("Google OAuth2 Plugin", () => {
  const testSuite = new GoogleOAuthTestSuite();

  beforeAll(() => {
    testSuite.beforeAll();
  });

  afterAll(() => {
    testSuite.afterAll();
  });

  beforeEach(() => {
    testSuite.beforeEach();
  });

  describe("Plugin Initialization", () => {
    it("should return config unchanged when plugin is disabled", () => {
      const mockConfig: Config = {
        collections: [
          {
            slug: "users",
            auth: true,
            fields: [],
          } as unknown as CollectionConfig,
        ],
      } as Config;

      const plugin = OAuth2Plugin({
        ...testSuite["getPluginOptions"](),
        enabled: false,
      });

      const result = plugin(mockConfig);
      expect(result).toEqual(mockConfig);
    });

    it("should throw error when auth collection is not found", () => {
      const mockConfig: Config = {
        collections: [
          { slug: "posts", fields: [] } as unknown as CollectionConfig,
        ],
      } as Config;

      const plugin = OAuth2Plugin({
        ...testSuite["getPluginOptions"](),
        authCollection: "users",
      });

      expect(() => plugin(mockConfig)).toThrow(
        'The collection with the slug "users" was not found.',
      );
    });

    it("should modify auth collection when plugin is enabled", () => {
      const mockConfig: Config = {
        collections: [
          {
            slug: "users",
            auth: true,
            fields: [{ name: "email", type: "email" }],
          } as unknown as CollectionConfig,
        ],
      } as Config;

      const plugin = OAuth2Plugin(testSuite["getPluginOptions"]());
      const result = plugin(mockConfig);

      const usersCollection = result.collections?.find(
        (c) => c.slug === "users",
      );
      expect(usersCollection).toBeDefined();
      expect(usersCollection?.endpoints).toBeDefined();
    });
  });

  describe("Authorize Endpoint", () => {
    it("should redirect to Google authorization URL", async () => {
      const pluginOptions = testSuite["getPluginOptions"]();
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest();

      const response = await authorizeEndpoint.handler(mockRequest);

      assertAuthorizeRedirect(response as Response, {
        client_id: GOOGLE_TEST_CONFIG.clientId,
        response_type: "code",
        scope: GOOGLE_TEST_CONFIG.scopes.join(" "),
      });
    });

    it("should not redirect Next.js RSC navigation probes", async () => {
      const pluginOptions = testSuite["getPluginOptions"]();
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest();
      mockRequest.headers.set("RSC", "1");
      mockRequest.headers.set("Next-Router-State-Tree", "[]");

      const response = await authorizeEndpoint.handler(mockRequest);

      expect((response as Response).status).toBe(204);
      expect((response as Response).headers.get("Location")).toBeNull();
    });

    it("should include state parameter when provided", async () => {
      const pluginOptions = testSuite["getPluginOptions"]();
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest("custom-state-123");

      const response = await authorizeEndpoint.handler(mockRequest);
      const location = (response as Response).headers.get("Location");
      const url = new URL(location!);

      expect(url.searchParams.get("state")).toBe("custom-state-123");
    });

    it("should use correct redirect URI", async () => {
      const pluginOptions = testSuite["getPluginOptions"]();
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest();

      const response = await authorizeEndpoint.handler(mockRequest);
      const location = (response as Response).headers.get("Location");
      const url = new URL(location!);

      expect(url.searchParams.get("redirect_uri")).toBe(
        `${GOOGLE_TEST_CONFIG.serverURL}/api/users/oauth/google/callback`,
      );
    });

    it("should include prompt parameter when configured", async () => {
      const pluginOptions = testSuite["getPluginOptionsWithOverrides"]({
        prompt: "consent",
      });
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest();

      const response = await authorizeEndpoint.handler(mockRequest);
      const location = (response as Response).headers.get("Location");
      const url = new URL(location!);

      expect(url.searchParams.get("prompt")).toBe("consent");
    });
  });

  describe("Token Retrieval", () => {
    it("should successfully retrieve access token from Google", async () => {
      const mockFetch = createGoogleMockFetch(testSuite["context"]);
      global.fetch = mockFetch;

      const token = await defaultGetToken(
        GOOGLE_TEST_CONFIG.tokenEndpoint,
        GOOGLE_TEST_CONFIG.clientId,
        GOOGLE_TEST_CONFIG.clientSecret,
        `${GOOGLE_TEST_CONFIG.serverURL}/api/users/oauth/google/callback`,
        "mock-auth-code",
      );

      expect(token).toBe("mock-google-access-token");
      expect(mockFetch).toHaveBeenCalledWith(
        GOOGLE_TEST_CONFIG.tokenEndpoint,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        }),
      );
    });

    it("should throw error when access token is missing", async () => {
      testSuite.setMockTokenResponse({
        access_token: undefined as unknown as string,
        token_type: "Bearer",
      });
      const mockFetch = createGoogleMockFetch(testSuite["context"]);
      global.fetch = mockFetch;

      await expect(
        defaultGetToken(
          GOOGLE_TEST_CONFIG.tokenEndpoint,
          GOOGLE_TEST_CONFIG.clientId,
          GOOGLE_TEST_CONFIG.clientSecret,
          `${GOOGLE_TEST_CONFIG.serverURL}/api/users/oauth/google/callback`,
          "mock-auth-code",
        ),
      ).rejects.toThrow("No access token");
    });
  });

  describe("Callback Code Extraction", () => {
    it("should extract code from GET request query params", async () => {
      const mockRequest = testSuite.createCallbackRequest("test-auth-code");
      const code = await defaultCallbackExtractToken(mockRequest);
      expect(code).toBe("test-auth-code");
    });

    it("should extract code from POST request form data", async () => {
      const mockRequest = testSuite.createPostCallbackRequest("post-auth-code");
      const code = await defaultCallbackExtractToken(mockRequest);
      expect(code).toBe("post-auth-code");
    });

    it("should throw error when code is missing in GET request", async () => {
      const mockPayload = createMockPayload();
      const mockRequest = {
        payload: mockPayload,
        headers: new Headers(),
        searchParams: new URLSearchParams(),
        query: {},
        method: "GET",
        context: {},
        user: null,
      };

      await expect(
        defaultCallbackExtractToken(mockRequest as any),
      ).rejects.toThrow("Code not found");
    });
  });

  describe("User Info Retrieval", () => {
    it("should fetch user info from Google using access token", async () => {
      const mockFetch = createGoogleMockFetch(testSuite["context"]);
      global.fetch = mockFetch;

      const pluginOptions = testSuite["getPluginOptions"]();
      const mockRequest = createMockPayloadRequest();

      const userInfo = await pluginOptions.getUserInfo(
        "mock-access-token",
        mockRequest,
      );

      expect(userInfo.email).toBe(DEFAULT_GOOGLE_MOCK_USER.email);
      expect(userInfo.sub).toBe(DEFAULT_GOOGLE_MOCK_USER.sub);
    });

    it("should include authorization header in userinfo request", async () => {
      const mockFetch = createGoogleMockFetch(testSuite["context"]);
      global.fetch = mockFetch;

      const pluginOptions = testSuite["getPluginOptions"]();
      const mockRequest = createMockPayloadRequest();

      await pluginOptions.getUserInfo("test-token-123", mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("userinfo"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        }),
      );
    });
  });

  describe("User Creation and Update", () => {
    it("should create new user when user does not exist", async () => {
      testSuite.setExistingUsers([]);

      const mockPayload = createMockPayload(testSuite["context"]);

      // Simulate user creation
      await mockPayload.create({
        collection: "users",
        data: {
          email: DEFAULT_GOOGLE_MOCK_USER.email,
          sub: DEFAULT_GOOGLE_MOCK_USER.sub,
          password: "random-password",
        },
      });

      const createdUser = testSuite.getCreatedUser();
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(DEFAULT_GOOGLE_MOCK_USER.email);
    });

    it("should update existing user when user is found", async () => {
      const existingUser = {
        id: "existing-user-id",
        email: DEFAULT_GOOGLE_MOCK_USER.email,
        sub: DEFAULT_GOOGLE_MOCK_USER.sub,
      };
      testSuite.setExistingUsers([existingUser]);

      const mockPayload = createMockPayload(testSuite["context"]);

      // Simulate user update
      await mockPayload.update({
        collection: "users",
        id: "existing-user-id",
        data: {
          email: DEFAULT_GOOGLE_MOCK_USER.email,
          sub: DEFAULT_GOOGLE_MOCK_USER.sub,
        },
      });

      const updatedUser = testSuite.getUpdatedUser();
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.id).toBe("existing-user-id");
    });

    it("should use email as identity when configured", async () => {
      const pluginOptions = testSuite["getPluginOptionsWithOverrides"]({
        useEmailAsIdentity: true,
      });

      expect(pluginOptions.useEmailAsIdentity).toBe(true);
    });

    it("should use sub field as identity when email identity is disabled", async () => {
      const pluginOptions = testSuite["getPluginOptionsWithOverrides"]({
        useEmailAsIdentity: false,
      });

      expect(pluginOptions.useEmailAsIdentity).toBe(false);
    });
  });

  describe("Redirect Handling", () => {
    it("should redirect to success URL after successful login", () => {
      const pluginOptions = testSuite["getPluginOptions"]();
      const mockRequest = createMockPayloadRequest();

      const successUrl = pluginOptions.successRedirect(
        mockRequest,
        "access-token",
      );
      expect(successUrl).toBe("/admin");
    });

    it("should redirect to failure URL on error", () => {
      const pluginOptions = testSuite["getPluginOptions"]();
      const mockRequest = createMockPayloadRequest();

      const failureUrl = pluginOptions.failureRedirect(
        mockRequest,
        new Error("Test error"),
      );
      expect(failureUrl).toBe("/admin/login");
    });
  });

  describe("PKCE Flow", () => {
    it("should include PKCE parameters when enabled", async () => {
      const pluginOptions = testSuite["getPluginOptionsWithOverrides"]({
        pkceEnabled: true,
      });
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest();

      const response = await authorizeEndpoint.handler(mockRequest);
      const location = (response as Response).headers.get("Location");
      const url = new URL(location!);

      expect(url.searchParams.get("code_challenge")).toBeTruthy();
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("should set PKCE verifier cookie when PKCE is enabled", async () => {
      const pluginOptions = testSuite["getPluginOptionsWithOverrides"]({
        pkceEnabled: true,
      });
      const authorizeEndpoint = createAuthorizeEndpoint(pluginOptions);
      const mockRequest = testSuite.createAuthorizeRequest();

      const response = await authorizeEndpoint.handler(mockRequest);
      const setCookie = (response as Response).headers.get("Set-Cookie");

      expect(setCookie).toContain("pkce_verifier");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing authorization code gracefully", async () => {
      const mockRequest = createMockPayloadRequest({
        query: {},
        method: "GET",
      });

      await expect(defaultCallbackExtractToken(mockRequest)).rejects.toThrow();
    });

    it("should handle token endpoint errors", async () => {
      const errorFetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
        }),
      );
      global.fetch = errorFetch;

      await expect(
        defaultGetToken(
          GOOGLE_TEST_CONFIG.tokenEndpoint,
          GOOGLE_TEST_CONFIG.clientId,
          GOOGLE_TEST_CONFIG.clientSecret,
          `${GOOGLE_TEST_CONFIG.serverURL}/api/users/oauth/google/callback`,
          "invalid-code",
        ),
      ).rejects.toThrow("No access token");
    });
  });
});
