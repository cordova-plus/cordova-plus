import browserSync from "browser-sync";
import chokidar from "chokidar";
import cordovaLib from "cordova-lib";
import cordovaUtil from "cordova-lib/src/cordova/util.js";
import { getPlatformWwwRoot, platforms } from "cordova-serve/src/util.js";
import et from "elementtree";
import { execa } from "execa";
import glob from "fast-glob";
import fse from "fs-extra";
import assert from "node:assert";
import http from "node:http";
import path from "node:path";
import serveHandler from "serve-handler";
import onExit from "signal-exit";
import { Logger } from "tslog";
import uaParse from "ua-parser-js";
import type { CommandModule } from "yargs";
import { loadPackageJson } from "./info.js";
import { getPlugins } from "./update.js";

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

type Cfg = ReturnType<typeof loadCordovaConfig>;

async function updateCordovaConfig(
  cfg: Cfg,
  opts: { src: string; id?: string },
): Promise<[boolean, () => void]> {
  const el = cfg.doc.find("content");
  if (!el) return [false, () => {}];
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

  const networkSecurityConfigPath =
    "resources/android/xml/network_security_config.xml";
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

  const shouldUpdate = !a.src_;
  if (shouldUpdate) {
    // update for dev
    updates.map(([f]) => f());
    cfg.write();
  }

  return [shouldUpdate, () => {
    if (!a.src_) return;

    // restore
    updates.map(([, f]) => f());
    cfg.write();
  }];
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

    for (const platform of plugin._et.findall("platform")) {
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
    const minLevel =
      (["info", "debug", "trace", "silly"] as const)[opts.verbose] ??
        "silly";
    log.setSettings({ minLevel });

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
        const [updated, restore] = await updateCordovaConfig(cfg, {
          src: externalUrl,
          id: opts.id,
        });

        onExit(() => {
          restore();
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
