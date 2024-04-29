import { CollectionConfig } from "payload/types";
import { PluginTypes } from "./types";

export const modifyAuthCollection = (
  pluginOptions: PluginTypes,
  existingCollectionConfig: CollectionConfig,
  subFieldName: string
): CollectionConfig => {
  const existingSubField = existingCollectionConfig.fields.find(
    (field) => "name" in field && field.name === subFieldName
  );
  if (existingSubField) return existingCollectionConfig;
  return {
    ...existingCollectionConfig,
    fields: [
      ...existingCollectionConfig.fields,
      {
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
      },
    ],
  };
};
