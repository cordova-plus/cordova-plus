import semver from "semver";
import { getPlugins, loadPackageJson } from "../info/index.js";

export async function checkPackageJson() {
  const [plugins, pkgJson] = await Promise.all([
    getPlugins(),
    loadPackageJson(),
  ]);
  const deps = {
    ...pkgJson.content.devDependencies,
    ...pkgJson.content.dependencies,
  };
  const issues: Record<string, string> = {};

  for (const plugin of plugins) {
    const { pkg } = plugin;
    if (!pkg) continue;
    const versionSpec = deps[pkg.name];
    if (!versionSpec || versionSpec.indexOf(":") > -1) continue;

    if (!semver.satisfies(pkg.version, versionSpec)) {
      issues[pkg.name] =
        `${pkg.name}@${pkg.version} does not satisfy with version in package.json: ${versionSpec}`;
    }
  }
  return issues;
}
