import { chmod, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "bin", "ffmpeg");
if (existsSync(dest)) {
  console.log("ffmpeg already present");
  process.exit(0);
}

const platform = process.platform;
const arch = process.arch;
let asset;
if (platform === "linux" && (arch === "x64" || arch === "arm64")) {
  asset = arch === "arm64" ? "ffmpeg-linux-arm64" : "ffmpeg-linux-x64";
} else if (platform === "darwin" && arch === "arm64") {
  asset = "ffmpeg-darwin-arm64";
} else if (platform === "darwin") {
  asset = "ffmpeg-darwin-x64";
} else if (platform === "win32") {
  asset = "ffmpeg-win32-x64";
} else {
  console.error("no ffmpeg asset for", platform, arch);
  process.exit(1);
}

const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`;
console.log("downloading ffmpeg", asset);
const res = await fetch(url, { redirect: "follow" });
if (!res.ok) {
  console.error("download failed", res.status);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
if (buf.length < 1_000_000) {
  console.error("download too small", buf.length);
  process.exit(1);
}
await mkdir(path.dirname(dest), { recursive: true });
await writeFile(dest, buf);
await chmod(dest, 0o755);
console.log("ffmpeg ready", buf.length);
