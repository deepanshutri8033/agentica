export function normalizeToolkitSlug(slug: string): string {
  const normalized = slug.toLowerCase().replace(/[\s_-]/g, "");
  const aliases: Record<string, string> = {
    googlecalendar: "googlecalendar",
    googlesheets: "googlesheets",
    serpsearch: "serpapi",
    websearch: "tavily",
  };

  return aliases[normalized] || normalized;
}
