export type CardTemplateId = "classic" | "minimal" | "modern";

export const CARD_TEMPLATES = [
  { id: "classic", name: "Classic" },
  { id: "minimal", name: "Minimal" },
  { id: "modern", name: "Modern" },
] as const;
