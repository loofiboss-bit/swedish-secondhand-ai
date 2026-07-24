import { readFile } from 'node:fs/promises';
import process from 'node:process';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
const expectedTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || '';
const attestationVersion = process.env.RELEASE_ATTESTATION_VERSION?.trim() || '';
const errors = [];

const isTrue = (name) => {
  const value = process.env[name]?.trim().toLowerCase();
  if (value !== 'true') errors.push(`${name} must be set to true in repository release variables`);
};

if (expectedTag && expectedTag !== `v${version}`) {
  errors.push(`tag ${expectedTag} does not match package version v${version}`);
}
if (attestationVersion !== version) {
  errors.push(
    `RELEASE_ATTESTATION_VERSION must equal package version ${version}; received ${attestationVersion || 'unset'}`,
  );
}

for (const gate of [
  'RELEASE_NO_OPEN_P0_P1',
  'RELEASE_NO_HIGH_SECURITY_FINDINGS',
  'RELEASE_MIGRATION_VERIFIED',
  'RELEASE_WINDOWS_UPGRADE_VERIFIED',
  'RELEASE_LINUX_UPGRADE_VERIFIED',
]) {
  isTrue(gate);
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`publication gate: ${error}`));
  process.exitCode = 1;
} else {
  console.log(`publication gates passed for v${version}${expectedTag ? ` (${expectedTag})` : ''}`);
}
