#!/usr/bin/env node
import { startDevServer } from "./dev";

const cmd = process.argv[2];

if (cmd === "dev") {
  startDevServer();
} else {
  console.log("OneQueue CLI");
}
