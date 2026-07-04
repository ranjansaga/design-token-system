// example/web — the RIGHT way. Every color is a semantic token; this file is theme-unaware.
// Switching light/dark is `document.documentElement.classList.toggle("dark")` — no re-render,
// the browser recomputes every var(). `pnpm lint:tokens` passes clean on this file.
import type { ReactNode } from "react";

function Card({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="bg-surface border border-border rounded-md p-4">
			<h2 className="text-foreground text-lg">{title}</h2>
			<div className="text-muted-foreground">{children}</div>
		</section>
	);
}

export function Dashboard() {
	return (
		<main className="bg-background text-foreground p-6">
			<Card title="Revenue">
				<p className="text-subtle-foreground">Last 30 days</p>
				<div className="bg-surface-2 p-3 rounded-sm">
					<span className="text-success">+12.4%</span>
				</div>
			</Card>

			<div className="flex gap-2 p-4">
				<button className="bg-primary text-primary-foreground rounded-md px-4">Save</button>
				{/* opacity modifier — works because the v3 build ships channel form (Decision 3) */}
				<button className="bg-surface-3 text-foreground rounded-md px-4 hover:bg-surface-3/70">
					Cancel
				</button>
				<button className="bg-danger text-danger-foreground rounded-md px-4">Delete</button>
			</div>

			<p className="text-warning">Heads up: your plan renews soon.</p>
			<a className="text-accent" href="#">Learn more</a>
		</main>
	);
}
