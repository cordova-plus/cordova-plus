import typescript from "@rollup/plugin-typescript";
import fse from "fs-extra";
import { createRequire } from "module";
import * as rollup from "rollup";
import tempy from "tempy";
import type { CommandModule } from "yargs";

const require = createRequire(import.meta.url);

export default {
  command: "build",
  describe: "Build plugin with TypeScript",
  builder(yargs) {
    return yargs.option("cwd", { type: "string" });
  },
  async handler(opts) {
    if (opts.cwd) {
      process.chdir(opts.cwd);
    }

    const tsconfig = tempy.file({ name: "tsconfig.json" });

    await fse.outputJSON(tsconfig, {
      extends: require.resolve("../../../config/tsconfig.json"),
      include: [`${process.cwd()}/src/www/**/*`],
    });

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

    const bundle = await rollup.rollup(inputOptions);
    await bundle.write(outputOptions);
    await bundle.close();
  },
} as CommandModule<{}, { cwd: string }>;
