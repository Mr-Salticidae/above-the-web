// Cache-busting for embedded static games under public/*/.
//
// Astro copies public/ verbatim (no bundler hashing), so a returning visitor's
// browser can serve a cached script.js even after we ship a new build. This
// script rewrites local <link href="*.css"> / <script src="*.js"> references in
// each public/*/index.html to carry a ?v=<content-hash> query. When a file's
// content changes its URL changes, so the browser is forced to refetch it.
//
// Idempotent: an existing ?v=... is stripped and recomputed from current bytes.
// Runs on every build (see package.json "build"), so it self-maintains.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Match <link ... href="x.css"> and <script ... src="x.js">, with optional
// existing ?v=. Skips absolute URLs (http/https///) — only local assets.
const REF = /(<(?:link|script)\b[^>]*?\b(?:href|src)=")([^"?:]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(")/g;

function hash8(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
}

function stampHtml(htmlPath) {
  const dir = dirname(htmlPath);
  let html = readFileSync(htmlPath, "utf8");
  let count = 0;
  html = html.replace(REF, (m, pre, assetPath, post) => {
    const file = join(dir, assetPath);
    if (!existsSync(file)) return m; // leave foreign/missing refs untouched
    count++;
    return `${pre}${assetPath}?v=${hash8(file)}${post}`;
  });
  if (count > 0) {
    writeFileSync(htmlPath, html);
    console.log(`  stamped ${count} asset ref(s): ${htmlPath.replace(PUBLIC_DIR, "public")}`);
  }
  return count;
}

let total = 0;
for (const name of readdirSync(PUBLIC_DIR)) {
  const indexPath = join(PUBLIC_DIR, name, "index.html");
  if (statSync(join(PUBLIC_DIR, name)).isDirectory() && existsSync(indexPath)) {
    total += stampHtml(indexPath);
  }
}
console.log(`stamp-assets: ${total} reference(s) versioned.`);
