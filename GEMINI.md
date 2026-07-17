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

## Architecture rule

Keep dependencies flowing in one direction:

```text
platform/provider adapters -> core services -> Zustand stores -> features/components
```

No persistence, provider SDK, secret, Node API, or unrestricted IPC logic belongs in a UI
component.
