import { execa } from "execa";
import _ from "lodash";
import type { CommandModule } from "yargs";
import { getPlugins, loadPackageJson } from "../info/index.js";
import { savePackageJson } from "./fmt.js";

function runCordova(args: string[], opts?: any) {
  const cwd = process.cwd();
  return execa("cordova", [...args], {
    cwd,
    ...opts,
    env: { NODE_OPTIONS: "" },
  });
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
    const [plugins, pkgJson] = await Promise.all([
      getPlugins(),
      loadPackageJson(),
    ]);
    const { cordova } = pkgJson.content;

    for await (
      const plugin of plugins.filter((p) =>
        opts.plugin.length === 0 ? true : opts.plugin.includes(p.id)
      )
    ) {
      const pluginName = plugin.pkg?.name ?? plugin.id;
      console.log(`Updating plugin: ${pluginName}`);

      await runCordova(["plugin", "rm", plugin.id], { reject: false });

      const args = ["plugin", "add", pluginName];
      const vars = _.get(cordova, ["plugins", plugin.id], {});
      for (const [k, v] of Object.entries(vars)) {
        args.push("--variable", `${k}=${v}`);
      }
      await runCordova(args);
    }

    savePackageJson(pkgJson);
  },
} as CommandModule<{}, { plugin: Array<string> }>;
