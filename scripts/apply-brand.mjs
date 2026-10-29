import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// VITE_BRAND_NAME only covers the navbar and footer partials. This pass
// replaces the remaining "BentoPDF" mentions (titles, meta tags, JSON-LD,
// breadcrumbs, translations, UI strings) in the build output.
//
// Left untouched on purpose:
// - handles such as x.com/BentoPDF and @BentoPDF, so links keep working
// - copyright notices ("Copyright © 2025 BentoPDF") and license attribution
//   ("BentoPDF (AGPL-3.0)")
// - pages that describe the upstream project or its operator (about,
//   contact, licensing, privacy, terms, blog, docs) and vendored libraries

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const BRAND = (process.env.VITE_BRAND_NAME || '').trim();
const PATTERN = /(?<![/@\w])BentoPDF(?!\w| \(AGPL)/g;
const EXTENSIONS = new Set(['.html', '.json', '.js']);
const SKIP_PAGES = new Set([
  'about.html',
  'contact.html',
  'licensing.html',
  'privacy.html',
  'terms.html',
]);
const SKIP_DIRS = new Set(['blog', 'docs']);

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIRS.has(entry.name) ? [] : listFiles(full);
    }
    if (SKIP_PAGES.has(entry.name)) return [];
    if (entry.name.startsWith('coherentpdf')) return [];
    return EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

if (!BRAND || BRAND === 'BentoPDF') {
  console.log('Brand: VITE_BRAND_NAME not set, keeping BentoPDF.');
} else if (!fs.existsSync(DIST_DIR)) {
  console.log('Brand: dist/ not found, nothing to rename.');
} else {
  let files = 0;
  let mentions = 0;
  for (const file of listFiles(DIST_DIR)) {
    const text = fs.readFileSync(file, 'utf-8');
    let count = 0;
    const next = text.replace(PATTERN, (match, offset) => {
      if (/copyright/i.test(text.slice(Math.max(0, offset - 30), offset))) {
        return match;
      }
      count++;
      return BRAND;
    });
    if (count > 0) {
      fs.writeFileSync(file, next);
      files++;
      mentions += count;
    }
  }
  console.log(
    `Brand: replaced ${mentions} BentoPDF mentions with ${BRAND} in ${files} files.`
  );
}
