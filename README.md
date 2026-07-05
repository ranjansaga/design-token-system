# design-token-system

A small, runnable companion to my post, "One Theme, Three Products, Zero Drift."

One token source gets compiled into whatever each platform actually needs (CSS variables, a Tailwind
theme, JS objects for React Native), along with the lint rules and build setup that stop people *and*
AI agents from reaching past the semantic layer.

I kept it small on purpose. The pipeline was never the interesting part; Style Dictionary does most
of that work. What I care about is the reasoning behind what made it in and what didn't. Everything
here has to earn its place against one of three constraints: three target platforms, two versions of
Tailwind running side by side, and theming that switches at runtime. Anything that was there just
because it looked clean, I cut.

One caveat about scope. This repo shows the architecture and the enforcement setup, but it can't
recreate the story the post is really about, the lint rule that had silently never run against 1,208
real violations. That only shows up in a large, aging codebase. What you *can* do here is the thing
the post ends on: run the guard and watch it fail on purpose (step 3 below).

## Layout

```
packages/design-tokens/
  tokens/primitive/color.json   raw scales, loaded only to resolve refs, never emitted   (Decision 1)
  tokens/dimension.json         spacing / radius / fontSize, theme-independent            (Decision 2)
  tokens/semantic/{light,dark}  roles pointing at aliases; dark holds only what changes   (Decision 4)
  build.mjs                     Style Dictionary v4, produces everything under dist/
  dist/                         generated and committed, so you can consume it with no build step
example/
  web/Dashboard.tsx             the right way: semantic tokens, theme-unaware
  web/Broken.tsx                the wrong way: violations seeded for the guard to catch
  native/theme.tsx              Decision 4, RN theming rebuilt in JS (ThemeProvider / useTheme)
.eslintrc.tokens.cjs            the token-only lint guard
AGENTS.md                       prose guidance that gets loaded into an agent's context
```

## Where each decision lives

The post walks through four decisions. Here's where to find each one in the code.

| Decision | Where |
|---|---|
| 1. Primitives are build-time only | `build.mjs`, `PRIMITIVE_GROUPS` + `isEmitted`. A class like `text-gray-500` can't exist in any output, so there's nothing to bypass. |
| 2. Neutral source, consumer idiom in a transform | `build.mjs`, `V4_NAMESPACE`. The source says `fontSize`; Tailwind v4 gets `--text-*`; everyone else keeps `--font-size-*`. Renaming a consumer's vocabulary is a one-line change. |
| 3. Hex is canonical, channel form is a v3-only transform | `dist/css/variables.css` (hex) vs `dist/css/variables.v3.css` (`47 107 255`). Same tokens, two files. When you drop v3 later you delete one file and touch no source. |
| 4. Web/native theming asymmetry | `dist/css/*` (`:root` / `.dark` cascade) vs `dist/native/*` (`{ light, dark }` objects), plus `example/native/theme.tsx`. |

## The enforcement ladder

The governance idea from the post is that guidance, lint, and architecture are three different
strengths, and you want to push each rule to the strongest one you can afford.

- **Prose** ([`AGENTS.md`](./AGENTS.md)), with ✓/✗ examples. Steers an agent, can't stop one.
- **Lint** ([`.eslintrc.tokens.cjs`](./.eslintrc.tokens.cjs)). Bans hardcoded hex, the Tailwind
  built-in color scale, theme-blind `am5.color("#hex")`, and the legacy class names an earlier
  migration removed. Every message names the fix, because an AI agent will act on the text of the
  error.
- **Architecture** (Decision 1). Nothing to run and nothing to read: the bad path doesn't exist.

## Run it

```bash
pnpm install     # style-dictionary + eslint
pnpm build       # regenerate packages/design-tokens/dist/ from tokens/
```

```bash
pnpm lint:tokens         # fails: one error per violation in example/web/Broken.tsx
pnpm lint:tokens:count   # prints the running total (the "ratchet" number, at demo scale)
```

`lint:tokens` failing is the point, not a problem. `Broken.tsx` is seeded on purpose; fix or delete
its violations and the check goes green. `Dashboard.tsx` is already clean.

## Consuming the tokens in a real app

```ts
// Tailwind v3 — channel form, so bg-primary/50 works
import "design-tokens/css/variables.v3.css";
// tailwind.config.js: const { colors, spacing, borderRadius, fontSize } = require("design-tokens/tailwind/theme.cjs")

// Tailwind v4 — hex @theme, opacity via color-mix
import "design-tokens/css/theme.v4.css";

// Preact / plain CSS — hex, valid on its own
import "design-tokens/css/variables.css";

// React Native / charts — JS objects, no CSS
import { themes } from "design-tokens/native"; // themes[isDark ? "dark" : "light"].color.success
```
