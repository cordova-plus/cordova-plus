import yargs from "yargs";
import fmt from "./cmds/fmt.js";
import plugin from "./cmds/plugin.js";

async function cli() {
  yargs(process.argv.slice(2))
    .command(fmt)
    .command(plugin)
    .demandCommand()
    .help()
    .argv;
}

export default cli;
