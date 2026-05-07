import type { PayloadRequest } from "payload";
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

  it("updates an existing user through the callback endpoint interface", async () => {
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
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "users",
        id: "existing-user-id",
        data: expect.objectContaining({
          email: existingUser.email,
          sub: existingUser.sub,
          collection: "users",
          name: "Updated User",
        }),
        showHiddenFields: true,
      }),
    );
    expect(pluginOptions.successRedirect).toHaveBeenCalledWith(
      req,
      expect.any(String),
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
});
