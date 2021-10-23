import type { CommandModule } from "yargs";
import version from "./plugin/version.js";

export default {
  command: "plugin <command>",
  describe: "Commands for plugin development",
  builder(yargs) {
    return yargs.command(version);
  },
  handler() {},
} as CommandModule;
