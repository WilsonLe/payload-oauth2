#!/usr/bin/env node

import fs from "fs";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { generateAppleClientSecret } from "../dist/generate-apple-client-secret.js";

(async () => {
  const argv = yargs(hideBin(process.argv))
    .option("team-id", {
      type: "string",
      demandOption: true,
      describe: "Apple Developer Team ID",
    })
    .option("client-id", {
      type: "string",
      demandOption: true,
      describe: "Apple Service Client ID",
    })
    .option("key-id", {
      type: "string",
      demandOption: true,
      describe: "Apple Key ID",
    })
    .option("private-key-path", {
      type: "string",
      demandOption: true,
      describe: "Path to .p8 private key file",
    })
    .option("exp", {
      type: "number",
      describe: "Expiration time (seconds since epoch)",
    })
    .help().argv;

  let authKeyContent;
  try {
    authKeyContent = fs.readFileSync(argv["private-key-path"], "utf8");
  } catch (err) {
    console.error("Failed to read private key file:", err.message);
    process.exit(1);
  }

  try {
    const jwt = await generateAppleClientSecret({
      teamId: argv["team-id"],
      clientId: argv["client-id"],
      keyId: argv["key-id"],
      authKeyContent,
      exp: argv.exp,
    });
    console.log(jwt);
  } catch (err) {
    console.error("Failed to generate client secret:", err.message);
    process.exit(1);
  }
})();
