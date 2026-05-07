import type {
  CollectionConfig,
  Config,
  Endpoint,
  PayloadRequest,
} from "payload";
import { OAuth2Plugin } from "../src/plugin";
import {
  createMockOAuthTestContext,
  createMockPayload,
} from "./base-oauth-test";
import {
  createMockExternalFetch,
  createProviderPluginOptions,
  jsonResponse,
  oauthProviderTestCases,
  type OAuthProviderTestCase,
} from "./oauth-provider-test-cases";

const createAuthCollection = (): CollectionConfig =>
  ({
    slug: "users",
    auth: { tokenExpiration: 7200 },
    fields: [{ name: "email", type: "email" }],
    hooks: {
      beforeLogin: [],
      afterLogin: [],
    },
  }) as unknown as CollectionConfig;

const buildPluginCollection = (provider: OAuthProviderTestCase) => {
  const plugin = OAuth2Plugin(createProviderPluginOptions(provider));
  const config = plugin({ collections: [createAuthCollection()] } as Config);
  const usersCollection = config.collections?.find(
    (collection) => collection.slug === "users",
  );
  if (!usersCollection) throw new Error("users collection not found");
  return usersCollection;
};

const findEndpoint = (
  endpoints: Endpoint[] | undefined,
  path: string,
  method: string,
) => {
  const endpoint = endpoints?.find(
    (candidate) => candidate.path === path && candidate.method === method,
  );
  if (!endpoint) throw new Error(`${method} ${path} endpoint not found`);
  return endpoint;
};

const createCallbackRequest = (
  provider: OAuthProviderTestCase,
  usersCollection: CollectionConfig,
): PayloadRequest => {
  const context = createMockOAuthTestContext({ foundUsers: [] });
  const payload = createMockPayload(context);
  payload.collections.users.config = usersCollection;

  if (provider.callbackMethod === "POST") {
    const body = `code=${encodeURIComponent(`${provider.strategyName}-auth-code`)}`;
    return {
      payload,
      headers: new Headers({
        "content-type": "application/x-www-form-urlencoded",
      }),
      searchParams: new URLSearchParams(),
      query: {},
      method: "POST",
      context: {},
      user: null,
      text: async () => body,
    } as unknown as PayloadRequest;
  }

  const code = `${provider.strategyName}-auth-code`;
  return {
    payload,
    headers: new Headers(),
    searchParams: new URLSearchParams({ code }),
    query: { code },
    method: "GET",
    context: {},
    user: null,
  } as unknown as PayloadRequest;
};

describe("Mocked external provider integration", () => {
  describe.each(oauthProviderTestCases)("$name", (provider) => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = createMockExternalFetch(
        provider,
      ) as unknown as typeof fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("wires provider authorize and callback endpoints through the plugin", async () => {
      const usersCollection = buildPluginCollection(provider);
      const authorizeEndpoint = findEndpoint(
        usersCollection.endpoints,
        provider.authorizePath,
        "get",
      );
      const callbackEndpoint = findEndpoint(
        usersCollection.endpoints,
        provider.callbackPath,
        provider.callbackMethod.toLowerCase(),
      );

      const authorizeResponse = (await authorizeEndpoint.handler({
        payload: createMockPayload(createMockOAuthTestContext()),
        headers: new Headers(),
        searchParams: new URLSearchParams({ state: "provider-state" }),
        query: { state: "provider-state" },
        method: "GET",
        context: {},
        user: null,
      } as unknown as PayloadRequest)) as Response;

      expect(authorizeResponse.status).toBe(302);
      const authorizeUrl = new URL(authorizeResponse.headers.get("Location")!);
      expect(authorizeUrl.origin + authorizeUrl.pathname).toBe(
        provider.providerAuthorizationUrl,
      );
      expect(authorizeUrl.searchParams.get("client_id")).toBe(
        provider.clientId,
      );
      expect(authorizeUrl.searchParams.get("scope")).toBe(
        provider.scopes.join(" "),
      );
      expect(authorizeUrl.searchParams.get("response_type")).toBe("code");
      expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(
        `${provider.serverURL}/api/users${provider.callbackPath}`,
      );
      expect(authorizeUrl.searchParams.get("state")).toBe("provider-state");
      if (provider.responseMode) {
        expect(authorizeUrl.searchParams.get("response_mode")).toBe(
          provider.responseMode,
        );
      }

      const callbackRequest = createCallbackRequest(provider, usersCollection);
      const callbackResponse = (await callbackEndpoint.handler(
        callbackRequest,
      )) as Response;

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.get("Location")).toBe(
        `/admin/${provider.strategyName}`,
      );
      expect(callbackResponse.headers.get("Set-Cookie")).toContain(
        "payload-token=",
      );
      expect(global.fetch).toHaveBeenCalledWith(
        provider.tokenEndpoint,
        expect.objectContaining({ method: "POST" }),
      );
      if (provider.userInfoEndpoint) {
        expect(global.fetch).toHaveBeenCalledWith(
          provider.userInfoEndpoint,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining("Bearer "),
            }),
          }),
        );
      }
      if (provider.groupsEndpoint) {
        expect(global.fetch).toHaveBeenCalledWith(
          provider.groupsEndpoint,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining("Bearer "),
            }),
          }),
        );
      }
      expect(callbackRequest.payload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "users",
          data: expect.objectContaining({
            email: provider.userInfo.email,
            sub: provider.userInfo.sub,
            collection: "users",
          }),
        }),
      );
    });

    it("redirects to failure when mocked token exchange fails", async () => {
      const usersCollection = buildPluginCollection(provider);
      const callbackEndpoint = findEndpoint(
        usersCollection.endpoints,
        provider.callbackPath,
        provider.callbackMethod.toLowerCase(),
      );
      global.fetch = jest.fn(async (url: string | URL | Request) => {
        const requestUrl = String(url);
        if (requestUrl === provider.tokenEndpoint) {
          return jsonResponse({ error: "invalid_grant" }, 400);
        }
        return jsonResponse({ error: "unexpected_request" }, 500);
      }) as unknown as typeof fetch;

      const callbackRequest = createCallbackRequest(provider, usersCollection);
      const callbackResponse = (await callbackEndpoint.handler(
        callbackRequest,
      )) as Response;

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.get("Location")).toContain(
        `/admin/login?provider=${provider.strategyName}&error=`,
      );
      expect(callbackResponse.headers.get("Set-Cookie")).toBeNull();
      expect(callbackRequest.payload.create).not.toHaveBeenCalled();
      expect(callbackRequest.payload.update).not.toHaveBeenCalled();
    });
  });
});
