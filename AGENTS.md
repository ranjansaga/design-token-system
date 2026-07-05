# AGENTS.md — design token rules

This file gets loaded into an AI agent's context every session (`AGENTS.md` by the cross-tool
convention, `CLAUDE.md` in some repos). It's the weakest of the three enforcement layers: prose
guides, but it can't actually stop anyone. The ESLint guard (`.eslintrc.tokens.cjs`) is the layer
that stops you, and primitives being build-time-only is the layer where the mistake isn't even
possible. Follow the rules here anyway, because it's cheaper for everyone if the lint never has to
fire.

All colors come from **semantic tokens**. Don't hardcode a color, and don't reach past the semantic
layer into a raw scale.

### Use these

```
bg-background   text-foreground            — app base pair
bg-surface / bg-surface-2 / bg-surface-3   — panels, nested panels, subtle fills
text-muted-foreground / text-subtle-foreground / text-disabled-foreground
border-border   bg-input   ring-ring
bg-primary  text-primary-foreground        — primary action
bg-accent   accent-purple  accent-teal     — interactive / secondary accents
bg-success / bg-danger / bg-warning  (+ -foreground pairs)
```

Spacing, radius, and font-size come from the same source: `p-4`, `rounded-md`, `text-body`.

### Do NOT (the ESLint guard errors on every one of these)

```tsx
// ✗ hardcoded hex baked into a class
<div className="bg-[#1c1c1e]" />

// ✗ Tailwind built-in color scale — NOT theme-aware, breaks in dark mode
<p className="text-gray-400" />
<span className="bg-blue-500" />

// ✗ theme-blind chart color
series.set("fill", am5.color("#292929"));

// ✗ legacy names removed by the migration
<div className="bg-baseBg border-primaryBlackSecondary" />
```

### Do this instead

```tsx
// ✓ semantic token classes
<div className="bg-surface border border-border">
  <p className="text-foreground">Title</p>
  <p className="text-muted-foreground">Subtitle</p>
</div>

// ✓ chart color that follows the theme
series.set("fill", am5.color(getCssVarColor("--color-surface-2", "#191d26")));
```

If no token fits the role you need, add one to
`packages/design-tokens/tokens/semantic/light.json` **and** `dark.json`, run `pnpm build`, then use
the new `--color-*` var. Don't work around the system with a raw hex; that's exactly the drift this
package exists to stop.
