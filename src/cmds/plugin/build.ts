import typescript from "@rollup/plugin-typescript";
import { execa } from "execa";
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
  const tsconfigBase = require.resolve("../../../plugin/tsconfig.json");

  await fse.outputJSON(tsconfigPath, {
    extends: tsconfigBase,
    include: [
      require.resolve("../../../types.d.ts"),
      `${process.cwd()}/src/www/**/*`,
    ],
  });
  return tsconfigPath;
}

type Options = {
  input: string;
  tsconfig?: string;
  watch?: boolean;
  lib: boolean;
};

async function buildWww(tsconfig: string, opts: Options) {
  const inputOptions: rollup.InputOptions = {
    input: opts.input,
    plugins: [
      typescript({
        tsconfig,
      }),
    ],
    onwarn(warning) {
      console.log(warning.toString());
    },
  };
  const outputOptions: rollup.OutputOptions = {
    dir: "www",
    format: "cjs",
    sourcemap: false,
    exports: "auto",
  };

  if (opts.watch) {
    const watchOptions: rollup.RollupWatchOptions = {
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
  try {
    await bundle.write(outputOptions);
  } finally {
    await bundle.close();
  }
}

async function buildLib(tsconfig: string, opts: Options) {
  if (!opts.lib) return;

  const args = ["-p", tsconfig, "--outDir", "lib"];
  if (opts.watch) args.push("-w");
  await execa("tsc", args, { stdio: "inherit" });
}

export default {
  command: "build",
  describe: "Build plugin with TypeScript",
  builder(yargs) {
    return yargs
      .option("input", { type: "string", default: "./src/www/index.ts" })
      .option("tsconfig", { type: "string" })
      .option("watch", {
        alias: "w",
        type: "boolean",
      })
      .option("lib", { type: "boolean", default: false });
  },
  async handler(opts) {
    const tsconfig = await resolveTsconfig(opts.tsconfig);
    await Promise.all([
      buildWww(tsconfig, opts),
      buildLib(tsconfig, opts),
    ]);
  },
} as CommandModule<{}, Options>;
