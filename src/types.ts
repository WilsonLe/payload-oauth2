import { PayloadRequest } from "payload";

export interface PluginTypes {
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
   * URL to the server. This is used to redirect users after login.
   * Must not have trailing slash.
   * Must start with http:// or https://
   */
  serverURL: string;

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
   */
  tokenEndpoint: string;

  /**
   * URL to the provider authorization endpoint.
   * Must not have trailing slash.
   * The following are authorization endpoints for popular OAuth providers:
   * - Google: https://accounts.google.com/o/oauth2/v2/auth
   */
  providerAuthorizationUrl: string;

  /**
   * Function to get user information from the OAuth provider.
   * This function should return a promise that resolves to the user
   * information that will be stored in database.
   * @param accessToken Access token obtained from OAuth provider
   */
  getUserInfo: (accessToken: string) => Promise<any> | any;

  /**
   * Scope for the OAuth provider.
   * The following are scopes for popular OAuth providers:
   * - Google:
   *   + https://www.googleapis.com/auth/userinfo.email
   *   + https://www.googleapis.com/auth/userinfo.profile
   *   + openid
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
   * Path to the callback endpoint.
   * Must start with a forward slash.
   * Must NOT have a trailing slash.
   * This path will have /api/[auth-collection-slug] prepended to it.
   * @default "/oauth/callback"
   */
  callbackPath?: string;

  /**
   * Function to get token from the OAuth providers.
   * If its not provided default will be used.
   */
  getToken?: (code: string) => string | Promise<string>;

  /**
   * Redirect users after successful login.
   */
  successRedirect: (req: PayloadRequest) => string | Promise<string>;

  /**
   * Redirect users after failed login.
   */
  failureRedirect: (
    req: PayloadRequest,
    error?: unknown,
  ) => string | Promise<string>;
}

export interface NewCollectionTypes {
  title: string;
}
