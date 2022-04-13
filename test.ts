import { execa } from "execa";

test("cli", async () => {
  const p = await execa("./lib/cli.js", ["--help"], { stdout: "pipe" });
  expect(p.stdout).toMatchInlineSnapshot(`
"cordova-plus <command>

Commands:
  cordova-plus dev               Run live reload server
  cordova-plus doctor            Check project setup
  cordova-plus fmt               Format cordova property in package.json
  cordova-plus info              Get relevant version info about OS, toolchain a
                                 nd libraries
  cordova-plus plugin <command>  Commands for plugin development
  cordova-plus update            Update plugins

Options:
  --version  Show version number                                       [boolean]
  --cwd      Set current working directory                              [string]
  --help     Show help                                                 [boolean]"
`);
}, 1000 * 30);
