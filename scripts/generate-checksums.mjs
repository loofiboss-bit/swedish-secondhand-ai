import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const directory = process.argv[2] || 'release';
const outputName = process.argv[3] || 'SHA256SUMS.txt';
const names = (await readdir(directory))
  .filter((name) => /\.(?:AppImage|exe|json)$/i.test(name) && name !== outputName)
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
