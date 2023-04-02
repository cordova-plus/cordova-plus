import type { CommandModule } from "yargs";
import { Listr } from "listr2";
import { checkInstalledPlugins, checkPackageJson } from "../doctor/index.js";

interface Ctx {
}

export default {
  command: "doctor",
  describe: "Check project setup",
  async handler() {
    const tasks = new Listr<Ctx>(
      [
        {
          title: "package.json",
          task: async (ctx, task) => {
            const issues = await checkPackageJson();
            if (Object.keys(issues).length === 0) return;

            return task.newListr(
              Object.entries(issues).map(([k, issue]) => {
                return {
                  title: k,
                  task(_, task) {
                    task.output = issue;
                    throw new Error();
                  },
                  options: { persistentOutput: true },
                };
              }),
            );
          },
        },
        {
          title: "plugins/",
          task: async (ctx, task) => {
            const issues = await checkInstalledPlugins();
            if (Object.keys(issues).length === 0) return;

            return task.newListr(
              Object.entries(issues).map(([k, issue]) => {
                return {
                  title: k,
                  task(_, task) {
                    task.output = issue;
                    throw new Error();
                  },
                  options: { persistentOutput: true },
                };
              }),
            );
          },
        },
      ],
      {
        concurrent: true,
        exitOnError: false,
      },
    );

    try {
      await tasks.run();
    } catch (e) {
      console.error(e);
    }
  },
} as CommandModule<{}, {}>;
