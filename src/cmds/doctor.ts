import PackageJson from "@npmcli/package-json";
import semver from "semver";
import type { CommandModule } from "yargs";
import { getPlugins } from "./update.js";
import { execa } from "execa";

async function npmListDeps() {
  try {
    const p = await execa("npm", ["list", "--json"]);
    const o = JSON.parse(p.stdout);
    const deps = {
      ...o.devDependencies,
      ...o.dependencies,
    };
    return deps;
  } catch {}
  return {};
}

export default {
  command: "doctor",
  describe: "Check project setup",
  async handler() {
    const plugins = await getPlugins();
    const pkgJson = await PackageJson.load("./");
    const deps = {
      ...pkgJson.content.devDependencies,
      ...pkgJson.content.dependencies,
    };
    let issueCount = 0;

    for (const plugin of plugins) {
      const { pkg } = plugin;
      if (!pkg) continue;
      const versionSpec = deps[pkg.name];
      if (!versionSpec || versionSpec.indexOf(":") > -1) continue;

      if (!semver.satisfies(pkg.version, versionSpec)) {
        console.warn(
          `${pkg.name}@${pkg.version} does not satisify with version in package.json: ${versionSpec}`,
        );
        issueCount += 1;
      }
    }

    const depsInstalled = await npmListDeps();
    for (const plugin of plugins) {
      const { pkg } = plugin;
      if (!pkg) continue;
      const { version } = depsInstalled[pkg.name] ?? {};
      if (!version) continue;

      if (version !== pkg.version) {
        console.warn(
          `${pkg.name}@${pkg.version} is not match npm installed version: ${version}`,
        );
        issueCount += 1;
      }
    }

    if (issueCount > 0) {
      console.warn(`Found ${issueCount} issue${issueCount > 1 ? "s" : ""}.`);
      process.exit(1);
    }
  },
} as CommandModule<{}, {}>;
