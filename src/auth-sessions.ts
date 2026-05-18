import crypto from "node:crypto";
import type {
  CollectionSlug,
  PayloadRequest,
  User,
  UserSession,
} from "payload";

type AuthConfigWithSessions = {
  disableLocalStrategy?: unknown;
  tokenExpiration?: number;
  useSessions?: boolean;
};

type CollectionConfigWithAuthSessions = {
  auth?: boolean | AuthConfigWithSessions;
  slug: string;
};

type SessionAwareUser = User & {
  _sid?: string;
  _strategy?: string;
  sessions?: UserSession[];
  updatedAt?: Date | null | string;
};

const isAuthConfigWithSessions = (
  auth: CollectionConfigWithAuthSessions["auth"],
): auth is AuthConfigWithSessions => typeof auth === "object" && auth !== null;

export const shouldUsePayloadSessions = (
  collectionConfig: CollectionConfigWithAuthSessions,
): boolean =>
  isAuthConfigWithSessions(collectionConfig.auth) &&
  collectionConfig.auth.useSessions === true &&
  !collectionConfig.auth.disableLocalStrategy;

export const removeExpiredPayloadSessions = (
  sessions: UserSession[],
): UserSession[] => {
  const now = new Date();

  return sessions.filter(({ expiresAt }) => {
    const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    return expiry > now;
  });
};

export const userHasPayloadSession = (user: User, sid: string): boolean =>
  Array.isArray((user as SessionAwareUser).sessions) &&
  (user as SessionAwareUser).sessions!.some((session) => session.id === sid);

export const addPayloadSessionToUser = async ({
  collectionConfig,
  req,
  user,
}: {
  collectionConfig: CollectionConfigWithAuthSessions;
  req: PayloadRequest;
  user: User;
}): Promise<string | undefined> => {
  if (!shouldUsePayloadSessions(collectionConfig)) return undefined;
  if (!isAuthConfigWithSessions(collectionConfig.auth)) return undefined;

  const now = new Date();
  const sid = crypto.randomUUID();
  const tokenExpiration = collectionConfig.auth.tokenExpiration ?? 7200;
  const session: UserSession = {
    id: sid,
    createdAt: now,
    expiresAt: new Date(now.getTime() + tokenExpiration * 1000),
  };
  const sessionAwareUser = user as SessionAwareUser;
  const existingSessions = Array.isArray(sessionAwareUser.sessions)
    ? removeExpiredPayloadSessions(sessionAwareUser.sessions)
    : [];
  const nextSessions = [...existingSessions, session];

  sessionAwareUser.sessions = nextSessions;
  sessionAwareUser.updatedAt = null;

  await req.payload.db.updateOne({
    id: user.id,
    collection: collectionConfig.slug as CollectionSlug,
    data: {
      sessions: nextSessions,
      updatedAt: null,
    },
    req,
    returning: false,
  });

  sessionAwareUser.collection = collectionConfig.slug;
  sessionAwareUser._sid = sid;

  return sid;
};
