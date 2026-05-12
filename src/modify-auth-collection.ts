import type { AuthStrategy, CollectionConfig } from "payload";
import { createAuthStrategy } from "./auth-strategy";
import { createAuthorizeEndpoint } from "./authorize-endpoint";
import { createCallbackEndpoint } from "./callback-endpoint";
import { resolveOAuthConfig, type OAuthConfigInput } from "./oauth-config";

export const modifyAuthCollection = (
  input: OAuthConfigInput,
  existingCollectionConfig: CollectionConfig,
  subFieldNameOverride?: string,
): CollectionConfig => {
  const config = resolveOAuthConfig(input, {
    subFieldName: subFieldNameOverride,
  });

  // /////////////////////////////////////
  // modify fields
  // /////////////////////////////////////

  // add sub fields
  const fields = [...(existingCollectionConfig.fields || [])];
  const existingSubField = fields.find(
    (field) => "name" in field && field.name === config.subFieldName,
  );
  if (!existingSubField) {
    if (config.raw.subField) {
      fields.push(config.raw.subField);
    } else {
      fields.push({
        name: config.subFieldName,
        type: "text",
        index: true,
        access: {
          read: () => true,
          create: () => true,
          update: () => false,
        },
      });
    }
  }

  // add email field if disableLocalStrategy is set
  // and we don't have an email field
  if (
    typeof existingCollectionConfig.auth !== "boolean" &&
    existingCollectionConfig.auth !== undefined &&
    existingCollectionConfig.auth.disableLocalStrategy === true &&
    config.useEmailAsIdentity === true &&
    fields.every((field: any) => field.name !== "email")
  ) {
    fields.push({
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
    });
  }

  // /////////////////////////////////////
  // modify strategies
  // /////////////////////////////////////

  const authStrategy = createAuthStrategy(config);
  let strategies: AuthStrategy[] = [];
  if (
    typeof existingCollectionConfig.auth !== "boolean" &&
    existingCollectionConfig.auth !== undefined &&
    Array.isArray(existingCollectionConfig.auth.strategies)
  ) {
    strategies = existingCollectionConfig.auth.strategies.filter(
      (strategy) => strategy.name !== config.strategyName,
    );
  }
  strategies.push(authStrategy);

  // /////////////////////////////////////
  // modify endpoints
  // /////////////////////////////////////
  const endpoints = [...(existingCollectionConfig.endpoints || [])];
  const oauthEndpoints = [
    createAuthorizeEndpoint(config),
    ...createCallbackEndpoint(config),
  ];
  oauthEndpoints.forEach((oauthEndpoint) => {
    const existingEndpoint = endpoints.find(
      (endpoint) =>
        endpoint.method === oauthEndpoint.method &&
        endpoint.path === oauthEndpoint.path,
    );
    if (!existingEndpoint) endpoints.push(oauthEndpoint);
  });

  return {
    ...existingCollectionConfig,
    fields,
    endpoints,
    auth: {
      ...(typeof existingCollectionConfig.auth === "object" &&
      existingCollectionConfig.auth !== null
        ? existingCollectionConfig.auth
        : {}),
      strategies,
    },
  };
};
