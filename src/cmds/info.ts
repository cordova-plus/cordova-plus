import envinfo from "@frat/envinfo";
import PackageJson from "@npmcli/package-json";
import clipboardy from "clipboardy";
import type { CommandModule } from "yargs";
import { getPlugins } from "./update.js";

export function loadPackageJson(root = "./") {
  return PackageJson.load(root);
}

export default {
  command: "info",
  describe: "Get relevant version info about OS, toolchain and libraries",
  builder(yargs) {
    return yargs
      .option("clipboard", {
        type: "boolean",
        desc: "Copy the environment report output to the clipboard",
        default: true,
      });
  },
  async handler(opts) {
    const [plugins, pkgJson] = await Promise.all([
      getPlugins(),
      loadPackageJson(),
    ]);
    const deps = {
      ...pkgJson.content.devDependencies,
      ...pkgJson.content.dependencies,
    };
    const npmPackages = [
      "cordova",
      "ionic",
      "typescript",
    ].concat(
      Object.keys(deps).filter((x) =>
        x.startsWith("cordova-") || x.startsWith("ionic-") ||
        x.startsWith("@ionic/")
      ),
    ).concat(
      plugins.filter(({ pkg }) => pkg).map(({ pkg }) => pkg!.name),
    );

    const info = await envinfo.run(
      {
        Binaries: ["Node", "Yarn", "npm", "Watchman"],
        IDEs: ["Xcode", "Android Studio"],
        Languages: ["Java"],
        Managers: ["CocoaPods"],
        SDKs: ["iOS SDK", "Android SDK"],
        System: ["OS", "CPU", "Memory", "Shell"],
        Utilities: ["Clang"],
        npmGlobalPackages: ["cordova", "ionic"],
        npmPackages,
      },
      {
        console: true,
      },
    );

    if (opts.clipboard) {
      await clipboardy.write(info);
      console.log("Copied to clipboard.");
    }
  },
} as CommandModule<{}, { clipboard: boolean }>;
``;
