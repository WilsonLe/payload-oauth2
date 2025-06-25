import type { PayloadRequest, TextField } from "payload";

export interface PluginOptions {
  /**
   * Enable or disable plugin
   * @default false
   */
  enabled?: boolean;

  /**
   * Name of the strategy
   */
  strategyName: string;

  /**
   * Use email as identity. If true, the user's email will be used as the
   * single identity for the user. This allows users to log in with different
   * OAuth providers using the same email.
   * @default false
   */
  useEmailAsIdentity?: boolean;

  /**
   * Exclude email from jwt token. This is overriden to false if
   * useEmailAsIdentity is true because email is required to identify the user.
   * @default false
   */
  excludeEmailFromJwtToken?: boolean;

  /**
   * URL to the server. This is used to redirect users after login.
   * Must not have trailing slash.
   * Must start with http:// or https://
   */
  serverURL: string;

  /**
   * Response mode for the OAuth provider.
   * Specifies how the authorization response should be returned.
   *
   * Required for Apple OAuth when requesting name or email scopes.
   * Apple requires 'form_post' when requesting these scopes to ensure
   * secure transmission of user data.
   *
   * Common values:
   * - 'form_post': Response parameters encoded in POST body (required for Apple with name/email scope)
   * - 'query': Response parameters encoded in URL query string (default for most providers)
   * - 'fragment': Response parameters encoded in URL fragment
   *
   * @default undefined
   */
  responseMode?: string;

  /**
   * Slug of the collection where user information will be stored
   * @default "users"
   */
  authCollection?: string;

  /**
   * Field name in the auth collection where the OAuth provider's user ID will
   * be stored
   * @default "sub"
   */
  subFieldName?: string;

  /**
   * Customize your own sub field to store the OAuth provider's user ID.
   * Overrides `subFieldName` if both are provided.
   */
  subField?: TextField;

  /**
   * Client ID for the OAuth provider
   */
  clientId: string;

  /**
   * Client secret for the OAuth provider
   */
  clientSecret: string;

  /**
   * URL to the token endpoint.
   * The following are token endpoints for popular OAuth providers:
   * - Google: https://oauth2.googleapis.com/token
   * - Apple: https://appleid.apple.com/auth/token
   */
  tokenEndpoint: string;

  /**
   * URL to the provider authorization endpoint.
   * Must not have trailing slash.
   * The following are authorization endpoints for popular OAuth providers:
   * - Google: https://accounts.google.com/o/oauth2/v2/auth
   * - Apple: https://appleid.apple.com/auth/authorize
   */
  providerAuthorizationUrl: string;

  /**
   * Function to get user information from the OAuth provider.
   * This function should return a promise that resolves to the user
   * information that will be stored in database.
   *
   * For providers that return user info in the ID token (like Apple),
   * you can decode the JWT token here to extract user information.
   *
   * @param accessToken Access token or ID token obtained from OAuth provider
   * @param req PayloadRequest object
   */
  getUserInfo: (
    accessToken: string,
    req: PayloadRequest,
  ) => Promise<Record<string, unknown>>;

  /**
   * Function to extract authorization code from the callback request.
   * @param req PayloadRequest object
   * @returns Promise that resolves to the authorization code
   * @default `defaultCallbackExtractToken` in `src/default-callback-extract-token.ts`
   */
  callbackExtractToken?: (req: PayloadRequest) => Promise<string>;

  /**
   * Behavior when a user is not found in the database.
   * If set to "create", a new user will be created with the information
   * returned from the OAuth provider.
   * If set to "error", an error will be thrown and the user will not
   * be created.
   * @default "create"
   */
  onUserNotFoundBehavior?: "create" | "error";

  /**
   * Scope for the OAuth provider.
   * The following are scopes for popular OAuth providers:
   * - Google:
   *   + https://www.googleapis.com/auth/userinfo.email
   *   + https://www.googleapis.com/auth/userinfo.profile
   *   + openid
   * - Apple:
   *   + name
   *   + email
   */
  scopes: string[];

  /**
   * Path to the authorize endpoint.
   * Must start with a forward slash.
   * Must NOT have a trailing slash.
   * This path will have /api/[auth-collection-slug] prepended to it.
   * @default "/oauth/authorize"
   */
  authorizePath?: string;

  /**
   * Specify the prompt parameter for the OAuth provider.
   * Google uses this parameter to specify the type of login flow.
   * The following are prompt values for Google:
   * - none: Do not display any authentication or consent screens.
   * - consent: Prompt the user for consent.
   * - select_account: Prompt the user to select an account.
   */
  prompt?: string;

  /**
   * Authentication type for the OAuth provider.
   * This is used by Facebook to specify the behavior of login flow.
   * Reference: https://developers.facebook.com/docs/facebook-login/guides/advanced/re-authentication/
   * Possible values are "reauthenticate" and "rerequest".
   */
  authType?: string;

  /**
   * Path to the callback endpoint.
   * Must start with a forward slash.
   * Must NOT have a trailing slash.
   * This path will have /api/[auth-collection-slug] prepended to it.
   * @default "/oauth/callback"
   */
  callbackPath?: string;

  /**
   * Function to get token from the OAuth providers.
   *
   * If its not provided default will be used, which requires
   * tokenEndpoint, clientId, clientSecret, redirectUri, code.
   *
   * Reference: `defaultGetToken` in `src/default-get-token.ts`
   * @param code Code obtained from the OAuth provider, used to exchange for access token
   * @param req PayloadRequest object
   */
  getToken?: (code: string, req: PayloadRequest) => Promise<string>;

  /**
   * Redirect users after successful login.
   * @deprecated Use the two-parameter overload instead
   */
  successRedirect(req: PayloadRequest): string | Promise<string>;

  /**
   * Redirect users after successful login.
   * @param req PayloadRequest object
   * @param accessToken Payload generated access token of the authenticated user
   */
  successRedirect(
    req: PayloadRequest,
    accessToken: string,
  ): string | Promise<string>;

  /**
   * Redirect users after failed login.
   * @param req PayloadRequest object
   * @param error Error object
   */
  failureRedirect: (
    req: PayloadRequest,
    error?: unknown,
  ) => string | Promise<string>;
}

export interface NewCollectionTypes {
  title: string;
}
