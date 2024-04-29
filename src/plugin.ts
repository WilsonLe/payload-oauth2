import type { Plugin } from "payload/config";
import { createAuthorizeEndpoint } from "./authorize-endpoint";
import { createCallbackEndpoint } from "./callback-endpoint";
import { modifyAuthCollection } from "./modify-auth-collection";
import { onInitExtension } from "./onInitExtension";
import type { PluginTypes } from "./types";

export const oAuthPlugin =
  (pluginOptions: PluginTypes): Plugin =>
  (incomingConfig) => {
    let config = { ...incomingConfig };

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

    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (pluginOptions.enabled === false) {
      return config;
    }

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

    config.endpoints = [
      ...(config.endpoints || []),
      // Add additional endpoints here
      createAuthorizeEndpoint(pluginOptions),
      createCallbackEndpoint(pluginOptions),
    ];

    config.globals = [
      ...(config.globals || []),
      // Add additional globals here
    ];

    config.hooks = {
      ...(config.hooks || {}),
      // Add additional hooks here
    };

    config.onInit = async (payload) => {
      if (incomingConfig.onInit) await incomingConfig.onInit(payload);
      // Add additional onInit code by using the onInitExtension function
      onInitExtension(pluginOptions, payload);
    };

    return config;
  };
