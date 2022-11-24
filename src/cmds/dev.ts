import browserSync from "browser-sync";
import chokidar from "chokidar";
import cordovaLib from "cordova-lib";
import cordovaUtil from "cordova-lib/src/cordova/util.js";
import { getPlatformWwwRoot } from "cordova-serve/src/util.js";
import et from "elementtree";
import { execa } from "execa";
import glob from "fast-glob";
import fse from "fs-extra";
import assert from "node:assert";
import http from "node:http";
import path from "node:path";
import pino from "pino";
import serveHandler from "serve-handler";
import onExit from "signal-exit";
import uaParse from "ua-parser-js";
import type { CommandModule } from "yargs";
import { loadPackageJson } from "./info.js";
import { getPlugins } from "./update.js";

const { PluginInfo } = cordovaLib;

const log = pino({
  transport: {
    pipeline: [{
      target: "pino-pretty",
    }],
  },
});

export function loadCordovaConfig(rootDir = cordovaUtil.getProjectRoot()) {
  const xml = cordovaUtil.projectConfig(rootDir);
  if (xml === false) {
    throw new Error("fail to load config.xml");
  }
  return new cordovaLib.configparser(xml);
}

type Cfg = ReturnType<typeof loadCordovaConfig>;

export async function updateCordovaConfig(
  cfg: Cfg,
  opts: { src: string; id?: string; cwd?: string },
): Promise<[boolean, () => void]> {
  const cwd = opts.cwd ?? ".";

  const el = cfg.doc.find("content");
  if (!el) return [false, () => {}];

  const root = cfg.doc.getroot();
  const a = el.attrib;

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

  const findAllowNavigationElm = () =>
    cfg.doc.findall("./allow-navigation").find((e) => e.attrib.dev);

  const updateNav = [
    () => {
      if (!findAllowNavigationElm()) {
        et.SubElement(root, "allow-navigation", {
          href: "http://*/*",
          dev: "true",
        });
      }
    },
    () => {
      const elNav = findAllowNavigationElm();
      if (elNav) {
        root.remove(elNav);
      }
    },
  ];

  const updates = [updateSrc, updateNav, updateId];

  const androidManifestPath = path.join(
    cwd,
    "platforms/android/app/src/main/AndroidManifest.xml",
  );
  if (await fse.pathExists(androidManifestPath)) {
    const androidManifest = et.parse(
      await fse.readFile(androidManifestPath, "utf8"),
    );
    const applicationEl = androidManifest.find("application");

    const save = () =>
      fse.writeFileSync(
        androidManifestPath,
        androidManifest.write({ indent: 4 }),
      );

    if (applicationEl) {
      const k = "android:usesCleartextTraffic";
      const k2 = "usesCleartextTraffic_";

      updates.push([
        () => {
          if (applicationEl.attrib[k2]) return;
          applicationEl.attrib[k2] = applicationEl.attrib[k];
          applicationEl.attrib[k] = "true";
          save();
        },
        () => {
          if (applicationEl.attrib[k2] === "undefined") {
            delete applicationEl.attrib[k];
          } else {
            applicationEl.attrib[k] = applicationEl.attrib[k2];
          }
          delete applicationEl.attrib[k2];
          save();
        },
      ]);
    }
  }

  const networkSecurityConfigPath = path.join(
    cwd,
    "resources/android/xml/network_security_config.xml",
  );
  if (await fse.pathExists(networkSecurityConfigPath)) {
    const networkSecurityConfig = et.parse(
      await fse.readFile(networkSecurityConfigPath, "utf8"),
    );
    const doaminConfig = networkSecurityConfig.find("domain-config");

    const save = () =>
      fse.writeFileSync(
        networkSecurityConfigPath,
        networkSecurityConfig.write({ indent: 4 }),
      );

    if (doaminConfig) {
      const domain = et.Element(
        "domain",
        {
          includeSubdomains: "true",
          dev: "true",
        },
      );
      domain.text = new URL(opts.src).host;

      const baseConfig = et.Element(
        "base-config",
        { cleartextTrafficPermitted: "true", dev: "true" },
      );
      const trustAnchors = et.Element("trust-anchors");
      const certificates = et.Element("certificates", { src: "system" });
      trustAnchors.append(certificates);
      baseConfig.append(trustAnchors);

      updates.push([
        () => {
          networkSecurityConfig.getroot().append(baseConfig);
          doaminConfig.append(domain);
          save();
        },
        () => {
          networkSecurityConfig.getroot().remove(baseConfig);
          doaminConfig.remove(domain);
          save();
        },
      ]);
    }
  }

  const shouldUpdate = !a.src_ || true;
  if (shouldUpdate) {
    // update for dev
    updates.map(([f]) => f());
    cfg.write();
  }

  return [shouldUpdate, () => {
    if (!a.src_) return;

    log.info("Restore config...");

    // restore
    updates.map(([, f]) => f());
    cfg.write();
  }];
}

function resolvePlatform(userAgent?: string) {
  const ua = uaParse(userAgent);
  const platform = ua.os.name?.toLowerCase();
  switch (platform) {
    case "android":
    case "ios":
      return platform;
  }
  return "browser";
}

async function copyFile(s: string, t: string) {
  log.debug(`${s} -> ${t}`);
  await fse.copyFile(s, t);
}

async function syncLocalPlugins(cfg: Cfg) {
  const cwd = process.cwd();

  const [iosPluginsDir] = await glob("platforms/ios/*/Plugins", {
    onlyDirectories: true,
    cwd,
  });

  const pkg = await loadPackageJson(cwd);
  const deps = { ...pkg.content.dependencies, ...pkg.content.devDependencies };
  const syncFiles = new Map<string, string>();

  for (const plugin of await getPlugins(cwd)) {
    const pluginDir: string | undefined = deps[plugin.name]?.replace(
      /^file:/,
      "",
    );
    if (!pluginDir || !await fse.pathExists(pluginDir)) continue;
    const pluginInfo = new PluginInfo(pluginDir);

    for (const platform of pluginInfo._et.findall("platform")) {
      const platformName = platform.attrib["name"];
      if (!platformName) continue;

      for (const sourceFile of platform.findall("source-file")) {
        const targetDir = sourceFile.attrib["target-dir"];
        const src = sourceFile.attrib["src"];
        switch (platformName) {
          case "android": {
            if (!targetDir || !src) continue;
            const k = path.join(
              targetDir.replace(
                /^src\//,
                "platforms/android/app/src/main/java/",
              ),
              path.basename(src),
            );
            syncFiles.set(k, path.join(pluginDir, src));
          }
          case "ios": {
            if (!iosPluginsDir || !src) continue;
            const k = path.join(
              iosPluginsDir,
              plugin.name,
              path.basename(src),
            );
            syncFiles.set(k, path.join(pluginDir, src));
          }
          default:
            continue;
        }
      }
    }
  }

  for (const [k, v] of syncFiles) {
    await copyFile(v, k);
  }

  const watcher = chokidar.watch(
    [
      "platforms/android/app/src/main/java",
      iosPluginsDir,
    ].filter(Boolean),
    { cwd },
  );
  onExit(async () => {
    await watcher.close();
  });

  watcher.on("change", async (p, stats) => {
    const v = syncFiles.get(p);
    if (!v) return;

    await copyFile(p, v);
  });
}

export async function getPlatformWwwDir(platform: string, rootDir = ".") {
  const platformDir = getPlatformWwwRoot(rootDir, platform);
  if (!await fse.pathExists(platformDir)) {
    const d = platformDir.replace("assets", "app/src/main/assets");
    if (await fse.pathExists(d)) {
      return d;
    }
  }
  return platformDir;
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
    log.level = (["info", "debug", "trace", "silly"] as const)[opts.verbose] ??
      "silly";

    process.on("SIGINT", () => {
      console.log();
      process.exit();
    });

    const cfg = loadCordovaConfig();

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
          async (req: http.IncomingMessage, res: http.ServerResponse) => {
            const userAgent = req.headers["user-agent"];
            let platformDir = platformDirs.get(userAgent);
            if (platformDir === undefined) {
              const platform = resolvePlatform(userAgent);
              platformDir = await getPlatformWwwDir(platform);
              platformDirs.set(userAgent, platformDir);
            }
            log.info(`Serve ${req.url} from ${platformDir}`);
            serveHandler(req, res, { public: platformDir });
          },
        );

        const externalUrl = r.options.getIn(["urls", "external"]);
        const [updated, restore] = await updateCordovaConfig(cfg, {
          src: externalUrl,
          id: opts.id,
        });

        onExit(() => {
          restore();
          log.info("Done");
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

    await syncLocalPlugins(cfg);
  },
} as CommandModule<{}, { id?: string; verbose: number }>;
