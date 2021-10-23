import yargs from "yargs";
import plugin from "./cmds/plugin.js";

async function cli() {
  yargs(process.argv.slice(2))
    .command(plugin)
    .demandCommand()
    .help()
    .argv;
}

export default cli;
