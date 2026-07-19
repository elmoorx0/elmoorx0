---
name: 🐛 Bug report
about: Report a bug to help us improve Elmoorx
title: "[bug] "
labels: ["bug", "triage"]
assignees: []
---

## 🐛 Describe the bug

A clear and concise description of what the bug is.

## 🔄 To reproduce

Steps to reproduce the behavior:

1. Run `elmoorx create my-app`
2. Edit `src/index.elmoorx.tsx` and add:
   ```tsx
   import { $state, h } from "@elmoorx/runtime";
   const count = $state(0);
   export default () => h("button", { onClick: () => count.set(c => c + 1) }, count);
   ```
3. Run `npm run dev`
4. See error

## ✅ Expected behavior

A clear and concise description of what you expected to happen.

## ❌ Actual behavior

What actually happened. Include error messages, stack traces, and any unexpected output.

## 📦 Environment

- **Elmoorx version**: [e.g. 3.0.0-alpha.3 — run `npm ls @elmoorx/runtime`]
- **Node.js version**: [run `node --version`]
- **npm version**: [run `npm --version`]
- **OS**: [e.g. macOS 14.5, Ubuntu 24.04, Windows 11]
- **Browser** (if applicable): [e.g. Chrome 130, Safari 17]

## 📝 Reproduction repo

If possible, please provide a link to a minimal reproduction repo or a
[StackBlitz](https://stackblitz.com)/[CodeSandbox](https://codesandbox.io)
instance. This dramatically speeds up debugging.

## 📸 Screenshots / logs

If applicable, add screenshots or log output to help explain your problem.

```
Paste relevant log output here
```

## 🏷️ Additional context

Add any other context about the problem here.

- Is this a regression (worked in a previous version)? If so, which version?
- Are you using any Elmoorx plugins or adapters?
- Any workarounds you've found?
