/**
 * Test Utilities
 *
 * This module re-exports common test utilities from the base OAuth test module.
 * The new test architecture uses mock-based unit tests instead of E2E tests with Puppeteer.
 *
 * @see base-oauth-test.ts for the main test infrastructure
 * @see google-oauth-test.ts for Google-specific test utilities
 * @see zitadel-oauth-test.ts for Zitadel-specific test utilities
 */

// Re-export all utilities from base-oauth-test
export {
  BaseOAuthTestSuite,
  assertAuthorizeRedirect,
  assertCallbackSuccessRedirect,
  assertCookieSet,
  createMockFetch,
  createMockPayload,
  createMockPayloadRequest,
} from "./base-oauth-test";
export type {
  MockTokenResponse,
  MockUserInfo,
  OAuthTestContext,
} from "./base-oauth-test";

// Re-export Google test utilities
export {
  DEFAULT_GOOGLE_MOCK_USER,
  GOOGLE_TEST_CONFIG,
  GoogleOAuthTestSuite,
  createGoogleMockFetch,
} from "./google-oauth-test";

// Re-export Zitadel test utilities
export {
  DEFAULT_ZITADEL_MOCK_USER,
  ZITADEL_TEST_CONFIG,
  ZitadelOAuthTestSuite,
  createZitadelMockFetch,
} from "./zitadel-oauth-test";
