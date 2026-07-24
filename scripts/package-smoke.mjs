import { open, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const [platform = process.platform, directory = 'release'] = process.argv.slice(2);
const entries = await readdir(directory);
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');

const expected =
  platform === 'linux'
    ? [new RegExp(`^Swedish-Secondhand-AI-${version}-linux-(?:x86_64|x64)\\.AppImage$`)]
    : [
        new RegExp(`^Swedish-Secondhand-AI-${version}-windows-x64-setup\\.exe$`),
        new RegExp(`^Swedish-Secondhand-AI-${version}-windows-x64-portable\\.exe$`),
      ];

for (const pattern of expected) {
  const name = entries.find((entry) => pattern.test(entry));
  if (!name) throw new Error(`Package smoke failed: missing artifact matching ${pattern}`);
  const filePath = path.join(directory, name);
  const metadata = await stat(filePath);
  if (metadata.size < 1_000_000)
    throw new Error(`Package smoke failed: ${name} is unexpectedly small`);

  const handle = await open(filePath, 'r');
  try {
    const magic = Buffer.alloc(4);
    await handle.read(magic, 0, magic.length, 0);
    const validMagic =
      platform === 'linux'
        ? magic.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))
        : magic.subarray(0, 2).equals(Buffer.from('MZ'));
    if (!validMagic)
      throw new Error(`Package smoke failed: ${name} has an invalid executable header`);
  } finally {
    await handle.close();
  }
  console.log(`package smoke passed: ${name} (${metadata.size} bytes)`);
}
