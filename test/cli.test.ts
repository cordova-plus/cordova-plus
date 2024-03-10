import { execa } from "execa";
import { expect, test } from 'vitest';

test("cli", async () => {
  const p = await execa("./lib/cli.js", ["--help"], { stdout: "pipe" });
  expect(p.stdout).toMatchInlineSnapshot(`
"cordova-plus <command>

Commands:
  cordova-plus dev               Run live reload server
  cordova-plus doctor            Check project setup
  cordova-plus fmt [dirs..]      Format cordova property in package.json
  cordova-plus info              Get relevant version info about OS, toolchain a
                                 nd libraries
  cordova-plus plugin <command>  Commands for plugin development
  cordova-plus update            Update plugins
  cordova-plus completion        generate completion script

Options:
  --cwd      Set current working directory                              [string]
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]"
`);
}, 120_000);
