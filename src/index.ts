import untildify from "untildify";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import dev from "./cmds/dev.js";
import doctor from "./cmds/doctor.js";
import fmt from "./cmds/fmt.js";
import info from "./cmds/info.js";
import plugin from "./cmds/plugin.js";
import update from "./cmds/update.js";

async function cli() {
  yargs(hideBin(process.argv))
    .scriptName("cordova-plus")
    .count("verbose")
    .alias("v", "verbose")
    .option("cwd", {
      type: "string",
      desc: "Set current working directory",
      normalize: true,
      global: true,
      coerce(arg) {
        if (arg) {
          arg = untildify(arg);
          process.chdir(arg);
        }
        return arg;
      },
    })
    .command(dev)
    .command(doctor)
    .command(fmt)
    .command(info)
    .command(plugin)
    .command(update)
    .demandCommand()
    .completion()
    .help()
    .version()
    .argv;
}

export default cli;
