/**
 * Mock for the payload module
 * This allows tests to run without loading the actual ESM payload package
 */

// Re-export types as empty aliases for test-time TypeScript imports.
export type PayloadRequest = {
  payload: Payload;
  headers: Headers;
  searchParams: URLSearchParams;
  query: Record<string, unknown>;
  method: string;
  context: Record<string, unknown>;
  user: unknown;
  text?: () => Promise<string>;
  json?: () => Promise<Record<string, unknown>>;
};

export type Payload = {
  collections: Record<string, { config: CollectionConfig }>;
  config: Config;
  secret: string;
  logger: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
  find: jest.Mock;
  findByID: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  db: {
    findOne: jest.Mock;
    updateOne: jest.Mock;
  };
};

export type AuthConfig = {
  disableLocalStrategy?: boolean;
  strategies?: unknown[];
  tokenExpiration?: number;
  useSessions?: boolean;
};

export type CollectionConfig = {
  slug: string;
  auth?: boolean | AuthConfig;
  fields: Field[];
  endpoints?: Endpoint[];
  hooks?: {
    beforeLogin?: Array<(args: Record<string, unknown>) => unknown>;
    afterLogin?: Array<(args: Record<string, unknown>) => unknown>;
  };
};

export type Config = {
  secret?: string;
  cookiePrefix?: string;
  collections?: CollectionConfig[];
};

export type Field = {
  name: string;
  type: string;
};

export type TextField = Field & {
  type: "text";
};

export type Endpoint = {
  path: string;
  method: string;
  handler: (req: PayloadRequest) => Promise<Response> | Response;
};

export type PayloadHandler = Endpoint["handler"];
export type RequestContext = Record<string, unknown>;
export type CollectionSlug = string;
export type JsonObject = Record<string, unknown>;
export type TypeWithID = { id: string | number };
export type UserSession = {
  createdAt: Date | string;
  expiresAt: Date | string;
  id: string;
};
export type User = TypeWithID & Record<string, unknown>;
export type PaginatedDocs<T> = { docs: T[] };
export type AuthStrategyResult = { user: User | null };
export type AuthStrategy = {
  name: string;
  authenticate: (args: {
    headers: Headers;
    payload: Payload;
  }) => Promise<AuthStrategyResult>;
};

/**
 * Mock generateCookie function
 * The real function creates a signed cookie based on options
 */
export function generateCookie(options: {
  name: string;
  value: string;
  maxAge?: number;
  returnCookieAsObject?: boolean;
  sameSite?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
}): string | Record<string, unknown> {
  const {
    name,
    value,
    maxAge,
    returnCookieAsObject,
    sameSite,
    path,
    httpOnly,
    secure,
  } = options;

  if (returnCookieAsObject) {
    return {
      name,
      value,
      maxAge,
      sameSite,
      path: path ?? "/",
      httpOnly: httpOnly ?? true,
      secure: secure ?? true,
    };
  }

  const parts = [`${name}=${value}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  parts.push(`Path=${path ?? "/"}`);
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  if (httpOnly !== false) parts.push("HttpOnly");
  if (secure !== false) parts.push("Secure");

  return parts.join("; ");
}

export function generatePayloadCookie(options: {
  collectionAuthConfig?: boolean | AuthConfig;
  cookiePrefix?: string;
  token: string;
}): string {
  const cookieName = options.cookiePrefix
    ? `${options.cookiePrefix}-token`
    : "payload-token";
  return `${cookieName}=${options.token}; Path=/; HttpOnly`;
}

export function getFieldsToSign(options: {
  collectionConfig: CollectionConfig;
  email: string;
  sid?: string;
  user: Record<string, unknown> | null;
}): Record<string, unknown> {
  const user = options.user ?? {};
  return {
    id: user.id,
    collection: user.collection,
    email: options.email,
    ...(options.sid ? { sid: options.sid } : {}),
  };
}

export function parseCookies(headers: Headers): Map<string, string> {
  const cookieHeader = headers.get("cookie") || "";
  const cookies = new Map<string, string>();

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, rawValue.join("="));
  }

  return cookies;
}

export function extractJWT({ headers }: { headers: Headers }): string | null {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }
  return null;
}

/**
 * Default export to satisfy any default imports
 */
export default {
  extractJWT,
  generateCookie,
  generatePayloadCookie,
  getFieldsToSign,
  parseCookies,
};
