import { afterAll, expect, it, jest } from "@jest/globals";
import { execa, StdioOption } from "execa";
import fse from "fs-extra";
import path from "node:path";
import { temporaryDirectory } from "tempy";
import { getPlatformWwwDir, loadCordovaConfig } from "../src/cmds/dev";

[10, 11].forEach((v) => {
  describe(`cordova@${v}`, () => {
    jest.setTimeout(600_000);

    const rootDir = temporaryDirectory({ prefix: `test-cordova${v}-` });
    const stdio: StdioOption = process.env.DEBUG_TEST ? "inherit" : "ignore";
    const appId = "com.example.hello";

    const cordovaBin = path.join(rootDir, "node_modules/.bin/cordova");
    const projectDir = path.join(rootDir, "app");

    afterAll(async () => {
      await fse.remove(rootDir);
    });

    it("install cordova", async () => {
      await execa("npm", ["install", `cordova@^${v}`], { cwd: rootDir, stdio });
      expect(await fse.pathExists(cordovaBin)).toBe(true);
    });

    it("create", async () => {
      await execa(cordovaBin, [
        "create",
        projectDir,
        appId,
        "HelloWorld",
      ], { stdio });
      expect(await fse.pathExists(projectDir)).toBe(true);
    });

    it("load config", () => {
      const cfg = loadCordovaConfig(projectDir);
      const root = cfg.doc.getroot();
      expect(root.attrib.id).toBe(appId);
    });

    ["android", "ios", "browser"].forEach((platform) => {
      describe(platform, () => {
        it("add", async () => {
          const platformDir = path.join(projectDir, "platforms", platform);
          expect(await fse.pathExists(platformDir)).toBe(false);

          await execa(cordovaBin, [
            "platform",
            "add",
            platform,
          ], { cwd: projectDir, stdio });
          expect(await fse.pathExists(platformDir)).toBe(true);
        });

        it("prepare", async () => {
          await execa(cordovaBin, [
            "prepare",
            platform,
          ], { cwd: projectDir, stdio });

          const d = await getPlatformWwwDir(platform, projectDir);
          expect(
            await fse.pathExists(path.join(d, "cordova.js")),
          ).toBe(true);
        });
      });
    });
  });
});
