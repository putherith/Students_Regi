const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dist = path.join(root, "dist");
const workerDir = path.join(dist, "students_registration_kh");
const serverDir = path.join(dist, "server");
const workerEntry = path.join(workerDir, "index.js");

if (!fs.existsSync(workerEntry)) {
  throw new Error(`Missing Cloudflare worker bundle: ${workerEntry}`);
}

fs.mkdirSync(serverDir, { recursive: true });
fs.copyFileSync(workerEntry, path.join(serverDir, "index.js"));

const workerConfig = path.join(workerDir, "wrangler.json");
if (fs.existsSync(workerConfig)) {
  fs.copyFileSync(workerConfig, path.join(serverDir, "wrangler.json"));
}
