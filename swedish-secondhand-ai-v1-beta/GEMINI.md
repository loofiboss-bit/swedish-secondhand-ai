# Swedish Secondhand AI — Gemini CLI Instructions

> **Canonical instructions**: `.ai/INSTRUCTIONS.md`
> Operational rules are in `AGENTS.md`.

---

## Instruction Priority

1. `AGENTS.md`
2. `.ai/INSTRUCTIONS.md`
3. This file for Gemini-specific defaults

---

## Workflow

Use: **PLAN -> IMPLEMENT -> TEST -> VALIDATE -> DOCUMENT**

Quality gate:

```bash
npm run validate
```

---

## Architecture Rule

Keep separation: **Services -> Stores -> Features/Components**

No persistence or API logic directly inside UI components.
