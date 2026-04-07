@AGENTS.md

Before committing ANY changes, always run `npm run build` first and fix all errors. Do not commit or push until the build passes cleanly. This is a Vercel-deployed project — if the build fails locally, it will fail in production.

After adding, renaming, or deleting ANY Convex function files (*.ts in convex/), always run `npx convex dev --once` to regenerate convex/_generated/*, then stage and commit those generated files alongside your changes. Vercel builds will fail if generated files are out of sync. Always run `npm run build` before pushing to verify the build passes.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
