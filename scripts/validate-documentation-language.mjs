import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const ignoredDirectories = new Set(['.git', 'node_modules', 'release']);
const markdownFiles = [];

async function collectMarkdown(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdown(absolutePath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(absolutePath);
    }
  }
}

await collectMarkdown(root);

const swedishPatterns = [
  /[åäöÅÄÖ]/,
  /\bkom igång\b/i,
  /\b(?:börja|öppna|välj|annons|säkerhetskopia|papperskorgen)\b/i,
];
const errors = [];

for (const file of markdownFiles.sort()) {
  const source = await readFile(file, 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    if (swedishPatterns.some((pattern) => pattern.test(line))) {
      errors.push(`${path.relative(root, file)}:${index + 1} contains Swedish documentation text`);
    }
  });
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`documentation language: ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `documentation language validation passed for ${markdownFiles.length} Markdown files`,
  );
}
