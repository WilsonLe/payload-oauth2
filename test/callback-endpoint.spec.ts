import { SignJWT, jwtVerify } from "jose";
import type { PayloadRequest } from "payload";
import { createAuthStrategy } from "../src/auth-strategy";
import { createCallbackEndpoint } from "../src/callback-endpoint";
import type { PluginOptions } from "../src/types";
import {
  createMockOAuthTestContext,
  createMockPayload,
  type OAuthTestContext,
} from "./base-oauth-test";

const basePluginOptions = (
  overrides: Partial<PluginOptions> = {},
): PluginOptions => ({
  enabled: true,
  strategyName: "unit-test-provider",
  useEmailAsIdentity: true,
  serverURL: "http://localhost:3000",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  authorizePath: "/oauth/unit-test",
  callbackPath: "/oauth/unit-test/callback",
  authCollection: "users",
  tokenEndpoint: "https://provider.example.test/token",
  scopes: ["openid", "email", "profile"],
  providerAuthorizationUrl: "https://provider.example.test/authorize",
  getToken: jest.fn().mockResolvedValue("provider-access-token"),
  getUserInfo: jest.fn().mockResolvedValue({
    email: "new-user@example.com",
    sub: "provider-user-123",
    name: "New User",
  }),
  successRedirect: jest.fn().mockReturnValue("/admin"),
  failureRedirect: jest.fn(
    (_req, error) =>
      `/admin/login?error=${encodeURIComponent(
        error instanceof Error ? error.message : String(error),
      )}`,
  ),
  ...overrides,
});

const createCallbackRequest = (
  context: OAuthTestContext,
  code = "callback-code-123",
): PayloadRequest =>
  ({
    payload: createMockPayload(context),
    headers: new Headers(),
    searchParams: new URLSearchParams({ code }),
    query: { code },
    method: "GET",
    context: { requestId: "unit-test-request" },
    user: null,
  }) as unknown as PayloadRequest;

const getGetCallbackHandler = (pluginOptions: PluginOptions) => {
  const endpoint = createCallbackEndpoint(pluginOptions).find(
    (candidate) => candidate.method === "get",
  );
  if (!endpoint) throw new Error("GET callback endpoint not found");
  return endpoint.handler;
};

describe("Callback endpoint unit flow", () => {
  it("creates a user through the callback endpoint interface", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const beforeLogin = jest.fn(({ user }) => ({
      ...(user as Record<string, unknown>),
      beforeLoginTouched: true,
    }));
    const afterLogin = jest.fn(({ user }) => ({
      ...(user as Record<string, unknown>),
      afterLoginTouched: true,
    }));
    const req = createCallbackRequest(context);
    req.payload.collections.users.config.hooks = {
      beforeLogin: [beforeLogin],
      afterLogin: [afterLogin],
    };

    const pluginOptions = basePluginOptions();
    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/admin");
    expect(response.headers.get("Set-Cookie")).toContain("payload-token=");
    expect(pluginOptions.getToken).toHaveBeenCalledWith(
      "callback-code-123",
      req,
    );
    expect(pluginOptions.getUserInfo).toHaveBeenCalledWith(
      "provider-access-token",
      req,
    );
    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        where: { email: { equals: "new-user@example.com" } },
        showHiddenFields: true,
        limit: 1,
      }),
    );
    expect(req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        data: expect.objectContaining({
          email: "new-user@example.com",
          sub: "provider-user-123",
          collection: "users",
          password: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(req.payload.update).not.toHaveBeenCalled();
    expect(beforeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        req,
        user: expect.objectContaining({ id: "new-user-id" }),
      }),
    );
    expect(afterLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        req,
        token: expect.any(String),
        user: expect.objectContaining({ beforeLoginTouched: true }),
      }),
    );
    expect(pluginOptions.successRedirect).toHaveBeenCalledWith(
      req,
      expect.any(String),
    );
    expect(pluginOptions.failureRedirect).not.toHaveBeenCalled();
    expect(req.user).toEqual(
      expect.objectContaining({
        email: "new-user@example.com",
        sub: "provider-user-123",
      }),
    );
  });

  it("reuses an existing user without updating provider profile data", async () => {
    const existingUser = {
      id: "existing-user-id",
      email: "existing-user@example.com",
      sub: "provider-user-123",
    };
    const context = createMockOAuthTestContext({ foundUsers: [existingUser] });
    const req = createCallbackRequest(context);
    const pluginOptions = basePluginOptions({
      getUserInfo: jest.fn().mockResolvedValue({
        email: existingUser.email,
        sub: existingUser.sub,
        name: "Updated User",
      }),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(req.payload.create).not.toHaveBeenCalled();
    expect(req.payload.update).not.toHaveBeenCalled();
    expect(pluginOptions.successRedirect).toHaveBeenCalledWith(
      req,
      expect.any(String),
    );
    expect(req.user).toEqual(
      expect.objectContaining({
        id: "existing-user-id",
        collection: "users",
      }),
    );
  });

  it("uses the provider subject as identity when email identity is disabled", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    const pluginOptions = basePluginOptions({ useEmailAsIdentity: false });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sub: { equals: "provider-user-123" } },
      }),
    );
  });

  it("authenticates the callback JWT through the auth strategy", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    let issuedToken = "";
    const pluginOptions = basePluginOptions({
      successRedirect: jest.fn((_req, token) => {
        issuedToken = token;
        return "/admin";
      }),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;
    expect(response.status).toBe(302);
    expect(issuedToken).toEqual(expect.any(String));
    expect(context.createdUser).toBeTruthy();

    context.foundUsers = [context.createdUser!];
    const authStrategy = createAuthStrategy(pluginOptions, "sub");
    const result = await authStrategy.authenticate({
      headers: new Headers({ Authorization: `Bearer ${issuedToken}` }),
      payload: req.payload,
    });

    expect(result.user).toEqual(
      expect.objectContaining({
        collection: "users",
        email: "new-user@example.com",
        sub: "provider-user-123",
      }),
    );
  });

  it("authenticates the callback JWT when provider subject is the identity", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    let issuedToken = "";
    const pluginOptions = basePluginOptions({
      useEmailAsIdentity: false,
      successRedirect: jest.fn((_req, token) => {
        issuedToken = token;
        return "/admin";
      }),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;
    expect(response.status).toBe(302);
    expect(context.createdUser).toBeTruthy();

    const { payload: jwtPayload } = await jwtVerify(
      issuedToken,
      new TextEncoder().encode(req.payload.secret),
    );
    expect(jwtPayload.sub).toBe("provider-user-123");

    context.foundUsers = [context.createdUser!];
    const authStrategy = createAuthStrategy(pluginOptions, "sub");
    const result = await authStrategy.authenticate({
      headers: new Headers({ Authorization: `Bearer ${issuedToken}` }),
      payload: req.payload,
    });

    expect(result.user).toEqual(
      expect.objectContaining({
        collection: "users",
        sub: "provider-user-123",
      }),
    );
  });

  it("creates a Payload session and signs its sid when sessions are enabled", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    req.payload.collections.users.config.auth = {
      tokenExpiration: 7200,
      useSessions: true,
    };
    let issuedToken = "";
    const pluginOptions = basePluginOptions({
      successRedirect: jest.fn((_req, token) => {
        issuedToken = token;
        return "/admin";
      }),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(req.payload.db.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "new-user-id",
        returning: false,
      }),
    );
    expect(context.createdUser?.sessions).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
      }),
    ]);

    const sid = context.createdUser?.sessions?.[0]?.id;
    const { payload } = await jwtVerify(
      issuedToken,
      new TextEncoder().encode(req.payload.secret),
    );
    expect(payload.sid).toBe(sid);
    expect(req.user).toEqual(expect.objectContaining({ _sid: sid }));
  });

  it("validates session-backed callback JWTs through the auth strategy", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    req.payload.collections.users.config.auth = {
      tokenExpiration: 7200,
      useSessions: true,
    };
    let issuedToken = "";
    const pluginOptions = basePluginOptions({
      successRedirect: jest.fn((_req, token) => {
        issuedToken = token;
        return "/admin";
      }),
    });

    await getGetCallbackHandler(pluginOptions)(req);
    context.foundUsers = [context.createdUser!];
    req.payload.find.mockClear();
    req.payload.create.mockClear();

    const authStrategy = createAuthStrategy(pluginOptions, "sub");
    const result = await authStrategy.authenticate({
      headers: new Headers({ Authorization: `Bearer ${issuedToken}` }),
      payload: req.payload,
    });

    const sid = context.createdUser?.sessions?.[0]?.id;
    expect(req.payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "new-user-id",
        showHiddenFields: true,
      }),
    );
    expect(req.payload.find).not.toHaveBeenCalled();
    expect(req.payload.create).not.toHaveBeenCalled();
    expect(result.user).toEqual(
      expect.objectContaining({
        _sid: sid,
        _strategy: "unit-test-provider",
        collection: "users",
        email: "new-user@example.com",
      }),
    );
  });

  it.each([
    { name: "missing sid", sid: undefined },
    { name: "revoked sid", sid: "revoked-session-id" },
  ])("rejects session-backed JWTs with $name", async ({ sid }) => {
    const context = createMockOAuthTestContext({
      foundUsers: [
        {
          id: "existing-user-id",
          email: "existing-user@example.com",
          sub: "provider-user-123",
          sessions: [
            {
              id: "valid-session-id",
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 7200 * 1000),
            },
          ],
        },
      ],
    });
    const req = createCallbackRequest(context);
    req.payload.collections.users.config.auth = {
      tokenExpiration: 7200,
      useSessions: true,
    };
    const token = await new SignJWT({
      id: "existing-user-id",
      collection: "users",
      email: "existing-user@example.com",
      ...(sid ? { sid } : {}),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7200 secs")
      .sign(new TextEncoder().encode(req.payload.secret));

    const authStrategy = createAuthStrategy(basePluginOptions(), "sub");
    const result = await authStrategy.authenticate({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
      payload: req.payload,
    });

    expect(result.user).toBeNull();
    expect(req.payload.create).not.toHaveBeenCalled();
  });

  it("keeps email in callback JWT when email identity conflicts with email exclusion", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    let issuedToken = "";
    const pluginOptions = basePluginOptions({
      excludeEmailFromJwtToken: true,
      successRedirect: jest.fn((_req, token) => {
        issuedToken = token;
        return "/admin";
      }),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;
    expect(response.status).toBe(302);
    expect(context.createdUser).toBeTruthy();

    context.foundUsers = [context.createdUser!];
    const authStrategy = createAuthStrategy(pluginOptions, "sub");
    const result = await authStrategy.authenticate({
      headers: new Headers({ Authorization: `Bearer ${issuedToken}` }),
      payload: req.payload,
    });

    expect(result.user).toEqual(
      expect.objectContaining({ email: "new-user@example.com" }),
    );
  });

  it("does not create missing users from the auth strategy", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    let issuedToken = "";
    const pluginOptions = basePluginOptions({
      successRedirect: jest.fn((_req, token) => {
        issuedToken = token;
        return "/admin";
      }),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;
    expect(response.status).toBe(302);
    expect(context.createdUser).toBeTruthy();

    context.foundUsers = [];
    (req.payload.create as jest.Mock).mockClear();
    const authStrategy = createAuthStrategy(pluginOptions, "sub");
    const result = await authStrategy.authenticate({
      headers: new Headers({ Authorization: `Bearer ${issuedToken}` }),
      payload: req.payload,
    });

    expect(result.user).toBeNull();
    expect(req.payload.create).not.toHaveBeenCalled();
    expect(req.payload.logger.warn).toHaveBeenCalledWith(
      "OAuth user not found in users for email: new-user@example.com",
    );
  });

  it("surfaces invalid JWT errors from the auth strategy", async () => {
    const context = createMockOAuthTestContext();
    const req = createCallbackRequest(context);
    const authStrategy = createAuthStrategy(basePluginOptions(), "sub");

    await expect(
      authStrategy.authenticate({
        headers: new Headers({ Authorization: "Bearer invalid-jwt" }),
        payload: req.payload,
      }),
    ).rejects.toThrow();
  });

  it("passes PKCE verifier cookie into the default token exchange", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    req.headers = new Headers({ cookie: "pkce_verifier=unit-pkce-verifier" });
    const originalFetch = global.fetch;
    const fetchMock = jest.fn(
      async () =>
        new Response(
          JSON.stringify({ access_token: "provider-access-token" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const pluginOptions = basePluginOptions({
      getToken: undefined,
      pkceEnabled: true,
    });

    try {
      const response = (await getGetCallbackHandler(pluginOptions)(
        req,
      )) as Response;

      expect(response.status).toBe(302);
      const tokenRequest = fetchMock.mock.calls[0][1];
      const tokenBody = new URLSearchParams(tokenRequest.body.toString());
      expect(tokenBody.get("code_verifier")).toBe("unit-pkce-verifier");
      expect(tokenBody.get("code")).toBe("callback-code-123");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it.each([
    {
      name: "email identity has no email",
      overrides: {},
      userInfo: { sub: "provider-user-123" },
      error: "Email not found in provider user info",
    },
    {
      name: "subject identity has no subject",
      overrides: { useEmailAsIdentity: false },
      userInfo: { email: "new-user@example.com" },
      error: "No sub found in provider user info",
    },
  ])(
    "redirects to failure when $name",
    async ({ overrides, userInfo, error }) => {
      const context = createMockOAuthTestContext({ foundUsers: [] });
      const req = createCallbackRequest(context);
      const pluginOptions = basePluginOptions({
        ...overrides,
        getUserInfo: jest.fn().mockResolvedValue(userInfo),
      });

      const response = (await getGetCallbackHandler(pluginOptions)(
        req,
      )) as Response;

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain(
        encodeURIComponent(error),
      );
      expect(req.payload.find).not.toHaveBeenCalled();
      expect(req.payload.create).not.toHaveBeenCalled();
      expect(pluginOptions.failureRedirect).toHaveBeenCalledWith(
        req,
        expect.any(Error),
      );
    },
  );

  it("redirects to failure when authorization code extraction fails", async () => {
    const context = createMockOAuthTestContext();
    const req = createCallbackRequest(context, "");
    req.query = {};
    req.searchParams = new URLSearchParams();
    const pluginOptions = basePluginOptions();

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("/admin/login?error=");
    expect(pluginOptions.getToken).not.toHaveBeenCalled();
    expect(pluginOptions.successRedirect).not.toHaveBeenCalled();
    expect(pluginOptions.failureRedirect).toHaveBeenCalledWith(
      req,
      expect.any(Error),
    );
  });

  it("redirects to failure when token exchange fails", async () => {
    const context = createMockOAuthTestContext();
    const req = createCallbackRequest(context);
    const pluginOptions = basePluginOptions({
      getToken: jest.fn().mockRejectedValue(new Error("token exchange failed")),
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(
      encodeURIComponent("token exchange failed"),
    );
    expect(pluginOptions.getUserInfo).not.toHaveBeenCalled();
    expect(req.payload.create).not.toHaveBeenCalled();
    expect(pluginOptions.failureRedirect).toHaveBeenCalledWith(
      req,
      expect.any(Error),
    );
  });

  it("redirects to failure when missing users must not be created", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    const pluginOptions = basePluginOptions({
      onUserNotFoundBehavior: "error",
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(
      encodeURIComponent("User not found: new-user@example.com"),
    );
    expect(req.payload.create).not.toHaveBeenCalled();
    expect(pluginOptions.successRedirect).not.toHaveBeenCalled();
    expect(pluginOptions.failureRedirect).toHaveBeenCalledWith(
      req,
      expect.any(Error),
    );
  });

  it("redirects to failure when missing user behavior is invalid", async () => {
    const context = createMockOAuthTestContext({ foundUsers: [] });
    const req = createCallbackRequest(context);
    const pluginOptions = basePluginOptions({
      onUserNotFoundBehavior: "skip" as PluginOptions["onUserNotFoundBehavior"],
    });

    const response = (await getGetCallbackHandler(pluginOptions)(
      req,
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(
      encodeURIComponent("Invalid onUserNotFoundBehavior: skip"),
    );
    expect(req.payload.create).not.toHaveBeenCalled();
    expect(pluginOptions.successRedirect).not.toHaveBeenCalled();
    expect(pluginOptions.failureRedirect).toHaveBeenCalledWith(
      req,
      expect.any(Error),
    );
  });
});
