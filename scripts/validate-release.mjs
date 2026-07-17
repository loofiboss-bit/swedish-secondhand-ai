import { readFile, stat } from 'node:fs/promises';
import process from 'node:process';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
const githubTag =
  process.env.GITHUB_REF_TYPE === 'tag' || process.env.GITHUB_REF?.startsWith('refs/tags/')
    ? process.env.GITHUB_REF_NAME
    : '';
const expectedTag = process.env.RELEASE_TAG || githubTag || '';
const errors = [];

if (!/^[1-9]\d*\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/.test(version)) {
  errors.push(`package version ${version} is not an approved semantic desktop release version`);
}
if (expectedTag && expectedTag !== `v${version}`) {
  errors.push(`tag ${expectedTag} does not match package version v${version}`);
}

const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
if (!changelog.includes(`## ${version} -`)) {
  errors.push(`CHANGELOG.md has no dated ${version} section`);
}

for (const relativePath of [
  'PRIVACY.md',
  'SECURITY.md',
  'SUPPORT.md',
  `docs/releases/v${version}.md`,
  '.ai/CODEX_ROADMAP.md',
]) {
  try {
    const file = await stat(new URL(`../${relativePath}`, import.meta.url));
    if (!file.isFile() || file.size === 0) errors.push(`${relativePath} is empty`);
  } catch {
    errors.push(`${relativePath} is missing`);
  }
}

const serializedPackage = JSON.stringify(packageJson);
for (const requiredTarget of ['nsis', 'portable', 'AppImage']) {
  if (!serializedPackage.includes(requiredTarget))
    errors.push(`missing package target ${requiredTarget}`);
}

try {
  const rendererHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const rootRelativeAssets = [
    ...rendererHtml.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+)["']/g),
  ].map((match) => match[1]);
  if (rootRelativeAssets.length > 0) {
    errors.push(
      `packaged renderer contains root-relative assets that fail under file://: ${rootRelativeAssets.join(', ')}`,
    );
  }
} catch {
  errors.push('dist/index.html is missing; build the renderer before release validation');
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`release validation: ${error}`));
  process.exitCode = 1;
} else {
  console.log(`release validation passed for v${version}${expectedTag ? ` (${expectedTag})` : ''}`);
}
