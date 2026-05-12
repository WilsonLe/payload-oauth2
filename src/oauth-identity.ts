import crypto from "node:crypto";
import type {
  CollectionSlug,
  JsonObject,
  PaginatedDocs,
  Payload,
  PayloadRequest,
  TypeWithID,
  User,
} from "payload";
import type { ResolvedOAuthConfig } from "./oauth-config";

export type OAuthIdentity = {
  field: string;
  value: string;
};

type IdentitySource = "provider user info" | "jwt token";

type FindUserArgs = {
  payload: Pick<Payload, "find">;
  req?: PayloadRequest;
  collection: CollectionSlug;
  identity: OAuthIdentity;
  showHiddenFields?: boolean;
};

type EnsureCallbackUserArgs = {
  req: PayloadRequest;
  config: ResolvedOAuthConfig;
  userInfo: Record<string, unknown>;
};

export const getOAuthIdentity = (
  config: ResolvedOAuthConfig,
  source: Record<string, unknown>,
  sourceLabel: IdentitySource,
): OAuthIdentity => {
  if (config.useEmailAsIdentity) {
    if (typeof source.email !== "string" || source.email.length === 0) {
      throw new Error(`Email not found in ${sourceLabel}`);
    }
    return { field: "email", value: source.email };
  }

  const providerSubject = source[config.subFieldName];
  if (typeof providerSubject !== "string" || providerSubject.length === 0) {
    throw new Error(`No ${config.subFieldName} found in ${sourceLabel}`);
  }
  return { field: config.subFieldName, value: providerSubject };
};

export const tryGetOAuthIdentity = (
  config: ResolvedOAuthConfig,
  source: Record<string, unknown>,
  sourceLabel: IdentitySource,
): OAuthIdentity | null => {
  try {
    return getOAuthIdentity(config, source, sourceLabel);
  } catch {
    return null;
  }
};

export const findUserByOAuthIdentity = async ({
  payload,
  req,
  collection,
  identity,
  showHiddenFields,
}: FindUserArgs): Promise<PaginatedDocs<JsonObject & TypeWithID>> =>
  payload.find({
    ...(req ? { req } : {}),
    collection,
    where: { [identity.field]: { equals: identity.value } },
    ...(showHiddenFields === undefined ? {} : { showHiddenFields }),
    limit: 1,
  });

export const ensureCallbackUser = async ({
  req,
  config,
  userInfo,
}: EnsureCallbackUserArgs): Promise<User> => {
  const collection = config.authCollection as CollectionSlug;
  const identity = getOAuthIdentity(config, userInfo, "provider user info");
  const existingUser = await findUserByOAuthIdentity({
    req,
    payload: req.payload,
    collection,
    identity,
    showHiddenFields: true,
  });

  const user = existingUser.docs[0] as User | undefined;
  if (user) {
    user.collection = collection;
    return user;
  }

  if (config.onUserNotFoundBehavior === "error") {
    throw new Error(`User not found: ${identity.value}`);
  }

  if (config.onUserNotFoundBehavior !== "create") {
    throw new Error(
      `Invalid onUserNotFoundBehavior: ${config.onUserNotFoundBehavior}`,
    );
  }

  const result = await req.payload.create({
    req,
    collection,
    data: {
      ...userInfo,
      password: crypto.randomBytes(32).toString("hex"),
      collection,
    },
    showHiddenFields: true,
  });

  return result as unknown as User;
};
