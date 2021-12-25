import jsonStableStringify from "json-stable-stringify";
import type { CommandModule } from "yargs";
import { loadPackageJson } from "./info.js";

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
  async handler() {
    const pkgJson = await loadPackageJson();
    if (formatPackageJson(pkgJson)) {
      await pkgJson.save();
    }
  },
} as CommandModule<{}, {}>;
