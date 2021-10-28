import browserSync from "browser-sync";
import cordovaLib from "cordova-lib";
import cordovaUtil from "cordova-lib/src/cordova/util.js";
import et from "elementtree";
import type { CommandModule } from "yargs";
import onExit from "signal-exit";

function loadCordovaConfig() {
  const rootDir = cordovaUtil.getProjectRoot();
  const xml = cordovaUtil.projectConfig(rootDir);
  if (xml === false) {
    throw new Error();
  }
  return new cordovaLib.configparser(xml);
}

function updateContentSrc(src: string | null) {
  const cfg = loadCordovaConfig();
  const el = cfg.doc.find("content");
  if (!el) return;
  const a = el.attrib;

  const elNav = cfg.doc.findall("./allow-navigation").find((e) => e.attrib.dev);

  if (src) { // update src
    if (a.src_) return;

    a.src_ = a.src;
    a.src = src;

    if (!elNav) {
      et.SubElement((cfg.doc as any).getroot(), "allow-navigation", {
        href: "http://*/*",
        dev: "true",
      });
    }
  } else if (a.src_) { // restore src
    a.src = a.src_;
    delete a.src_;

    if (elNav) {
      cfg.doc.getroot().remove(elNav);
    }
  }

  cfg.write();
}

export default {
  command: "dev",
  describe: "Run live reload server",
  builder(yargs) {
    return yargs
      .option("cwd", { type: "string" })
      .option("platform", {
        alias: "p",
        choices: ["android", "browser", "ios"],
        desc: "Targeting platform",
        default: "browser",
      });
  },
  async handler(opts) {
    if (opts.cwd) {
      process.chdir(opts.cwd);
    }

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
    }, (err, r: any) => {
      if (err) {
        console.error(err);
        return;
      }
      const externalUrl = r.options.getIn(["urls", "external"]);
      updateContentSrc(externalUrl);

      onExit(() => {
        updateContentSrc(null);
      });
    });
  },
} as CommandModule<
  {},
  { cwd?: string; platform: "android" | "browser" | "ios" }
>;
