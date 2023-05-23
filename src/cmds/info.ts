import envinfo from "@frat/envinfo";
import clipboardy from "clipboardy";
import { isOptedIn } from "cordova/src/telemetry.js";
import type { CommandModule } from "yargs";
import { getPlugins, loadPackageJson } from "../info/index.js";

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
        transform(x) {
          return {
            ...x,
            Cordova: {
              Telemetry: isOptedIn() ? "on" : "off",
            },
          };
        },
      },
    );

    if (opts.clipboard) {
      await clipboardy.write(info);
      console.log("Copied to clipboard.");
    }
  },
} as CommandModule<{}, { clipboard: boolean }>;
``;
