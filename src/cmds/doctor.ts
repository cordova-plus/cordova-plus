import { execa } from "execa";
import semver from "semver";
import type { CommandModule } from "yargs";
import { loadPackageJson } from "./info.js";
import { getPlugins } from "./update.js";

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
    const [plugins, pkgJson] = await Promise.all([
      getPlugins(),
      loadPackageJson(),
    ]);
    const deps = {
      ...pkgJson.content.devDependencies,
      ...pkgJson.content.dependencies,
    };
    const issues: Record<string, boolean> = {};

    for (const plugin of plugins) {
      const { pkg } = plugin;
      if (!pkg) continue;
      const versionSpec = deps[pkg.name];
      if (!versionSpec || versionSpec.indexOf(":") > -1) continue;

      if (!semver.satisfies(pkg.version, versionSpec)) {
        console.warn(
          `${pkg.name}@${pkg.version} does not satisify with version in package.json: ${versionSpec}`,
        );
        issues[`pkg:${pkg.name}`] = true;
      }
    }

    const depsInstalled = await npmListDeps();
    for (const plugin of plugins) {
      const { pkg } = plugin;
      if (!pkg) continue;
      const { version } = depsInstalled[pkg.name] ?? {};
      if (!version) continue;

      if (version !== pkg.version) {
        if (issues[`pkg:${pkg.name}`]) continue;

        console.warn(
          `${pkg.name}@${pkg.version} is not match npm installed version: ${version}`,
        );
        issues[`pkg:${pkg.name}`] = true;
      }
    }

    const issueCount = Object.keys(issues).length;
    if (issueCount > 0) {
      console.warn(`Found ${issueCount} issue${issueCount > 1 ? "s" : ""}.`);
      process.exit(1);
    } else {
      console.log("No issues found");
    }
  },
} as CommandModule<{}, {}>;
