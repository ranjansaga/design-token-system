/**
 * Style Dictionary build — one DTCG source → the outputs each platform actually needs.
 *
 *   tokens/primitive/color.json  (raw scales — resolve-only, never emitted)
 *   tokens/dimension.json        (spacing / radius / fontSize — theme-independent)
 *   tokens/semantic/{light,dark}.json  (roles → aliases)
 *      ├─▶ dist/css/variables.css     :root + .dark, HEX          → Preact (plain CSS) + Tailwind v4 base
 *      ├─▶ dist/css/variables.v3.css  :root + .dark, RGB channels → Tailwind v3 (opacity modifiers)
 *      ├─▶ dist/css/theme.v4.css      @theme + .dark, HEX         → Tailwind v4 (fontSize → --text-*)
 *      ├─▶ dist/tailwind/theme.cjs    colors/spacing/… maps       → tailwind.config.js (v3)
 *      └─▶ dist/native/index.{js,cjs,d.ts}  { light, dark } objects → React Native + charts
 *
 * The four decisions from the post, encoded here:
 *   D1  Primitives are loaded only to resolve references; `isEmitted` filters them out (they
 *       never become a variable, utility, or native key — the semantic bypass simply cannot exist).
 *   D2  The source is neutral (color / spacing / radius / fontSize). Each consumer's idiom lives in
 *       a transform: `V4_NAMESPACE` maps fontSize → --text-* for Tailwind v4 only; everyone else
 *       keeps the neutral --font-size-*. Renaming a consumer's vocabulary is a one-line edit here.
 *   D3  Hex is canonical (variables.css, theme.v4.css, native). Channel form (`47 107 255`) is a
 *       v3-only transform output — it is NOT a valid standalone color, so it is quarantined to the
 *       one consumer that needs it. A future v4 migration deletes variables.v3.css. Nothing else moves.
 *   D4  The build emits web CSS AND a { light, dark } JS object, because React Native has no cascade —
 *       its theming is rebuilt in JS (see example/native/theme.tsx).
 */
import StyleDictionary from "style-dictionary";
import { mkdirSync, writeFileSync } from "node:fs";

/* D1 — raw color scales. A token is a primitive iff its second path segment is one of these.
 * Anything else under `color.*` is a semantic role and is emitted. */
const PRIMITIVE_GROUPS = new Set([
	"white", "black", "gray", "blue", "purple", "teal", "green", "red", "orange",
]);

/* D2 — the ONLY place a consumer's vocabulary touches the neutral source. Tailwind v4 generates
 * font-size utilities from `--text-*`; our source group is the standard `fontSize`. This maps one
 * to the other for the v4 target alone. A v4 → v5 namespace rename is a one-line change right here. */
const V4_NAMESPACE = { color: "color", fontSize: "text", spacing: "spacing", radius: "radius" };

const DIMENSION_GROUPS = new Set(["spacing", "radius", "fontSize"]);

const val = (t) => t.$value ?? t.value;
const isLiteral = (t) => Boolean(t.$extensions?.literal);
const isColor = (t) => (t.$type ?? t.type) === "color";

/* D1 — the emit filter. Semantic colors + all dimensions ship; primitive color scales do not. */
const isEmitted = (t) =>
	(t.path[0] === "color" && !PRIMITIVE_GROUPS.has(t.path[1])) || DIMENSION_GROUPS.has(t.path[0]);

function hexToChannels(hex) {
	let h = hex.replace("#", "");
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `${r} ${g} ${b}`;
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const v4Name = (path) => `--${V4_NAMESPACE[path[0]]}-${path.slice(1).join("-")}`;

/* D3 — the v3-only transform. Colors become bare RGB channels; literals (baked alpha) and
 * dimensions (px) pass through untouched. */
StyleDictionary.registerTransform({
	name: "color/channels",
	type: "value",
	filter: (t) => isColor(t) && !isLiteral(t),
	transform: (t) => hexToChannels(val(t)),
});

function makeSD(semanticFile) {
	return new StyleDictionary({
		log: { warnings: "disabled" },
		source: ["tokens/primitive/*.json", "tokens/dimension.json", semanticFile],
		platforms: {
			web: { transforms: ["attribute/cti", "name/kebab", "color/channels"] }, // channels (v3)
			js: { transforms: ["attribute/cti", "name/kebab"] },                     // hex (everyone else)
		},
	});
}

async function tokensFor(semanticFile) {
	const sd = makeSD(semanticFile);
	const web = (await sd.getPlatformTokens("web")).allTokens.filter(isEmitted);
	const js = (await sd.getPlatformTokens("js")).allTokens.filter(isEmitted);
	// name (kebab, e.g. "color-muted-foreground" / "font-size-body") → value + metadata.
	const webMap = new Map(web.map((t) => [t.name, val(t)]));
	const jsMap = new Map(js.map((t) => [t.name, { value: val(t), literal: isLiteral(t), path: t.path }]));
	return { web, webMap, jsMap };
}

const light = await tokensFor("tokens/semantic/light.json");
const dark = await tokensFor("tokens/semantic/dark.json");

/* ---- CSS emitter. .dark holds ONLY the tokens whose value differs from light (matches the
 * runtime theming model: define twice, scope the override). Dimensions never theme, so they
 * appear once in :root and never in .dark. ---- */
function buildCss({ nameOf, lightOf, darkOf, rootSel, darkSel, banner }) {
	const names = light.web.map((t) => t.name);
	const root = names.map((n) => `\t${nameOf(n)}: ${lightOf(n)};`);
	const drk = names.filter((n) => darkOf(n) !== lightOf(n)).map((n) => `\t${nameOf(n)}: ${darkOf(n)};`);
	return `${banner}\n${rootSel} {\n${root.join("\n")}\n}\n\n${darkSel} {\n${drk.join("\n")}\n}\n`;
}

const AUTO = "/* AUTO-GENERATED by build.mjs — do not edit. Edit tokens/*.json instead. */";
const nameFor = (n) => light.jsMap.get(n).path; // path lookup keyed by kebab name
const kebabVar = (n) => `--${n}`;
const v4Var = (n) => v4Name(nameFor(n));

// HEX — Preact plain CSS + Tailwind v4 base. Standalone-valid colors.
const cssHex = buildCss({
	nameOf: kebabVar,
	lightOf: (n) => light.jsMap.get(n).value,
	darkOf: (n) => dark.jsMap.get(n).value,
	rootSel: ":root",
	darkSel: ".dark",
	banner: `${AUTO}\n/* HEX — Preact (plain CSS) + Tailwind v4 base. Standalone-valid colors. */`,
});

// RGB channel form — Tailwind v3 only (consumed as rgb(var(--x) / <alpha-value>)).
const cssV3 = buildCss({
	nameOf: kebabVar,
	lightOf: (n) => light.webMap.get(n),
	darkOf: (n) => dark.webMap.get(n),
	rootSel: ":root",
	darkSel: ".dark",
	banner: `${AUTO}\n/* RGB channel form — Tailwind v3 only. bg-primary/50 needs bare channels. */`,
});

// Tailwind v4 @theme — HEX, and fontSize namespaced to --text-* (D2). v4 does opacity via color-mix,
// so hex is fine; no channel form needed here.
const cssV4 = buildCss({
	nameOf: v4Var,
	lightOf: (n) => light.jsMap.get(n).value,
	darkOf: (n) => dark.jsMap.get(n).value,
	rootSel: "@theme",
	darkSel: ".dark",
	banner: `${AUTO}\n/* Tailwind v4 — HEX @theme; fontSize → --text-* via V4_NAMESPACE (Decision 2). */`,
});

const darkCount = light.web.filter((t) => dark.webMap.get(t.name) !== light.webMap.get(t.name)).length;

/* ---- tailwind/theme.cjs (v3 config) ---- */
const group = (name) => light.jsMap.get(name).path[0];
const stripPrefix = (name) => name.replace(/^(?:color|spacing|radius|font-size)-/, "");
const colorEntry = (t) => {
	const key = stripPrefix(t.name);
	const value = isLiteral(t) ? `var(--${t.name})` : `rgb(var(--${t.name}) / <alpha-value>)`;
	return `\t\t"${key}": "${value}",`;
};
const varEntry = (t) => `\t\t"${stripPrefix(t.name)}": "var(--${t.name})",`;
const section = (predicate, entry) => light.web.filter(predicate).map(entry).join("\n");
const themeCjs = `// AUTO-GENERATED by build.mjs — do not edit. Edit tokens/*.json instead.
module.exports = {
\tcolors: {
${section((t) => group(t.name) === "color", colorEntry)}
\t},
\tspacing: {
${section((t) => group(t.name) === "spacing", varEntry)}
\t},
\tborderRadius: {
${section((t) => group(t.name) === "radius", varEntry)}
\t},
\tfontSize: {
${section((t) => group(t.name) === "fontSize", varEntry)}
\t},
};
`;

/* ---- native/index.{js,cjs,d.ts} (D4 — JS objects, hex) ---- */
function nativeObject(jsMap) {
	const out = { color: {}, spacing: {}, radius: {}, fontSize: {} };
	for (const [name, { value, path }] of jsMap) {
		const key = camel(name.replace(/^(?:color|spacing|radius|font-size)-/, ""));
		out[path[0]][key] = value;
	}
	return out;
}
const themes = { light: nativeObject(light.jsMap), dark: nativeObject(dark.jsMap) };
const themesJson = JSON.stringify(themes, null, "\t");
const nativeJs = `// AUTO-GENERATED by build.mjs — do not edit. Edit tokens/*.json instead.
export const themes = ${themesJson};
export const light = themes.light;
export const dark = themes.dark;
export default themes;
`;
const nativeCjs = `// AUTO-GENERATED by build.mjs — do not edit. Edit tokens/*.json instead.
const themes = ${themesJson};
module.exports = { themes, light: themes.light, dark: themes.dark };
module.exports.default = themes;
`;
const typeOf = (obj) => `{ ${Object.keys(obj).map((k) => `${JSON.stringify(k)}: string`).join("; ")} }`;
const dts = `// AUTO-GENERATED by build.mjs — do not edit.
export type Theme = {
	color: ${typeOf(themes.light.color)};
	spacing: ${typeOf(themes.light.spacing)};
	radius: ${typeOf(themes.light.radius)};
	fontSize: ${typeOf(themes.light.fontSize)};
};
export declare const themes: { light: Theme; dark: Theme };
export declare const light: Theme;
export declare const dark: Theme;
declare const _default: { light: Theme; dark: Theme };
export default _default;
`;

/* ---- write ---- */
mkdirSync("dist/css", { recursive: true });
mkdirSync("dist/tailwind", { recursive: true });
mkdirSync("dist/native", { recursive: true });
writeFileSync("dist/css/variables.css", cssHex);
writeFileSync("dist/css/variables.v3.css", cssV3);
writeFileSync("dist/css/theme.v4.css", cssV4);
writeFileSync("dist/tailwind/theme.cjs", themeCjs);
writeFileSync("dist/native/index.js", nativeJs);
writeFileSync("dist/native/index.cjs", nativeCjs);
writeFileSync("dist/native/index.d.ts", dts);

console.log(
	`✓ built ${light.web.length} tokens (${darkCount} dark overrides) → ` +
		`css/variables.css (hex), css/variables.v3.css (channels), css/theme.v4.css (v4), ` +
		`tailwind/theme.cjs, native`,
);
