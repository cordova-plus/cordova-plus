import PackageJson from "@npmcli/package-json";
import type { PluginInfo } from "cordova-common";
import { getInstalledPlugins } from "cordova-lib/src/cordova/plugin/util.js";
import execa from "execa";
import _ from "lodash";
import type { CommandModule } from "yargs";
import { formatPackageJson } from "./fmt.js";

export async function getPlugins() {
  const installedPlugins = await getInstalledPlugins(".");
  const plugins: Array<PluginInfo & { pkg?: { name: string } }> = await Promise
    .all(
      installedPlugins.map(async (p) => {
        const { content: pkg } = await PackageJson.load(p.dir).catch(
          () => ({
            content: undefined,
          }),
        );
        return { ...p, pkg };
      }),
    );
  return plugins;
}

export default {
  command: "update",
  describe: "Update plugins",
  builder(yargs) {
    return yargs
      .option("plugin", {
        alias: "p",
        type: "array",
        desc: "Plugins to be updated",
        default: [],
      });
  },
  async handler(opts) {
    const plugins = await getPlugins();
    const pkgJson = await PackageJson.load("./");
    const { cordova } = pkgJson.content;

    for await (
      const plugin of plugins.filter((p) => opts.plugin.includes(p.id))
    ) {
      const pluginName = plugin.pkg?.name ?? plugin.id;
      console.log(`Updating plugin: ${pluginName}`);

      await execa("cordova", ["plugin", "rm", plugin.id], { reject: false });

      const args = ["plugin", "add", pluginName];
      const vars = _.get(cordova, ["plugins", plugin.id], {});
      for (const [k, v] of Object.entries(vars)) {
        args.push("--variable", `${k}=${v}`);
      }
      await execa("cordova", args);
    }

    if (formatPackageJson(pkgJson)) {
      await pkgJson.save();
    }
  },
} as CommandModule<{}, { plugin: Array<string> }>;
