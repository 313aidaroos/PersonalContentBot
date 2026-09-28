# JunoAI Notes

## 2026-09-28 — Add shared CI
- PR: https://github.com/313aidaroos/PersonalContentBot/pull/8
- Added .github/workflows/ci.yml — thin caller of the shared reusable workflow 313aidaroos/github-actions/.github/workflows/node-ci.yml@main (checkout → Node 20 → npm ci → lint/typecheck/test/build).
