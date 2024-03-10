import {StdioOption, execa} from "execa";
import fse from "fs-extra";
import path from "node:path";
import {temporaryDirectory} from "tempy";
import {afterAll, assert, beforeAll, describe, expect, it} from "vitest";
import {
  getPlatformWwwDir,
  loadCordovaConfig,
  updateCordovaConfig,
} from "../src/cmds/dev";

for (const v of [11, 10]) {
  describe(`cordova@${v}`, () => {
    const rootDir = temporaryDirectory({prefix: `test-cordova${v}-`});
    const stdio: StdioOption = process.env.DEBUG_TEST ? "inherit" : "ignore";
    const appId = "com.example.hello";

    const cordovaBin = path.join(rootDir, "node_modules/.bin/cordova");
    const projectDir = path.join(rootDir, "app");

    afterAll(async () => {
      await fse.remove(rootDir);
    });

    it("install cordova", async () => {
      await execa("npm", ["install", `cordova@^${v}`], {cwd: rootDir, stdio});
      expect(await fse.pathExists(cordovaBin)).toBe(true);
    });

    it("create", async () => {
      await execa(cordovaBin, ["create", projectDir, appId, "HelloWorld"], {
        stdio,
      });
      expect(await fse.pathExists(projectDir)).toBe(true);
    });

    describe("config", () => {
      let cfg: ReturnType<typeof loadCordovaConfig>;

      const readConfigXml = () =>
        fse.readFile(path.join(projectDir, "config.xml"), "utf8");

      beforeAll(() => {
        cfg = loadCordovaConfig(projectDir);
      });

      it("loaded", () => {
        const root = cfg.doc.getroot();
        expect(root.attrib.id).toBe(appId);
      });

      it("updateCordovaConfig()", async () => {
        const s1 = await readConfigXml();

        const [updated, restore] = await updateCordovaConfig(cfg, {
          src: "test",
        });
        expect(updated).toBe(true);
        expect(await readConfigXml()).not.toBe(s1);

        restore();
        expect(await readConfigXml()).toBe(s1);
      });
    });

    ["android", "ios", "browser"].forEach(platform => {
      describe(platform, () => {
        it("add", async () => {
          const platformDir = path.join(projectDir, "platforms", platform);
          expect(await fse.pathExists(platformDir)).toBe(false);

          await execa(cordovaBin, ["platform", "add", platform], {
            cwd: projectDir,
            stdio,
          });
          expect(await fse.pathExists(platformDir)).toBe(true);
        });

        it("prepare", async () => {
          await execa(cordovaBin, ["prepare", platform], {
            cwd: projectDir,
            stdio,
          });

          const d = await getPlatformWwwDir(platform, projectDir);
          expect(await fse.pathExists(path.join(d, "cordova.js"))).toBe(true);
        });
      });
    });
  }, 600_000);
}
