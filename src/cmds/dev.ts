import browserSync from "browser-sync";
import cordovaLib from "cordova-lib";
import cordovaUtil from "cordova-lib/src/cordova/util.js";
import { getPlatformWwwRoot, platforms } from "cordova-serve/src/util.js";
import et from "elementtree";
import { execa } from "execa";
import assert from "node:assert";
import http from "node:http";
import serveHandler from "serve-handler";
import onExit from "signal-exit";
import { Logger } from "tslog";
import uaParse from "ua-parser-js";
import type { CommandModule } from "yargs";

const log = new Logger({
  displayFilePath: "hidden",
  displayFunctionName: false,
});

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

  const updateSrc = [
    () => {
      assert(opts);
      a.src_ = a.src;
      a.src = opts.src;
    },
    () => {
      a.src = a.src_;
      delete a.src_;
    },
  ];

  const updateId = [
    () => {
      assert(opts);
      if (!opts.id) return;

      root.attrib.id_ = root.attrib.id;
      root.attrib.id = opts.id.startsWith(".")
        ? root.attrib.id + opts.id
        : opts.id;

      log.info(`Change widget id to "${root.attrib.id}"`);

      if (cfg.android_packageName()) return;

      root.attrib["android-packageName_dev"] = "true";
      root.attrib["android-packageName"] = root.attrib.id_;
    },
    () => {
      if (!root.attrib.id_) return;

      root.attrib.id = root.attrib.id_;
      delete root.attrib.id_;

      if (root.attrib["android-packageName_dev"]) {
        delete root.attrib["android-packageName"];
        delete root.attrib["android-packageName_dev"];
      }
    },
  ];

  const updateNav = [
    () => {
      if (!elNav) {
        et.SubElement(root, "allow-navigation", {
          href: "http://*/*",
          dev: "true",
        });
      }
    },
    () => {
      if (elNav) {
        cfg.doc.getroot().remove(elNav);
      }
    },
  ];

  const updates = [updateSrc, updateNav, updateId];

  if (opts) {
    // update for dev
    if (a.src_) return;
    updates.map(([f]) => f());
  } else if (a.src_) {
    // restore
    updates.map(([, f]) => f());
  } else {
    return false;
  }

  cfg.write();
  return true;
}

function resolvePlatform(userAgent?: string): keyof platforms {
  const ua = uaParse(userAgent);
  const platform = ua.os.name?.toLowerCase();
  switch (platform) {
    case "android":
    case "ios":
      return platform;
  }
  return "browser";
}

export default {
  command: "dev",
  describe: "Run live reload server",
  builder(yargs) {
    return yargs.option("id", {
      type: "string",
      desc: "Update widget id for developement",
    }).example(
      "$0 dev --id .dev",
      "Development with suffix `.dev` as widget id",
    );
  },
  async handler(opts) {
    const bs = browserSync.create();

    bs.init(
      {
        server: "www",
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
      },
      async (err, r: any) => {
        if (err) {
          log.error(err);
          return;
        }

        const platformDirs = new Map<string | undefined, string>();
        r.addMiddleware(
          "*",
          (req: http.IncomingMessage, res: http.ServerResponse) => {
            const userAgent = req.headers["user-agent"];
            let platformDir = platformDirs.get(userAgent);
            if (platformDir === undefined) {
              const platform = resolvePlatform(userAgent);
              platformDir = getPlatformWwwRoot(".", platform);
              platformDirs.set(userAgent, platformDir);
            }
            log.info(`Serve ${req.url} from ${platformDir}`);
            serveHandler(req, res, { public: platformDir });
          },
        );

        const externalUrl = r.options.getIn(["urls", "external"]);
        const updated = updateCordovaConfig({ src: externalUrl, id: opts.id });

        onExit(() => {
          updateCordovaConfig(null);
        });

        if (updated) {
          log.info("Preparing project...");
          await execa("cordova", [
            "prepare",
            "--no-telemetry",
            "--no-update-notifier",
            "--verbose",
            "--debug",
            "--stacktrace",
          ], {
            stdio: opts.verbose > 0 ? "inherit" : "ignore",
            env: {
              NODE_ENV: "production",
              npm_config_loglevel: "info",
              npm_config_user_agent: "cordova-plus",
            },
          });
        }

        log.info("Ready for dev");
      },
    );
  },
} as CommandModule<{}, { id?: string; verbose: number }>;
