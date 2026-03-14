---
name: "Validate desktop flow"
description: "Review a Swedish Secondhand AI feature across services, stores, components, and Electron entrypoints before implementation."
argument-hint: "Describe the feature or desktop flow to review"
agent: "agent"
---
Review the requested Swedish Secondhand AI workflow.

Return:
1. The service layer changes required
2. Any Zustand store updates
3. UI or Electron files that must stay in sync
4. Risks around persistence, validation, or desktop packaging
5. The smallest safe implementation slice
