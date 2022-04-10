import { execa } from "execa";

test("cli", async () => {
  const p = await execa("./lib/cli.js", ["--help"], { stdout: "pipe" });
  expect(p.stdout).toMatchInlineSnapshot(`
"cli.js <command>

Commands:
  cli.js dev               Run live reload server
  cli.js doctor            Check project setup
  cli.js fmt               Format cordova property in package.json
  cli.js info              Get relevant version info about OS, toolchain and lib
                           raries
  cli.js plugin <command>  Commands for plugin development
  cli.js update            Update plugins

Options:
  --version  Show version number                                       [boolean]
  --cwd      Set current working directory                              [string]
  --help     Show help                                                 [boolean]"
`);
}, 1000 * 30);
