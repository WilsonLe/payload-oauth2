import { PayloadRequest } from "payload/types";

export interface PluginTypes {
  /**
   * Enable or disable plugin
   * @default false
   */
  enabled?: boolean;

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
   * This path will have /api/<auth-collection-slug> prepended to it.
   * @default "/oauth/authorize"
   */
  authorizePath?: string;

  /**
   * Path to the callback endpoint.
   * Must start with a forward slash.
   * Must NOT have a trailing slash.
   * This path will have /api/<auth-collection-slug> prepended to it.
   * @default "/oauth/callback"
   */
  callbackPath?: string;

  /**
   * Redirect users after successful login.
   */
  successRedirect: (req: PayloadRequest) => string | Promise<string>;

  /**
   * Redirect users after failed login.
   */
  failureRedirect: (req: PayloadRequest) => string | Promise<string>;

  OAuthLoginButton?: React.ComponentType;
}

export interface NewCollectionTypes {
  title: string;
}
