// example/native — Decision 4: React Native has no CSS variables and no cascade, so theming is
// rebuilt in JavaScript from the SAME source. The build emits a { light, dark } object; a context
// holds the active mode; switching is setState → React re-renders. Native components are
// theme-AWARE (they read the active theme), whereas web components are theme-UNAWARE (they just
// reference var() and let the browser recompute). One source, two theming machineries.
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
// In a real app: import { themes, type Theme } from "design-tokens/native";
import { themes } from "../../packages/design-tokens/dist/native/index.js";
import type { Theme } from "../../packages/design-tokens/dist/native/index.js";

type Mode = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; mode: Mode; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<Mode>("dark");
	const value = {
		mode,
		theme: themes[mode],
		toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")),
	};
	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
	return ctx;
}

// A theme-aware component. Note it reads `theme.color.*` — the same semantic names the web side
// uses as `bg-*` / `text-*` classes. Same vocabulary, different delivery.
export function Badge({ label }: { label: string }) {
	const { theme } = useTheme();
	return (
		<span
			style={{
				backgroundColor: theme.color.surface2,
				color: theme.color.mutedForeground,
				borderColor: theme.color.border,
				borderRadius: theme.radius.md,
				paddinghorizontal: theme.spacing["3"],
				fontSize: theme.fontSize.sm,
			}}
		>
			{label}
		</span>
	);
}
