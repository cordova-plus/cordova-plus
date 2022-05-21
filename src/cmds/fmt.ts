import PackageJson from "@npmcli/package-json";
import jsonStableStringify from "json-stable-stringify";
import type { CommandModule } from "yargs";

export function formatPackageJson(pkgJson: PackageJson) {
  const { cordova } = pkgJson.content;
  if (!cordova) return false;

  const d = JSON.parse(jsonStableStringify(cordova));
  if (Array.isArray(d.platforms)) {
    d.platforms.sort();
  }
  pkgJson.update({
    cordova: d,
  });

  return true;
}

export async function savePackageJson(pkgJson: PackageJson) {
  if (formatPackageJson(pkgJson)) {
    await pkgJson.save();
  }
}

export default {
  command: "fmt [dirs..]",
  describe: "Format cordova property in package.json",
  builder(yargs) {
    return yargs.positional("dirs", {
      array: true,
      type: "string",
      defaults: ["."],
    });
  },
  async handler(args) {
    const pkgs: PackageJson[] = await Promise.all(
      args.dirs.map(PackageJson.load),
    );
    await Promise.all(pkgs.map(savePackageJson));
  },
} as CommandModule<{}, { dirs: Array<string> }>;
