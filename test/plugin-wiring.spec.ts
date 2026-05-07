import type { CollectionConfig, Config } from "payload";
import { OAuth2Plugin } from "../src/plugin";
import type { PluginOptions } from "../src/types";

const pluginOptions = (): PluginOptions => ({
  enabled: true,
  strategyName: "idempotent-provider",
  useEmailAsIdentity: true,
  serverURL: "http://localhost:3000",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  authorizePath: "/oauth/idempotent",
  callbackPath: "/oauth/idempotent/callback",
  authCollection: "users",
  tokenEndpoint: "https://provider.example.test/token",
  scopes: ["openid", "email"],
  providerAuthorizationUrl: "https://provider.example.test/authorize",
  getUserInfo: jest.fn(),
  successRedirect: jest.fn(),
  failureRedirect: jest.fn(),
});

const authCollection = (): CollectionConfig =>
  ({
    slug: "users",
    auth: { disableLocalStrategy: true, strategies: [] },
    fields: [],
    endpoints: [],
  }) as unknown as CollectionConfig;

const countNamedFields = (collection: CollectionConfig, name: string) =>
  collection.fields.filter((field) => "name" in field && field.name === name)
    .length;

const countEndpoints = (
  collection: CollectionConfig,
  path: string,
  method: string,
) =>
  (collection.endpoints || []).filter(
    (endpoint) => endpoint.path === path && endpoint.method === method,
  ).length;

const countStrategies = (collection: CollectionConfig, name: string) => {
  if (
    typeof collection.auth === "boolean" ||
    !collection.auth ||
    !Array.isArray(collection.auth.strategies)
  ) {
    return 0;
  }
  return collection.auth.strategies.filter((strategy) => strategy.name === name)
    .length;
};

describe("OAuth plugin collection wiring", () => {
  it("is idempotent and does not mutate the incoming collection", () => {
    const originalCollection = authCollection();
    const plugin = OAuth2Plugin(pluginOptions());

    const once = plugin({ collections: [originalCollection] } as Config);
    const twice = plugin(once as Config);
    const usersCollection = twice.collections?.find(
      (collection) => collection.slug === "users",
    );

    expect(usersCollection).toBeDefined();
    expect(originalCollection.fields).toHaveLength(0);
    expect(originalCollection.endpoints).toHaveLength(0);
    expect(countNamedFields(usersCollection!, "sub")).toBe(1);
    expect(countNamedFields(usersCollection!, "email")).toBe(1);
    expect(countEndpoints(usersCollection!, "/oauth/idempotent", "get")).toBe(
      1,
    );
    expect(
      countEndpoints(usersCollection!, "/oauth/idempotent/callback", "get"),
    ).toBe(1);
    expect(
      countEndpoints(usersCollection!, "/oauth/idempotent/callback", "post"),
    ).toBe(1);
    expect(countStrategies(usersCollection!, "idempotent-provider")).toBe(1);
  });
});
