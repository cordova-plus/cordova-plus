declare module "@npmcli/package-json";

declare module "cordova-common" {
  interface Plugin {
    name: string;
    spec: string;
    variables: {
      [k: string]: string;
    };
  }

  export class ConfigParser {
    constructor(path: string);
    getPlugin(id: string): Plugin | undefined;
    getPluginIdList(): string[];
    getPlugins(): Plugin[];
    getPreference(name: string, platform: string): string;
  }

  export interface PluginInfo {
    dir: string;
    filepath: string;
    id: string;
    name: string;
    version: string;
    description: string;
  }
}

declare module "cordova-lib/src/cordova/plugin/util.js" {
  import { PluginInfo } from "cordova-common";

  export function getInstalledPlugins(
    projectRoot: string,
  ): Promise<Array<PluginInfo>>;
}
