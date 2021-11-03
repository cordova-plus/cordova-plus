declare module "@npmcli/package-json" {
  export default class PackageJson {
    static load(path: string): Promise<PackageJson>;

    get content(): any;

    load(path: string): Promise<this>;

    save(): Promise<void>;
  }
}

declare module "cordova-common" {
  import { ElementTree } from "elementtree";

  interface Plugin {
    name: string;
    spec: string;
    variables: {
      [k: string]: string;
    };
  }

  export class ConfigParser {
    constructor(path: string);
    doc: ElementTree;
    name(): string;
    packageName(): string | undefined;
    setPackageName(id: string);
    android_packageName(): string | undefined;
    getAttribute(attr: string): any | undefined;
    getPlugin(id: string): Plugin | undefined;
    getPluginIdList(): string[];
    getPlugins(): Plugin[];
    getPreference(name: string, platform: string): string;
    getAllowNavigations(): any[];
    write();
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

declare module "cordova-lib" {
  import { ConfigParser, PluginInfo } from "cordova-common";

  export default {
    binname: string,
    configparser: ConfigParser,
    PluginInfo,
    cordova: {
      findProjectRoot(opt_startDir?: srting);,
      serve(port: string, hookOpts: any);,
      projectMetadata: {
        getPlatforms(projectRoot: string): Promise<{ name: string }>;,
      },
    },
  };
}

declare module "cordova-lib/src/cordova/util.js" {
  export default {
    isCordova(dir?: string): string | false;,
    projectConfig(projectDir: string): string | false;,
    getProjectRoot(): string;,
  };
}

declare module "cordova-lib/src/cordova/plugin/util.js" {
  import { PluginInfo } from "cordova-common";

  export function getInstalledPlugins(
    projectRoot: string,
  ): Promise<Array<PluginInfo>>;
}

declare module "cordova-serve";

declare module "cordova-serve/src/util.js" {
  export type platforms = Record<string, { www_dir: string }>;

  export function getPlatformWwwRoot(
    cordovaProjectRoot: string,
    platformName: string,
  ): string;
}
