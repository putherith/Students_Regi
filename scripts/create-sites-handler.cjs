const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const outDir = path.join(root, ".sites-build", "dist", "server");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "index.js"),
  `const html = ${JSON.stringify(html)};

export default async function handler() {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
`
);
