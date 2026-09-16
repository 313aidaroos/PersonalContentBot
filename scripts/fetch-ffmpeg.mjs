import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "bin", "ffmpeg");

function assetName() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "linux" && arch === "arm64") return "ffmpeg-linux-arm64";
  if (platform === "linux") return "ffmpeg-linux-x64";
  if (platform === "darwin" && arch === "arm64") return "ffmpeg-darwin-arm64";
  if (platform === "darwin") return "ffmpeg-darwin-x64";
  if (platform === "win32") return "ffmpeg-win32-x64";
  return null;
}

function matchesPlatform(buf) {
  const elf = buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46;
  const macho =
    (buf[0] === 0xcf && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe) ||
    (buf[0] === 0xca && buf[1] === 0xfe && buf[2] === 0xba && buf[3] === 0xbe);
  if (process.platform === "linux") return elf;
  if (process.platform === "darwin") return macho;
  return buf.length > 1_000_000;
}

async function usable() {
  if (!existsSync(dest)) return false;
  const buf = await readFile(dest);
  if (buf.length < 1_000_000 || !matchesPlatform(buf)) return false;
  try {
    execFileSync(dest, ["-version"], { timeout: 8000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (await usable()) {
  console.log("ffmpeg already usable on", process.platform, process.arch);
  process.exit(0);
}

const asset = assetName();
if (!asset) {
  console.error("no ffmpeg asset for", process.platform, process.arch);
  process.exit(1);
}

if (existsSync(dest)) await unlink(dest);

const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`;
console.log("downloading ffmpeg", asset);
const res = await fetch(url, { redirect: "follow" });
if (!res.ok) {
  console.error("download failed", res.status);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
if (buf.length < 1_000_000 || !matchesPlatform(buf)) {
  console.error("download is not a native ffmpeg binary", buf.length);
  process.exit(1);
}
await mkdir(path.dirname(dest), { recursive: true });
await writeFile(dest, buf);
await chmod(dest, 0o755);
if (!(await usable())) {
  console.error("downloaded ffmpeg does not run");
  process.exit(1);
}
console.log("ffmpeg ready", buf.length);
