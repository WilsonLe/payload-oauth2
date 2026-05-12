import type { PayloadRequest } from "payload";
import { defaultCallbackExtractToken } from "./default-callback-extract-token";
import { defaultGetPkceCodes } from "./default-get-pkce-codes";
import type { PluginOptions } from "./types";

export type OAuthConfigInput = PluginOptions | ResolvedOAuthConfig;

export type OAuthConfigWarning = {
  option: keyof PluginOptions | "authorizeRedirectUri";
  message: string;
};

export type ResolvedOAuthConfig = {
  raw: PluginOptions;
  warnings: OAuthConfigWarning[];
  strategyName: string;
  useEmailAsIdentity: boolean;
  excludeEmailFromJwtToken: boolean;
  serverURL: string;
  authCollection: string;
  subFieldName: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  providerAuthorizationUrl: string;
  authorizeRedirectUri?: string;
  redirectUri: string;
  getUserInfo: PluginOptions["getUserInfo"];
  callbackExtractToken: (req: PayloadRequest) => Promise<string>;
  onUserNotFoundBehavior: string;
  scopes: string[];
  scope: string;
  authorizePath: string;
  callbackPath: string;
  prompt?: string;
  authType?: string;
  responseMode?: string;
  getToken?: PluginOptions["getToken"];
  successRedirect: PluginOptions["successRedirect"];
  failureRedirect: PluginOptions["failureRedirect"];
  pkceEnabled: boolean;
  getPkceCodes: () => {
    verifier: string;
    challenge: string;
    challengeMethod: string;
  };
};

type ResolveOverrides = {
  subFieldName?: string;
};

export const isResolvedOAuthConfig = (
  input: OAuthConfigInput,
): input is ResolvedOAuthConfig =>
  typeof input === "object" &&
  input !== null &&
  "raw" in input &&
  "warnings" in input &&
  "redirectUri" in input;

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const pathWarning = (
  option: "authorizePath" | "callbackPath",
  value: string,
): OAuthConfigWarning | null => {
  if (!value.startsWith("/")) {
    return {
      option,
      message: `${option} should start with "/"; keeping configured value "${value}" for backwards compatibility.`,
    };
  }

  if (value.length > 1 && value.endsWith("/")) {
    return {
      option,
      message: `${option} should not have a trailing slash; keeping configured value "${value}" for backwards compatibility.`,
    };
  }

  return null;
};

export const resolveOAuthConfig = (
  input: OAuthConfigInput,
  overrides: ResolveOverrides = {},
): ResolvedOAuthConfig => {
  if (isResolvedOAuthConfig(input) && overrides.subFieldName === undefined) {
    return input;
  }

  const pluginOptions = isResolvedOAuthConfig(input) ? input.raw : input;
  const authCollection = pluginOptions.authCollection || "users";
  const subFieldName =
    overrides.subFieldName ||
    pluginOptions.subField?.name ||
    pluginOptions.subFieldName ||
    "sub";
  const callbackPath = pluginOptions.callbackPath || "/oauth/callback";
  const authorizePath = pluginOptions.authorizePath || "/oauth/authorize";
  const serverURL = pluginOptions.serverURL;
  const redirectUri =
    pluginOptions.authorizeRedirectUri ||
    `${serverURL}/api/${authCollection}${callbackPath}`;
  const useEmailAsIdentity = pluginOptions.useEmailAsIdentity ?? false;
  const excludeEmailFromJwtToken = useEmailAsIdentity ? false : true;

  const warnings = [
    pathWarning("authorizePath", authorizePath),
    pathWarning("callbackPath", callbackPath),
  ].filter((warning): warning is OAuthConfigWarning => warning !== null);

  if (useEmailAsIdentity && pluginOptions.excludeEmailFromJwtToken === true) {
    warnings.push({
      option: "excludeEmailFromJwtToken",
      message:
        "excludeEmailFromJwtToken cannot be true when useEmailAsIdentity is true; signing email into the JWT so auth strategy can identify the user.",
    });
  }

  if (!isAbsoluteHttpUrl(serverURL)) {
    warnings.push({
      option: "serverURL",
      message: `serverURL should be an absolute http(s) URL; keeping configured value "${serverURL}" for backwards compatibility.`,
    });
  }

  if (serverURL.endsWith("/")) {
    warnings.push({
      option: "serverURL",
      message: `serverURL should not have a trailing slash; keeping configured value "${serverURL}" for backwards compatibility.`,
    });
  }

  if (
    pluginOptions.authorizeRedirectUri &&
    !isAbsoluteHttpUrl(pluginOptions.authorizeRedirectUri)
  ) {
    warnings.push({
      option: "authorizeRedirectUri",
      message: `authorizeRedirectUri should be an absolute http(s) URL; keeping configured value "${pluginOptions.authorizeRedirectUri}" for backwards compatibility.`,
    });
  }

  if (pluginOptions.providerAuthorizationUrl.endsWith("/")) {
    warnings.push({
      option: "providerAuthorizationUrl",
      message: `providerAuthorizationUrl should not have a trailing slash; keeping configured value "${pluginOptions.providerAuthorizationUrl}" for backwards compatibility.`,
    });
  }

  return {
    raw: pluginOptions,
    warnings,
    strategyName: pluginOptions.strategyName,
    useEmailAsIdentity,
    excludeEmailFromJwtToken,
    serverURL,
    authCollection,
    subFieldName,
    clientId: pluginOptions.clientId,
    clientSecret: pluginOptions.clientSecret,
    tokenEndpoint: pluginOptions.tokenEndpoint,
    providerAuthorizationUrl: pluginOptions.providerAuthorizationUrl,
    authorizeRedirectUri: pluginOptions.authorizeRedirectUri,
    redirectUri,
    getUserInfo: pluginOptions.getUserInfo,
    callbackExtractToken:
      pluginOptions.callbackExtractToken || defaultCallbackExtractToken,
    onUserNotFoundBehavior: pluginOptions.onUserNotFoundBehavior || "create",
    scopes: pluginOptions.scopes,
    scope: pluginOptions.scopes.join(" "),
    authorizePath,
    callbackPath,
    prompt: pluginOptions.prompt,
    authType: pluginOptions.authType,
    responseMode: pluginOptions.responseMode,
    getToken: pluginOptions.getToken,
    successRedirect: pluginOptions.successRedirect,
    failureRedirect: pluginOptions.failureRedirect,
    pkceEnabled: pluginOptions.pkceEnabled ?? false,
    getPkceCodes: pluginOptions.getPkceCodes || defaultGetPkceCodes,
  };
};

export const warnOAuthConfig = (
  config: ResolvedOAuthConfig,
  warn: (message: string) => void = console.warn,
): void => {
  config.warnings.forEach((warning) => {
    warn(`OAuth2Plugin config warning: ${warning.message}`);
  });
};
