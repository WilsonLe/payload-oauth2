import type { Plugin } from "payload/config";
import { createAuthorizeEndpoint } from "./authorize-endpoint";
import { createCallbackEndpoint } from "./callback-endpoint";
import AfterDashboard from "./components/AfterDashboard";
import newCollection from "./newCollection";
import { onInitExtension } from "./onInitExtension";
import type { PluginTypes } from "./types";

export const oAuthPlugin =
  (pluginOptions: PluginTypes): Plugin =>
  (incomingConfig) => {
    let config = { ...incomingConfig };

    config.admin = {
      ...(config.admin || {}),

      // Add additional admin config here
      components: {
        ...(config.admin?.components || {}),
        // Add additional admin components here
        afterDashboard: [
          ...(config.admin?.components?.afterDashboard || []),
          AfterDashboard,
        ],
      },
    };

    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (pluginOptions.enabled === false) {
      return config;
    }

    config.collections = [
      ...(config.collections || []),
      // Add additional collections here
      newCollection, // delete this line to remove the example collection
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
