// Level 2 (mechanical) — the design-token guard.
//
// This config carries ONLY the token rules — nothing else. That is the whole point: in a real,
// years-old codebase `src/` is full of unrelated historical lint findings, so un-ignoring it
// wholesale would bury token enforcement under a cleanup nobody budgeted. A separate, surgical
// config lets the token gate run over live code TODAY, decoupled from that debt — and turns the
// gap into a ratchet you can drive to zero (see `lint:tokens:count`).
//
// Every message names an ACTION, not a scolding — because the reader is increasingly an AI agent
// that acts on the message text. A good error message is now part of your prompt engineering.
module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: { jsx: true },
	},
	rules: {
		"no-restricted-syntax": [
			"error",
			{
				// Arbitrary hex in a Tailwind class: bg-[#fff], text-[#1a1a1a], border-[#333]…
				selector:
					"Literal[value=/(?:bg|text|border|ring|fill|stroke|from|to|via)-\\[#[0-9a-fA-F]{3,8}\\]/]",
				message:
					"Arbitrary hex in a Tailwind class — use a semantic token (bg-surface, text-muted-foreground). If none fits, add one to tokens/semantic/.",
			},
			{
				// Tailwind built-in color scale: text-blue-500, bg-gray-800 — not theme-aware.
				selector:
					"Literal[value=/\\b(?:bg|text|border|ring|fill|stroke|divide|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
				message:
					"Tailwind built-in color scale is not theme-aware — use a semantic token (text-foreground, bg-surface-2).",
			},
			{
				// am5.color("#292929") — a hardcoded, theme-blind chart color.
				selector:
					"CallExpression[callee.property.name='color'] > Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
				message:
					"am5.color('#hex') is theme-blind — use getCssVarColor('--color-…', '#fallback') so charts follow the theme.",
			},
			{
				// Regression guard — the OLD names a migration removed. Zero current usages; this fires
				// only if someone (or an agent) RE-INTRODUCES a legacy name. Codifying a completed
				// migration so it cannot silently reverse is high-leverage and nearly free.
				selector:
					"Literal[value=/\\b(?:bg|text|border|ring)-(?:baseBg|primaryGrey|surface2|primaryBlackSecondary)\\b/]",
				message:
					"Legacy token name (pre-migration). Use the semantic equivalent: bg-background, text-muted-foreground, bg-surface-2, border-border.",
			},
		],
	},
};
