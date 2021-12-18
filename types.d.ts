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
    setPackageName(id: string): void;
    android_packageName(): string | undefined;
    getAttribute(attr: string): any | undefined;
    getPlugin(id: string): Plugin | undefined;
    getPluginIdList(): string[];
    getPlugins(): Plugin[];
    getPreference(name: string, platform: string): string;
    getAllowNavigations(): any[];
    write(): void;
  }

  export class PluginInfo {
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

  const _default: {
    binname: string;
    configparser: typeof ConfigParser;
    PluginInfo: typeof PluginInfo;
    cordova: {
      findProjectRoot(opt_startDir?: string | undefined): any;
      serve(port: string, hookOpts: any): any;
      projectMetadata: {
        getPlatforms(projectRoot: string): Promise<{
          name: string;
        }>;
      };
    };
  };
  export default _default;
}

declare module "cordova-lib/src/cordova/util.js" {
  const _default: {
    isCordova(dir?: string | undefined): string | false;
    projectConfig(projectDir: string): string | false;
    getProjectRoot(): string;
  };
  export default _default;
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

declare module "cordova/channel" {
  class Channel {
    constructor(type: string, sticky: boolean);
    subscribe(eventListenerOrFunction: any, eventListener?: any): void;
    unsubscribe(eventListenerOrFunction: any): void;
    fire(): void;
  }

  const _default: {
    createSticky(type: string): Channel;
    waitForInitialization(feature: string): void;
    initializationComplete(feature: string): void;
    onCordovaReady: Channel;
  };
  export default _default;
}

declare module "cordova/exec" {
  import cordova from "cordova";

  export default cordova.exec;
}

interface Cordova {
  fireDocumentEvent(eventName: string, data?: any): void;
}
