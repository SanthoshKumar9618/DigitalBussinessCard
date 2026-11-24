/**
 * SmartCard design tokens. See docs/PRODUCT_STRATEGY.md §3.2.
 * Colors live in AppContext (theme-aware); spacing, radius and type live here.
 */
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Radius = { chip: 8, card: 14, sheet: 22, pill: 999 } as const;

export const Type = {
  display: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  title: { fontSize: 22, fontWeight: "700" as const },
  heading: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.6, textTransform: "uppercase" as const },
};

/** Minimum touch target (accessibility). */
export const HIT = 44;
