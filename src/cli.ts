#!/usr/bin/env node
import { exit } from "node:process";
import cli from "./index.js";

cli().catch((err) => {
  console.error(err);
  const { exitCode = 1 } = err;
  exit(exitCode);
});
