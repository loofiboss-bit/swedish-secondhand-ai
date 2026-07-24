import { readFile } from 'node:fs/promises';
import process from 'node:process';

const implementation = await readFile(new URL('../.ai/CODEX_ROADMAP.md', import.meta.url), 'utf8');
const product = await readFile(new URL('../.ai/ROADMAP.md', import.meta.url), 'utf8');
const releasePlan = await readFile(
  new URL('../docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md', import.meta.url),
  'utf8',
);
const releaseGate = await readFile(
  new URL('../docs/releases/v4.0.0-rc.1.md', import.meta.url),
  'utf8',
);
const errors = [];

for (const requiredText of [
  '# Swedish Secondhand AI — v4.0.0 Focused Seller Workspace roadmap',
  '## G0 — Stable v3.0.0 prerequisite',
  'Status: completed and published 2026-07-24',
  '## M1 — Unified readiness and category boundaries',
  '## M6 — Release hardening',
  '- [x] G0 Stable v3.0.0 prerequisite',
]) {
  if (!implementation.includes(requiredText)) {
    errors.push(`.ai/CODEX_ROADMAP.md is missing current release state: ${requiredText}`);
  }
}

for (const requiredText of [
  'The v4 product authority is',
  'docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md',
  'v3.0.0 — stable Guided Selling release',
  '## Current product track',
  'v4.0.0 Focused Seller Workspace',
  'No v4 release is public.',
]) {
  if (!product.includes(requiredText)) {
    errors.push(`.ai/ROADMAP.md is missing current product state: ${requiredText}`);
  }
}

for (const staleText of [
  'After stable v1',
  'public v2 beta followed by stable v2.0.0',
  'The stable v1 gate opens no earlier',
  'v3.0.0 Guided Selling is in its required RC observation period',
  'Stable v3.0.0 is not published',
]) {
  if (product.includes(staleText)) {
    errors.push(`.ai/ROADMAP.md contains superseded release sequencing: ${staleText}`);
  }
}

for (const [name, source] of [
  ['.ai/CODEX_ROADMAP.md', implementation],
  ['.ai/ROADMAP.md', product],
  ['docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md', releasePlan],
  ['docs/releases/v4.0.0-rc.1.md', releaseGate],
]) {
  for (const forbidden of [
    /seven[- ]day/i,
    /seven days/i,
    /sju dagar/i,
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
