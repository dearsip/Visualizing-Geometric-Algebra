import { mkdir, cp, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });
// Deliberate allowlist: local book scans can never enter a deployment artifact.
for (const name of ['index.html', 'styles.css', 'src', 'assets']) {
  await cp(path.join(root, name), path.join(dist, name), { recursive: true });
}
await writeFile(path.join(dist, '.nojekyll'), '');
const { chapters } = await import('../src/content.js');
const shell = await readFile(path.join(root, 'index.html'), 'utf8');
for (const chapter of chapters) {
  await writeFile(path.join(dist, `${chapter.id}.html`), shell.replace('<title>Geometric Algebra · Visual Atlas</title>', `<title>${chapter.title} · Visual Atlas</title>`));
}
async function audit(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) await audit(p);
    else if (!/\.(html|css|js|woff2|svg)$/.test(f.name) && !['.nojekyll','OFL.txt','FONTLOG.txt'].includes(f.name)) {
      throw new Error(`Unexpected public file: ${p}. Clear dist before rebuilding.`);
    }
  }
}
await audit(dist);
console.log(`Built ${chapters.length + 1} static pages in ${dist}. No reference PDF or screenshots included.`);
