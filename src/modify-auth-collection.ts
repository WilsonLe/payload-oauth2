import { CollectionConfig } from "payload/types";
import { createAuthorizeEndpoint } from "./authorize-endpoint";
import { createCallbackEndpoint } from "./callback-endpoint";
import { PluginTypes } from "./types";

export const modifyAuthCollection = (
  pluginOptions: PluginTypes,
  existingCollectionConfig: CollectionConfig,
  subFieldName: string
): CollectionConfig => {
  // /////////////////////////////////////
  // modify fields
  // /////////////////////////////////////

  const fields = existingCollectionConfig.fields || [];
  const existingSubField = fields.find(
    (field) => "name" in field && field.name === subFieldName
  );
  if (!existingSubField) {
    fields.push({
      name: subFieldName,
      type: "text",
      required: true,
      unique: true,
      index: true,
      access: {
        read: () => true,
        create: () => true,
        update: () => false,
      },
    });
  }

  // /////////////////////////////////////
  // modify endpoints
  // /////////////////////////////////////
  const endpoints = existingCollectionConfig.endpoints || [];
  endpoints.push(createAuthorizeEndpoint(pluginOptions));
  endpoints.push(createCallbackEndpoint(pluginOptions));
  return {
    ...existingCollectionConfig,
    fields,
    endpoints,
  };
};
