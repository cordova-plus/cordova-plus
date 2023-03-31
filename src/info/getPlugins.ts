import type { PluginInfo } from "cordova-common";
import { getInstalledPlugins } from "cordova-lib/src/cordova/plugin/util.js";
import { loadPackageJson } from "./loadPackageJson.js";

export async function getPlugins(projectRoot = ".") {
  const installedPlugins = await getInstalledPlugins(projectRoot);
  const plugins: Array<
    PluginInfo & { pkg?: { name: string; version: string } }
  > = await Promise
    .all(
      installedPlugins.map(async (p) => {
        const { content: pkg } = await loadPackageJson(p.dir).catch(
          () => ({
            content: undefined,
          }),
        );
        return { ...p, pkg };
      }),
    );
  return plugins;
}
