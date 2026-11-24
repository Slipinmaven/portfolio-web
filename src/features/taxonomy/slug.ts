const MAX_SLUG_LENGTH = 120;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

export function validateName(
  name: string,
  maxLength = 100,
): string | null {
  if (!name.trim()) return "Enter a name.";
  if (name.trim().length > maxLength) {
    return `Names can be at most ${maxLength} characters.`;
  }
  return null;
}

export function validateSlug(
  slug: string,
  maxLength = MAX_SLUG_LENGTH,
): string | null {
  if (!slug.trim()) return "Enter a slug.";
  if (slug.length > maxLength) {
    return `Slugs can be at most ${maxLength} characters.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return "Use lowercase letters, numbers, and single hyphens only.";
  }
  return null;
}
