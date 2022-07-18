import { execa } from "execa";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("test-plugin", () => {
  const cli = require.resolve("../lib/cli.js");
  const pluginDir = path.resolve(
    require.resolve("../__fixtures__/test-plugin/package.json"),
    "..",
  );

  it("build", async () => {
    await execa(cli, ["plugin", "build", "--lib"], { cwd: pluginDir });
  }, 1000 * 60);

  it("test", async () => {
    await execa(cli, ["plugin", "test"], { cwd: pluginDir });
  }, 1000 * 60);
});
