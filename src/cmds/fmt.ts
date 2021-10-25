// @ts-expect-error
import PackageJson from "@npmcli/package-json";
import jsonStableStringify from "json-stable-stringify";
import type { CommandModule } from "yargs";

export default {
  command: "fmt",
  describe: "Format cordova property in package.json",
  builder(yargs) {
    return yargs.option("cwd", { type: "string" });
  },
  async handler(opts) {
    if (opts.cwd) {
      process.chdir(opts.cwd);
    }

    const pkgJson = await PackageJson.load("./");
    const { cordova } = pkgJson.content;
    if (!cordova) return;

    pkgJson.update({
      cordova: JSON.parse(jsonStableStringify(cordova)),
    });

    await pkgJson.save();
  },
} as CommandModule<{}, { cwd?: string }>;
