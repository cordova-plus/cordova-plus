import PackageJson from "@npmcli/package-json";
import execa from "execa";
import fse from "fs-extra";
import type { CommandModule } from "yargs";

async function updateCordovaPluginVersion(
  filename: string,
  version: string,
) {
  const versionRE = /<plugin [\S\s]*?\sversion=\s*["']?([^\s"']+)/m;
  const data = await fse.readFile(filename, "utf8");
  const match = versionRE.exec(data);
  if (!match) {
    throw new Error(`cannot find version property in ${filename}`);
  }

  const versionCurrent = match[1];
  const result = {
    filename,
    before: versionCurrent,
    after: version,
  };
  if (versionCurrent === version) {
    return result;
  }

  const content = [
    data.substring(0, match.index + match[0].length - versionCurrent.length),
    version,
    data.substring(match.index + match[0].length),
  ].join("");
  await fse.writeFile(filename, content);
  return result;
}

export default {
  command: "version",
  describe: "Update version in plugin.xml from package.json",
  async handler() {
    const pkgJson = await PackageJson.load("./");
    const { version: pkgVersion } = pkgJson.content;
    const { filename, before, after } = await updateCordovaPluginVersion(
      "plugin.xml",
      pkgVersion,
    );

    if (before === after) {
      console.log(`${filename}\t${after}`);
    } else {
      console.log(`${filename}\t${before} -> ${after}`);
      await execa("git", ["add", filename]);
    }
  },
} as CommandModule;
