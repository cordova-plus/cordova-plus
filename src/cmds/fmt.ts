import type PackageJson from "@npmcli/package-json";
import jsonStableStringify from "json-stable-stringify";
import type { CommandModule } from "yargs";
import { loadPackageJson } from "./info.js";

export function formatPackageJson(pkgJson: PackageJson) {
  const { cordova } = pkgJson.content;
  if (!cordova) return false;

  pkgJson.update({
    cordova: JSON.parse(jsonStableStringify(cordova)),
  });

  return true;
}

export async function savePackageJson(pkgJson: PackageJson) {
  if (formatPackageJson(pkgJson)) {
    await pkgJson.save();
  }
}

export default {
  command: "fmt",
  describe: "Format cordova property in package.json",
  async handler() {
    const pkgJson = await loadPackageJson();
    await savePackageJson(pkgJson);
  },
} as CommandModule<{}, {}>;
