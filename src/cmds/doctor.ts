import type { CommandModule } from "yargs";
import { checkInstalledPlugins, checkPackageJson } from "../doctor/index.js";

export default {
  command: "doctor",
  describe: "Check project setup",
  async handler() {
    const issues = (await Promise.all([
      checkInstalledPlugins(),
      checkPackageJson(),
    ])).reduce((acc, cur) => ({ ...acc, ...cur }), {});

    const issueCount = Object.keys(issues).length;
    if (issueCount > 0) {
      for (const [_, v] of Object.entries(issues)) {
        console.warn(v);
      }
      console.warn(`Found ${issueCount} issue${issueCount > 1 ? "s" : ""}.`);
      process.exit(1);
    } else {
      console.log("No issues found");
    }
  },
} as CommandModule<{}, {}>;
