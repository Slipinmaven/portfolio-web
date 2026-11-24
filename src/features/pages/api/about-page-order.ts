import type { PageBlock } from "@/features/pages/api/page-types";

const ABOUT_SECTION_ORDER: readonly PageBlock["type"][] = [
  "HERO",
  "MARKDOWN",
  "PROJECT_GRID",
  "SKILLS",
];

export function orderAboutPageSections(
  sections: readonly PageBlock[],
): PageBlock[] {
  return ABOUT_SECTION_ORDER.flatMap((type) =>
    sections.filter((section) => section.type === type),
  );
}
