import yargs from "yargs";
import dev from "./cmds/dev.js";
import fmt from "./cmds/fmt.js";
import plugin from "./cmds/plugin.js";
import update from "./cmds/update.js";

async function cli() {
  yargs(process.argv.slice(2))
    .command(dev)
    .command(fmt)
    .command(plugin)
    .command(update)
    .demandCommand()
    .help()
    .argv;
}

export default cli;
