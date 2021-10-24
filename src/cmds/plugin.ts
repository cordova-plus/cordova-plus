import type { CommandModule } from "yargs";
import build from "./plugin/build.js";
import version from "./plugin/version.js";

export default {
  command: "plugin <command>",
  describe: "Commands for plugin development",
  builder(yargs) {
    return yargs.command(build).command(version).demandCommand();
  },
  handler() {
  },
} as CommandModule;
