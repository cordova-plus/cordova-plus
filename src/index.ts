import untildify from "untildify";
import yargs from "yargs";
import dev from "./cmds/dev.js";
import doctor from "./cmds/doctor.js";
import fmt from "./cmds/fmt.js";
import plugin from "./cmds/plugin.js";
import update from "./cmds/update.js";

async function cli() {
  yargs(process.argv.slice(2))
    .option("cwd", {
      type: "string",
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
    .command(plugin)
    .command(update)
    .demandCommand()
    .help()
    .argv;
}

export default cli;
