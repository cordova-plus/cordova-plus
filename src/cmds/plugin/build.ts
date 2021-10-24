import typescript from "@rollup/plugin-typescript";
import fse from "fs-extra";
import { createRequire } from "module";
import * as rollup from "rollup";
import tempy from "tempy";
import type { CommandModule } from "yargs";

const require = createRequire(import.meta.url);

async function resolveTsconfig(tsconfig?: string) {
  if (tsconfig && await fse.pathExists(tsconfig)) {
    return tsconfig;
  }

  if (await fse.pathExists("tsconfig.json")) {
    return "./tsconfig.json";
  }

  const tsconfigPath = tempy.file({ name: "tsconfig.json" });
  const tsconfigBase = require.resolve("../../../config/tsconfig.json");

  await fse.outputJSON(tsconfigPath, {
    extends: tsconfigBase,
    include: [`${process.cwd()}/src/www/**/*`],
  });
  return tsconfigPath;
}

export default {
  command: "build",
  describe: "Build plugin with TypeScript",
  builder(yargs) {
    return yargs
      .option("cwd", { type: "string" })
      .option("tsconfig", { type: "string" })
      .option("watch", {
        alias: "w",
        type: "boolean",
      });
  },
  async handler(opts) {
    if (opts.cwd) {
      process.chdir(opts.cwd);
    }

    const tsconfig = await resolveTsconfig(opts.tsconfig);
    const inputOptions = {
      input: "./src/www/index.ts",
      plugins: [
        typescript({
          tsconfig,
        }),
      ],
    };
    const outputOptions = {
      dir: "www",
      format: "cjs",
      sourcemap: false,
      exports: "auto",
    } as const;

    if (opts.watch) {
      const watchOptions = {
        ...inputOptions,
        output: [outputOptions],
      };
      const watcher = rollup.watch(watchOptions);
      watcher.on("event", ({ result }: any) => {
        if (result) {
          result.close();
        }
      });
      return;
    }

    const bundle = await rollup.rollup(inputOptions);
    await bundle.write(outputOptions);
    await bundle.close();
  },
} as CommandModule<{}, { cwd?: string; tsconfig?: string; watch?: boolean }>;
