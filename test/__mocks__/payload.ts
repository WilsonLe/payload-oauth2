/**
 * Mock for the payload module
 * This allows tests to run without loading the actual ESM payload package
 */

// Re-export types as empty interfaces/types for type checking
export type PayloadRequest = {
  payload: Payload;
  headers: Headers;
  searchParams: URLSearchParams;
  query: Record<string, unknown>;
  method: string;
  context: Record<string, unknown>;
  user: unknown;
  text?: () => Promise<string>;
};

export type Payload = {
  collections: Record<string, { config: CollectionConfig }>;
  config: Config;
  logger: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
  find: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

export type CollectionConfig = {
  slug: string;
  auth?: boolean;
  fields: Field[];
  endpoints?: Endpoint[];
  hooks?: {
    beforeLogin?: unknown[];
    afterLogin?: unknown[];
  };
};

export type Config = {
  secret?: string;
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
  handler: (req: PayloadRequest) => Promise<Response>;
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

/**
 * Default export to satisfy any default imports
 */
export default {
  generateCookie,
};
