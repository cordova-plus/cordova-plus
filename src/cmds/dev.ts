import assert from "assert";
import browserSync from "browser-sync";
import cordovaLib from "cordova-lib";
import cordovaUtil from "cordova-lib/src/cordova/util.js";
import et from "elementtree";
import execa from "execa";
import onExit from "signal-exit";
import type { CommandModule } from "yargs";

function loadCordovaConfig() {
  const rootDir = cordovaUtil.getProjectRoot();
  const xml = cordovaUtil.projectConfig(rootDir);
  if (xml === false) {
    throw new Error();
  }
  return new cordovaLib.configparser(xml);
}

function updateCordovaConfig(opts: { src: string; id?: string } | null) {
  const cfg = loadCordovaConfig();
  const el = cfg.doc.find("content");
  if (!el) return false;
  const root = cfg.doc.getroot();
  const a = el.attrib;

  const elNav = cfg.doc.findall("./allow-navigation").find((e) => e.attrib.dev);

  const updateSrc = [() => {
    assert(opts);
    a.src_ = a.src;
    a.src = opts.src;
  }, () => {
    a.src = a.src_;
    delete a.src_;
  }];

  const updateId = [() => {
    assert(opts);
    if (!opts.id) return;

    root.attrib.id_ = root.attrib.id;
    root.attrib.id = opts.id;

    if (cfg.android_packageName()) return;

    root.attrib["android-packageName_dev"] = "true";
    root.attrib["android-packageName"] = root.attrib.id_;
  }, () => {
    if (!root.attrib.id_) return;

    root.attrib.id = root.attrib.id_;
    delete root.attrib.id_;

    if (root.attrib["android-packageName_dev"]) {
      delete root.attrib["android-packageName"];
      delete root.attrib["android-packageName_dev"];
    }
  }];

  const updateNav = [() => {
    if (!elNav) {
      et.SubElement(root, "allow-navigation", {
        href: "http://*/*",
        dev: "true",
      });
    }
  }, () => {
    if (elNav) {
      cfg.doc.getroot().remove(elNav);
    }
  }];

  const updates = [updateSrc, updateNav, updateId];

  if (opts) { // update for dev
    if (a.src_) return;
    updates.map(([f]) => f());
  } else if (a.src_) { // restore
    updates.map(([, f]) => f());
  } else {
    return false;
  }

  cfg.write();
  return true;
}

export default {
  command: "dev",
  describe: "Run live reload server",
  builder(yargs) {
    return yargs
      .option("id", { type: "string", desc: "Update widget id" })
      .option("platform", {
        alias: "p",
        choices: ["android", "browser", "ios"],
        desc: "Targeting platform",
        default: "browser",
      });
  },
  async handler(opts) {
    const bs = browserSync.create();

    const server = {
      android: "./platforms/android/assets/www",
      browser: "./platforms/browser/www",
      ios: "./platforms/ios/www",
    }[opts.platform];

    bs.init({
      server,
      serveStatic: ["./www"],
      files: ["./www"],
      cors: true,
      ghostMode: false,
      notify: false,
      open: false,
      reloadOnRestart: false,
      rewriteRules: [
        {
          match: /<meta[^>]*?\shttp-equiv="Content-Security-Policy"[^>]*?>/g,
          fn() {
            return "";
          },
        },
      ],
    }, async (err, r: any) => {
      if (err) {
        console.error(err);
        return;
      }
      const externalUrl = r.options.getIn(["urls", "external"]);
      const updated = updateCordovaConfig({ src: externalUrl, id: opts.id });

      onExit(() => {
        updateCordovaConfig(null);
      });

      if (updated) {
        await execa("cordova", [
          "prepare",
          opts.platform,
          "--no-telemetry",
          "--no-update-notifier",
        ]);
      }
    });
  },
} as CommandModule<
  {},
  { id?: string; platform: "android" | "browser" | "ios" }
>;
