// Copies XAI_API_KEY from ~/.hermes/.env into .env.local for local testing. No output of values.
import fs from "node:fs";
import path from "node:path";
const hermesEnv = path.join(process.env.HOME || "", ".hermes/.env");
const line = fs.readFileSync(hermesEnv, "utf8").split("\n").find((l) => l.startsWith("XAI_API_KEY="));
if (!line) { console.error("no XAI_API_KEY in hermes env"); process.exit(1); }
const local = fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l && !l.startsWith("XAI_API_KEY="));
local.push(line);
fs.writeFileSync(".env.local", local.join("\n") + "\n");
console.log("XAI_API_KEY added to .env.local");
