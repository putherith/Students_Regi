const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.join(root, "dist");
const entries = [
  ".nojekyll",
  "README.md",
  "index.html",
  "google-sheet-backend.gs",
  "supabase-schema.sql",
  "assets"
];

fs.mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  const src = path.join(root, entry);
  if (!fs.existsSync(src)) continue;

  const dest = path.join(outDir, entry);
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (source) => !source.split(path.sep).includes(".git")
  });
}

fs.writeFileSync(
  path.join(outDir, "_worker.js"),
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`
);
