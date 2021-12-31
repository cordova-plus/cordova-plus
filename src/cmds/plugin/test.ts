import { execa } from "execa";
import type { CommandModule } from "yargs";
import { resolveTsconfig } from "./build.js";

export default {
  command: "test",
  describe: "Run test",
  builder(yargs) {
    return yargs
      .option("tsconfig", { type: "string" });
  },
  async handler(opts) {
    const tsconfig = await resolveTsconfig(opts.tsconfig);
    await execa("tsc", ["-p", tsconfig, "--noEmit"], { stdio: "inherit" });
  },
} as CommandModule<{}, { tsconfig: string }>;
