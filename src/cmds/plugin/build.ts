import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { execa } from "execa";
import fse from "fs-extra";
import { createRequire } from "node:module";
import * as rollup from "rollup";
import { temporaryFile } from "tempy";
import type { CommandModule } from "yargs";
import { cacheDir } from "../../cache.js";

// @ts-ignore wrong type
const require = createRequire(import.meta.url);

export async function resolveTsconfig(tsconfig?: string) {
  if (tsconfig && await fse.pathExists(tsconfig)) {
    return tsconfig;
  }

  if (await fse.pathExists("tsconfig.json")) {
    return "./tsconfig.json";
  }

  const tsconfigPath = temporaryFile({ name: "tsconfig.json" });
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
  esm: boolean;
  "skip-warn": boolean;
  skipWarn: boolean;
};

async function buildWww(tsconfig: string, opts: Options) {
  const inputOptions: rollup.InputOptions = {
    input: opts.input,
    external: [
      "cordova",
      "cordova/channel",
      "cordova/exec",
    ],
    plugins: [
      nodeResolve(),
      // @ts-ignore wrong type
      typescript({
        tsconfig,
        cacheDir: cacheDir?.("www-ts"),
      }),
      // @ts-ignore wrong type
      commonjs(),
    ],
    onwarn(warning) {
      const { message } = warning;
      if (
        opts.skipWarn && (
          message.indexOf("TS2304: Cannot find name 'cordova'.") > -1 ||
          message.indexOf(
              "TS2354: This syntax requires an imported helper but module 'tslib' cannot be found.",
            ) > -1
        )
      ) {
        return;
      }

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

  const args = [
    "-p",
    tsconfig,
    "--declaration",
    "--sourceMap",
  ];
  if (opts.watch) args.push("-w");

  await execa("tsc", [...args, "--outDir", "lib"], { stdio: "inherit" });

  if (opts.esm) {
    await execa("tsc", [...args, "--outDir", "esm", "--module", "es2022"], {
      stdio: "inherit",
    });
  }
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
      .option("lib", { type: "boolean", default: false })
      .option("esm", { type: "boolean", default: true })
      .option("skip-warn", { type: "boolean", default: true, hidden: true });
  },
  async handler(opts) {
    const tsconfig = await resolveTsconfig(opts.tsconfig);
    await Promise.all([
      buildWww(tsconfig, opts),
      buildLib(tsconfig, opts),
    ]);
  },
} as CommandModule<{}, Options>;
