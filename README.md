# design-token-system

A runnable companion to the post **“One Theme, Three Products, Zero Drift.”** One token source,
projected into the outputs each platform actually needs, with the enforcement ladder that keeps
both humans *and* AI agents on the semantic layer.

It's small on purpose. The value isn't the pipeline — it's the **judgment**: every artifact here
traces back to a real constraint (three platforms, two live Tailwind versions, runtime theming). If
it traced to elegance instead, it wouldn't exist.

> **Scope note (honest).** This demo shows the **architecture** and the **enforcement mechanism**.
> The post's reckoning — discovering a lint rule that had *never run* against 1,208 real violations —
> is a property of a large legacy codebase and isn't reproducible greenfield. What you *can* do here
> is the thing the post ends on: **run the guard and watch it go red** (see step 3).

## Layout

```
packages/design-tokens/      the pipeline (the subject of the post)
  tokens/primitive/color.json     raw scales — loaded to resolve refs, NEVER emitted   (Decision 1)
  tokens/dimension.json           spacing / radius / fontSize — theme-independent      (Decision 2)
  tokens/semantic/{light,dark}    roles → aliases; dark holds only what differs        (Decision 4)
  build.mjs                       Style Dictionary v4 → every output below
  dist/                           generated + committed (consume with no build step)
example/                     a tiny consumer, so the guard has real code to police
  web/Dashboard.tsx               the right way — semantic tokens, theme-unaware
  web/Broken.tsx                  the wrong way — seeded violations for the guard to catch
  native/theme.tsx                Decision 4 — RN theming rebuilt in JS (ThemeProvider/useTheme)
.eslintrc.tokens.cjs         Level 2 — the token-only guard (nothing else)
AGENTS.md                    Level 1 — prose guidance loaded into an agent's context
```

## The four decisions → where they live in the code

| Decision (from the post) | Where to look |
|---|---|
| **1. Primitives are build-time-only** | `build.mjs` → `PRIMITIVE_GROUPS` + `isEmitted`. `text-gray-500` literally cannot exist in any output — the bypass is foreclosed, not forbidden. |
| **2. Neutral source, consumer idiom in a transform** | `build.mjs` → `V4_NAMESPACE`. Source says `fontSize`; Tailwind v4 gets `--text-*`; everyone else keeps `--font-size-*`. Renaming a consumer's vocabulary is one line. |
| **3. Hex is canonical; channel form is a v3-only transform** | `dist/css/variables.css` (hex) vs `dist/css/variables.v3.css` (`47 107 255`). Same tokens, two files. A v4 migration deletes the v3 file — zero source change. |
| **4. Web/native theming asymmetry** | `dist/css/*` (`:root`/`.dark` cascade) vs `dist/native/*` (`{ light, dark }` JS objects) + `example/native/theme.tsx`. |

## The enforcement ladder (the governance half of the post)

**prose guides → lint enforces → architecture forecloses.** Push every rule as far down that ladder
as it will go.

- **Level 1 — prose:** [`AGENTS.md`](./AGENTS.md), with ✓/✗ examples. Steers an agent; can't stop one.
- **Level 2 — lint:** [`.eslintrc.tokens.cjs`](./.eslintrc.tokens.cjs). Bans hardcoded hex, the
  Tailwind built-in scale, theme-blind `am5.color("#hex")`, and — as a **regression guard** — the
  legacy names a migration removed. Each message names an *action*, because an AI agent will act on
  the message text.
- **Level 3 — architecture:** Decision 1. No rule to run, no message to read.

## Run it

```bash
pnpm install          # style-dictionary + eslint
pnpm build            # regenerate packages/design-tokens/dist/ from tokens/
```

```bash
# 3. Watch the guard work — this is the point.
pnpm lint:tokens          # FAILS: one error per violation in example/web/Broken.tsx
pnpm lint:tokens:count    # prints the running total (the "ratchet" number, at demo scale)
```

`lint:tokens` failing is the demo *succeeding* — `Broken.tsx` is seeded on purpose. Delete its
offenders (or fix them to semantic tokens) and the gate goes green. `Dashboard.tsx` is already clean.

## Consuming the tokens (in a real app)

```ts
// Tailwind v3 app — channel form, so bg-primary/50 works.
import "design-tokens/css/variables.v3.css";
// tailwind.config.js:  const { colors, spacing, borderRadius, fontSize } = require("design-tokens/tailwind/theme.cjs")

// Tailwind v4 app — hex @theme, opacity via color-mix.
import "design-tokens/css/theme.v4.css";

// Preact / plain CSS — hex, standalone-valid.
import "design-tokens/css/variables.css";

// React Native / charts — JS objects, no CSS.
import { themes } from "design-tokens/native"; // themes[isDark ? "dark" : "light"].color.success
```

---

*The one rule behind all of it: every piece of complexity had to be justified by a real constraint.
If it wasn't, it didn't ship — including the safety nets, which is exactly why you have to check
that they actually run.*
