// example/web — the WRONG way, on purpose. Every line below is a design-token violation of the
// kind an AI agent emits confidently (the whole corpus it learned from is written this way).
//
// This file exists so you can DO what the post's closing line asks: run the guard and watch it
// fail. `pnpm lint:tokens` should report one error per numbered line; `pnpm lint:tokens:count`
// prints the total. Delete the offenders (or fix them to semantic tokens) and it goes green.
//
// A guardrail you never watched go red is a guardrail you cannot trust.
import * as am5 from "@amcharts/amcharts5";

export function Broken() {
	return (
		<div>
			{/* 1. arbitrary hex baked into a Tailwind class */}
			<div className="bg-[#1c1c1e] text-foreground" />

			{/* 2. Tailwind built-in color scale — not theme-aware, silently wrong in dark mode */}
			<p className="text-gray-400">Muted-looking, but frozen to one theme.</p>

			{/* 3. another built-in scale */}
			<span className="bg-blue-500 text-white">Brand-ish blue that isn't the brand.</span>

			{/* 4. legacy token name the migration removed — regression guard catches the reversal */}
			<div className="bg-baseBg border-primaryBlackSecondary" />
		</div>
	);
}

// 5. theme-blind chart color — a hardcoded hex that can't follow light/dark.
export function makeSeriesFill(root: am5.Root) {
	const series = root.container.children.push(am5.Rectangle.new(root, {}));
	series.set("fill", am5.color("#292929"));
	return series;
}
