# Neighborly — documentation hub

All Markdown and text docs for this repo live under **`docs/`** (this folder).

| File | Purpose |
|------|---------|
| [AGENTS.md](AGENTS.md) | Mandatory rules for agents and developers |
| [CLAUDE.md](CLAUDE.md) | Stack and workflow context |
| [ROADMAP.md](ROADMAP.md) | Phased roadmap (source of truth) |
| [ADMIN-PARITY.md](ADMIN-PARITY.md) | Admin feature parity tracker |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture skeleton |
| [DECISIONS.md](DECISIONS.md) | ADRs |
| [GLOSSARY.md](GLOSSARY.md) | Glossary |
| [project-context.txt](project-context.txt) | Single-file AI / onboarding context |
| [dependencies.txt](dependencies.txt), [template.txt](template.txt), [ui.txt](ui.txt) | Reference notes |

The repository root keeps short **stub** files (`README.md`, `AGENTS.md`, `CLAUDE.md`) that point here so GitHub and tools that expect root paths still resolve.

---

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/be42524e-ea4c-4e23-9b8e-85395bb9016e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
