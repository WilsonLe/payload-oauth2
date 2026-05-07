import type {
  CollectionConfig,
  Payload,
  PayloadRequest,
  SanitizedConfig,
} from "payload";
import type { PluginOptions } from "../src/types";

/**
 * Mock user data interface for testing
 */
export interface MockUserInfo {
  id?: string;
  email: string;
  sub: string;
  [key: string]: unknown;
}

/**
 * Mock token response from OAuth provider
 */
export interface MockTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
}

/**
 * Test context that stores state across test lifecycle
 */
export interface OAuthTestContext {
  mockUserInfo: MockUserInfo;
  mockTokenResponse: MockTokenResponse;
  mockAuthorizationCode: string;
  createdUser: MockUserInfo | null;
  updatedUser: MockUserInfo | null;
  foundUsers: MockUserInfo[];
}

/**
 * Creates a mock PayloadRequest for testing
 */
export function createMockPayloadRequest(
  overrides: Partial<PayloadRequest> = {},
): PayloadRequest {
  const mockPayload = createMockPayload();

  const baseRequest: Partial<PayloadRequest> = {
    payload: mockPayload,
    headers: new Headers(),
    searchParams: new URLSearchParams(),
    query: {},
    method: "GET",
    context: {},
    user: null,
    ...overrides,
  };

  return baseRequest as PayloadRequest;
}

/**
 * Creates a mock Payload instance for testing
 */
export function createMockPayload(context?: OAuthTestContext): Payload {
  const mockCollections: Record<string, { config: CollectionConfig }> = {
    users: {
      config: {
        slug: "users",
        auth: { tokenExpiration: 7200 },
        fields: [
          { name: "email", type: "email" },
          { name: "sub", type: "text" },
        ],
        hooks: {
          beforeLogin: [],
          afterLogin: [],
        },
      } as unknown as CollectionConfig,
    },
  };

  const mockPayload: Partial<Payload> & { secret: string } = {
    collections: mockCollections as unknown as Payload["collections"],
    config: {
      cookiePrefix: "payload",
      secret: "test-secret-key-for-jwt-signing-12345",
    } as SanitizedConfig,
    secret: "test-secret-key-for-jwt-signing-12345",
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Payload["logger"],
    find: jest.fn().mockImplementation(async ({ where }) => {
      if (context) {
        return {
          docs: context.foundUsers,
          totalDocs: context.foundUsers.length,
          limit: 1,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        };
      }
      return {
        docs: [],
        totalDocs: 0,
        limit: 1,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      };
    }),
    create: jest.fn().mockImplementation(async ({ data }) => {
      const newUser = { id: "new-user-id", ...data };
      if (context) {
        context.createdUser = newUser;
      }
      return newUser;
    }),
    update: jest.fn().mockImplementation(async ({ id, data }) => {
      const updatedUser = { id, ...data };
      if (context) {
        context.updatedUser = updatedUser;
      }
      return updatedUser;
    }),
  };

  return mockPayload as Payload;
}

/**
 * Creates a default mutable OAuth test context.
 */
export function createMockOAuthTestContext(
  overrides: Partial<OAuthTestContext> = {},
): OAuthTestContext {
  return {
    mockUserInfo: {
      email: "test@example.com",
      sub: "provider-user-123",
    },
    mockTokenResponse: {
      access_token: "mock-access-token",
      token_type: "Bearer",
    },
    mockAuthorizationCode: "mock-auth-code",
    createdUser: null,
    updatedUser: null,
    foundUsers: [],
    ...overrides,
  };
}

/**
 * Creates a mock fetch function for OAuth provider endpoints
 */
export function createMockFetch(context: OAuthTestContext) {
  return jest
    .fn()
    .mockImplementation(async (url: string, options?: RequestInit) => {
      // Mock token endpoint response
      if (url.includes("/token") || url.includes("/oauth2/")) {
        return new Response(JSON.stringify(context.mockTokenResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Mock userinfo endpoint response
      if (url.includes("/userinfo")) {
        return new Response(JSON.stringify(context.mockUserInfo), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default response
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
}

/**
 * Base class for OAuth plugin tests
 * Provides common setup, teardown, and utility methods
 */
export abstract class BaseOAuthTestSuite {
  protected context: OAuthTestContext;
  protected originalFetch: typeof global.fetch;

  constructor() {
    this.context = this.createDefaultContext();
    this.originalFetch = global.fetch;
  }

  /**
   * Override to provide provider-specific default context
   */
  protected abstract createDefaultContext(): OAuthTestContext;

  /**
   * Override to provide provider-specific plugin options
   */
  protected abstract getPluginOptions(): PluginOptions;

  /**
   * Override to provide provider-specific test configuration
   */
  protected abstract getProviderName(): string;

  /**
   * Setup before all tests
   */
  beforeAll(): void {
    this.originalFetch = global.fetch;
    global.fetch = createMockFetch(this.context);
  }

  /**
   * Cleanup after all tests
   */
  afterAll(): void {
    global.fetch = this.originalFetch;
  }

  /**
   * Reset context before each test
   */
  beforeEach(): void {
    this.context = this.createDefaultContext();
    global.fetch = createMockFetch(this.context);
  }

  /**
   * Set mock user info for tests
   */
  setMockUserInfo(userInfo: MockUserInfo): void {
    this.context.mockUserInfo = userInfo;
  }

  /**
   * Set mock token response for tests
   */
  setMockTokenResponse(tokenResponse: MockTokenResponse): void {
    this.context.mockTokenResponse = tokenResponse;
  }

  /**
   * Set existing users to be "found" during tests
   */
  setExistingUsers(users: MockUserInfo[]): void {
    this.context.foundUsers = users;
  }

  /**
   * Get the created user from tests
   */
  getCreatedUser(): MockUserInfo | null {
    return this.context.createdUser;
  }

  /**
   * Get the updated user from tests
   */
  getUpdatedUser(): MockUserInfo | null {
    return this.context.updatedUser;
  }

  /**
   * Create a mock request with authorization code in query params (GET)
   */
  createCallbackRequest(code: string): PayloadRequest {
    const mockPayload = createMockPayload(this.context);
    return {
      payload: mockPayload,
      headers: new Headers(),
      searchParams: new URLSearchParams({ code }),
      query: { code },
      method: "GET",
      context: {},
      user: null,
    } as unknown as PayloadRequest;
  }

  /**
   * Create a mock request with authorization code in body (POST)
   */
  createPostCallbackRequest(code: string): PayloadRequest {
    const mockPayload = createMockPayload(this.context);
    const body = `code=${encodeURIComponent(code)}`;

    return {
      payload: mockPayload,
      headers: new Headers({
        "content-type": "application/x-www-form-urlencoded",
      }),
      searchParams: new URLSearchParams(),
      query: {},
      method: "POST",
      context: {},
      user: null,
      text: async () => body,
    } as unknown as PayloadRequest;
  }

  /**
   * Create a mock authorize request
   */
  createAuthorizeRequest(state?: string): PayloadRequest {
    const mockPayload = createMockPayload(this.context);
    const searchParams = new URLSearchParams();
    if (state) {
      searchParams.set("state", state);
    }

    return {
      payload: mockPayload,
      headers: new Headers(),
      searchParams,
      query: state ? { state } : {},
      method: "GET",
      context: {},
      user: null,
    } as unknown as PayloadRequest;
  }
}

/**
 * Helper to test authorize endpoint response
 */
export function assertAuthorizeRedirect(
  response: Response,
  expectedParams: {
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    response_type?: string;
  },
): void {
  expect(response.status).toBe(302);
  const location = response.headers.get("Location");
  expect(location).toBeTruthy();

  const url = new URL(location!);
  if (expectedParams.client_id) {
    expect(url.searchParams.get("client_id")).toBe(expectedParams.client_id);
  }
  if (expectedParams.redirect_uri) {
    expect(url.searchParams.get("redirect_uri")).toBe(
      expectedParams.redirect_uri,
    );
  }
  if (expectedParams.scope) {
    expect(url.searchParams.get("scope")).toBe(expectedParams.scope);
  }
  if (expectedParams.response_type) {
    expect(url.searchParams.get("response_type")).toBe(
      expectedParams.response_type,
    );
  }
}

/**
 * Helper to test callback endpoint success redirect
 */
export function assertCallbackSuccessRedirect(
  response: Response,
  expectedRedirectPath: string,
): void {
  expect(response.status).toBe(302);
  const location = response.headers.get("Location");
  expect(location).toContain(expectedRedirectPath);
}

/**
 * Helper to test that a cookie was set
 */
export function assertCookieSet(response: Response, cookieName: string): void {
  const setCookie = response.headers.get("Set-Cookie");
  expect(setCookie).toBeTruthy();
  expect(setCookie).toContain(cookieName);
}
