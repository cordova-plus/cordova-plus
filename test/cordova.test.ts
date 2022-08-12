import { afterAll, expect, it, jest } from "@jest/globals";
import { execa, StdioOption } from "execa";
import fse from "fs-extra";
import path from "node:path";
import { temporaryDirectory } from "tempy";

[10, 11].forEach((v) => {
  describe(`cordova@${v}`, () => {
    jest.setTimeout(600_000);

    const rootDir = temporaryDirectory({ prefix: `test-cordova${v}-` });
    const stdio: StdioOption = "inherit";

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
        "com.example.hello",
        "HelloWorld",
      ], { stdio });
      expect(await fse.pathExists(projectDir)).toBe(true);
    });

    ["android"].forEach((platform) => {
      it(platform, async () => {
        const platformDir = path.join(projectDir, "platforms", platform);
        expect(await fse.pathExists(platformDir)).toBe(false);

        await execa(cordovaBin, [
          "platform",
          "add",
          platform,
        ], { cwd: projectDir, stdio });
        expect(await fse.pathExists(platformDir)).toBe(true);
      });
    });

    it("prepare", async () => {
      await execa(cordovaBin, [
        "prepare",
      ], { cwd: projectDir, stdio });

      expect(
        await fse.pathExists(
          path.join(
            projectDir,
            "platforms/android/app/src/main/assets/www/cordova.js",
          ),
        ),
      ).toBe(true);
    });
  });
});
