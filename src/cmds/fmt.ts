import PackageJson from "@npmcli/package-json";
import jsonStableStringify from "json-stable-stringify";
import type { CommandModule } from "yargs";

export function formatPackageJson(pkgJson: any) {
  const { cordova } = pkgJson.content;
  if (!cordova) return false;

  pkgJson.update({
    cordova: JSON.parse(jsonStableStringify(cordova)),
  });

  return true;
}

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
    if (formatPackageJson(pkgJson)) {
      await pkgJson.save();
    }
  },
} as CommandModule<{}, { cwd?: string }>;
