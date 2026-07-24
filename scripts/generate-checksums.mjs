import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const directory = process.argv[2] || 'release';
const outputName = process.argv[3] || 'SHA256SUMS.txt';
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const escapedVersion = packageJson.version.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
const packagePattern = new RegExp(
  `^Swedish-Secondhand-AI-${escapedVersion}-(?:linux-(?:x86_64|x64)\\.AppImage|windows-x64-(?:setup|portable)\\.exe)$`,
);
const names = (await readdir(directory))
  .filter((name) => packagePattern.test(name) || name === 'swedish-secondhand-ai-sbom.cdx.json')
  .sort();

if (names.length === 0) throw new Error(`No release artifacts found in ${directory}`);

const lines = [];
for (const name of names) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    createReadStream(path.join(directory, name))
      .on('data', (chunk) => hash.update(chunk))
      .on('end', resolve)
      .on('error', reject);
  });
  lines.push(`${hash.digest('hex')}  ${name}`);
}

await writeFile(path.join(directory, outputName), `${lines.join('\n')}\n`, 'utf8');
console.log(`wrote ${lines.length} checksums to ${path.join(directory, outputName)}`);
