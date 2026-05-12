import type { Plugin } from "payload";
import { modifyAuthCollection } from "./modify-auth-collection";
import { resolveOAuthConfig, warnOAuthConfig } from "./oauth-config";
import type { PluginOptions } from "./types";

export const OAuth2Plugin =
  (pluginOptions: PluginOptions): Plugin =>
  (incomingConfig) => {
    let config = { ...incomingConfig };

    if (pluginOptions.enabled === false) {
      return config;
    }

    const oauthConfig = resolveOAuthConfig(pluginOptions);
    warnOAuthConfig(oauthConfig);

    // /////////////////////////////////////
    // Modify auth collection
    // /////////////////////////////////////
    const authCollection = config.collections?.find(
      (collection) => collection.slug === oauthConfig.authCollection,
    );
    if (!authCollection) {
      throw new Error(
        `The collection with the slug "${oauthConfig.authCollection}" was not found.`,
      );
    }
    const modifiedAuthCollection = modifyAuthCollection(
      oauthConfig,
      authCollection,
    );

    config.collections = [
      ...(config.collections?.filter(
        (collection) => collection.slug !== oauthConfig.authCollection,
      ) || []),
      modifiedAuthCollection,
    ];

    return config;
  };
