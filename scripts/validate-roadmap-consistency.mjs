import { readFile } from 'node:fs/promises';
import process from 'node:process';

const implementation = await readFile(new URL('../.ai/CODEX_ROADMAP.md', import.meta.url), 'utf8');
const product = await readFile(new URL('../.ai/ROADMAP.md', import.meta.url), 'utf8');
const errors = [];

for (const requiredText of [
  '# Swedish Secondhand AI — v3.0.0 Guided Selling roadmap',
  '## G0 — Safe v2.0.1 maintenance release',
  '## M1 — Schema 4 and simplified core contracts',
  '## M6 — v3 stable release',
  '- [x] G0 Safe v2.0.1 maintenance release',
]) {
  if (!implementation.includes(requiredText)) {
    errors.push(`.ai/CODEX_ROADMAP.md is missing current release state: ${requiredText}`);
  }
}

for (const requiredText of [
  'The implementation authority is [`.ai/CODEX_ROADMAP.md`](./CODEX_ROADMAP.md).',
  'v2.0.1 — verified Windows/Linux maintenance release',
  '## Current product track',
  'v3.0.0 Guided Selling prioritizes an immediate offline start',
]) {
  if (!product.includes(requiredText)) {
    errors.push(`.ai/ROADMAP.md is missing current product state: ${requiredText}`);
  }
}

for (const staleText of [
  'After stable v1',
  'public v2 beta followed by stable v2.0.0',
  'The stable v1 gate opens no earlier',
]) {
  if (product.includes(staleText)) {
    errors.push(`.ai/ROADMAP.md contains superseded release sequencing: ${staleText}`);
  }
}

for (const [name, source] of [
  ['.ai/CODEX_ROADMAP.md', implementation],
  ['.ai/ROADMAP.md', product],
]) {
  for (const forbidden of [
    /seven[- ]day/i,
    /seven days/i,
    /required .{0,20}observation period/i,
    /minimum candidate age/i,
    /waiting period .{0,20}required/i,
  ]) {
    if (forbidden.test(source)) {
      errors.push(`${name} contains a time-based release gate: ${forbidden}`);
    }
  }
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`roadmap validation: ${error}`));
  process.exitCode = 1;
} else {
  console.log('roadmap validation passed: product and implementation release states agree');
}
