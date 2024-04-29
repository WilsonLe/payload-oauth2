import type { Plugin } from "payload/config";
import { modifyAuthCollection } from "./modify-auth-collection";
import type { PluginTypes } from "./types";

export const oAuthPlugin =
  (pluginOptions: PluginTypes): Plugin =>
  (incomingConfig) => {
    let config = { ...incomingConfig };

    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (pluginOptions.enabled === false) {
      return config;
    }

    // /////////////////////////////////////
    // Modify admin panel
    // /////////////////////////////////////
    const afterLogin = config.admin?.components?.afterLogin || [];
    if (pluginOptions.OAuthLoginButton) {
      afterLogin.push(pluginOptions.OAuthLoginButton);
    }

    config.admin = {
      ...(config.admin || {}),

      // Add additional admin config here
      components: {
        ...(config.admin?.components || {}),
        // Add additional admin components here
        afterLogin,
      },
    };

    // /////////////////////////////////////
    // Modify auth collection
    // /////////////////////////////////////
    const authCollectionSlug = pluginOptions.authCollection || "users";
    const subFieldName = pluginOptions.subFieldName || "sub";
    const authCollection = config.collections?.find(
      (collection) => collection.slug === authCollectionSlug
    );
    if (!authCollection) {
      throw new Error(
        `The collection with the slug "${authCollectionSlug}" was not found.`
      );
    }
    const modifiedAuthCollection = modifyAuthCollection(
      pluginOptions,
      authCollection,
      subFieldName
    );

    config.collections = [
      ...(config.collections?.filter(
        (collection) => collection.slug !== authCollectionSlug
      ) || []),
      // Add additional collections here
      modifiedAuthCollection,
    ];

    return config;
  };
