import { SignJWT } from "jose";
import type { PayloadRequest, RequestContext, User } from "payload";
import { generatePayloadCookie, getFieldsToSign } from "payload";
import { addPayloadSessionToUser } from "./auth-sessions";
import { defaultGetToken } from "./default-get-token";
import type { ResolvedOAuthConfig } from "./oauth-config";
import { ensureCallbackUser } from "./oauth-identity";

export type OAuthCallbackTransactionResult = {
  cookie: string;
  location: string;
  token: string;
  user: User;
};

type CollectionHookName = "beforeLogin" | "afterLogin";

type RunHooksArgs = {
  hookName: CollectionHookName;
  collectionConfig: PayloadRequest["payload"]["collections"][string]["config"];
  jwtToken?: string;
  req: PayloadRequest;
  user: User;
};

const runCollectionLoginHooks = async ({
  hookName,
  collectionConfig,
  jwtToken,
  req,
  user,
}: RunHooksArgs): Promise<User> => {
  let currentUser = user;
  const hooks = collectionConfig.hooks?.[hookName] || [];

  for (const hook of hooks) {
    const runHook = hook as (
      args: Record<string, unknown>,
    ) => unknown | Promise<unknown>;
    const hookResult = await runHook({
      collection: collectionConfig,
      context: req.context || ({} as RequestContext),
      req,
      ...(jwtToken ? { token: jwtToken } : {}),
      user: currentUser,
    });

    if (hookResult) {
      currentUser = hookResult as User;
    }
  }

  return currentUser;
};

const exchangeOAuthToken = async (
  req: PayloadRequest,
  config: ResolvedOAuthConfig,
  code: string,
): Promise<string> => {
  const token = config.getToken
    ? await config.getToken(code, req)
    : await defaultGetToken(
        config.tokenEndpoint,
        config.clientId,
        config.clientSecret,
        config.redirectUri,
        code,
        config.pkceEnabled,
        req,
      );

  if (typeof token !== "string") {
    throw new Error(`Invalid token response: ${token}`);
  }

  return token;
};

export const runOAuthCallbackTransaction = async (
  req: PayloadRequest,
  config: ResolvedOAuthConfig,
): Promise<OAuthCallbackTransactionResult> => {
  const collectionConfig =
    req.payload.collections[config.authCollection].config;
  const payloadConfig = req.payload.config;
  const code = await config.callbackExtractToken(req);
  const providerToken = await exchangeOAuthToken(req, config, code);
  const userInfo = await config.getUserInfo(providerToken, req);

  let user = await ensureCallbackUser({ req, config, userInfo });
  user = await runCollectionLoginHooks({
    hookName: "beforeLogin",
    collectionConfig,
    req,
    user,
  });

  const sid = await addPayloadSessionToUser({
    collectionConfig,
    req,
    user,
  });
  user.collection = config.authCollection;
  user._strategy = config.strategyName;
  if (sid) {
    user._sid = sid;
  }

  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: config.excludeEmailFromJwtToken ? "" : user.email || "",
    sid,
    user: user as PayloadRequest["user"],
  });

  if (!config.useEmailAsIdentity) {
    const providerSubject = user[config.subFieldName];
    if (typeof providerSubject !== "string" || providerSubject.length === 0) {
      throw new Error(`No ${config.subFieldName} found in Payload user`);
    }
    fieldsToSign[config.subFieldName] = providerSubject;
  }

  const jwtToken = await new SignJWT(fieldsToSign)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${collectionConfig.auth.tokenExpiration} secs`)
    .sign(new TextEncoder().encode(req.payload.secret));
  req.user = user as PayloadRequest["user"];

  user = await runCollectionLoginHooks({
    hookName: "afterLogin",
    collectionConfig,
    jwtToken,
    req,
    user,
  });

  const cookie = generatePayloadCookie({
    collectionAuthConfig: collectionConfig.auth,
    cookiePrefix: payloadConfig.cookiePrefix,
    token: jwtToken,
  });

  return {
    cookie,
    location: await config.successRedirect(req, jwtToken),
    token: jwtToken,
    user,
  };
};
