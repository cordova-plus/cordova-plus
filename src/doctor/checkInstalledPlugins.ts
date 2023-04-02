import { execa } from "execa";
import { getPlugins } from "../info/index.js";

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

export async function checkInstalledPlugins() {
  const plugins = await getPlugins();
  const issues: Record<string, string> = {};

  const depsInstalled = await npmListDeps();
  for (const plugin of plugins) {
    const { pkg } = plugin;
    if (!pkg) continue;
    const { version } = depsInstalled[pkg.name] ?? {};
    if (!version) continue;

    if (version !== pkg.version) {
      issues[pkg.name] =
        `${pkg.name}@${pkg.version} is not match npm installed version: ${version}`;
    }
  }

  return issues;
}
