export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PageRevisionState = "DRAFT" | "PUBLISHED" | "SUPERSEDED";

export type PageLinkTarget =
  | { type: "PAGE"; id: string }
  | { type: "PROJECT"; id: string }
  | { type: "POST"; id: string };

export type HeroBlock = {
  id: string;
  type: "HERO";
  headline: string;
  subline: string | null;
  media_id: string | null;
  button: { label: string; link_target: PageLinkTarget } | null;
};

export type MarkdownBlock = {
  id: string;
  type: "MARKDOWN";
  body: string;
};

export type ProjectGridBlock = {
  id: string;
  type: "PROJECT_GRID";
  mode: "FEATURED" | "MANUAL";
  project_ids: string[];
  limit: number;
};

export type SkillProficiencyLevel =
  | "FAMILIAR"
  | "WORKING"
  | "PROFICIENT"
  | "ADVANCED"
  | "EXPERT";

export const SKILL_PROFICIENCY_LABELS: Record<
  SkillProficiencyLevel,
  string
> = {
  FAMILIAR: "Familiar",
  WORKING: "Working",
  PROFICIENT: "Proficient",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export const SKILL_PROFICIENCY_OPTIONS: ReadonlyArray<{
  value: SkillProficiencyLevel;
  label: string;
}> = [
  { value: "FAMILIAR", label: SKILL_PROFICIENCY_LABELS.FAMILIAR },
  { value: "WORKING", label: SKILL_PROFICIENCY_LABELS.WORKING },
  { value: "PROFICIENT", label: SKILL_PROFICIENCY_LABELS.PROFICIENT },
  { value: "ADVANCED", label: SKILL_PROFICIENCY_LABELS.ADVANCED },
  { value: "EXPERT", label: SKILL_PROFICIENCY_LABELS.EXPERT },
];

export type PageSkill = {
  id: string;
  name: string;
  proficiency: SkillProficiencyLevel;
};

export type SkillsBlock = {
  id: string;
  type: "SKILLS";
  heading: string;
  description: string | null;
  skills: PageSkill[];
};

export type PageBlock =
  | HeroBlock
  | MarkdownBlock
  | ProjectGridBlock
  | SkillsBlock;

export type PageRevision = {
  id: string;
  page_id: string;
  revision_number: number;
  state: PageRevisionState;
  title: string;
  summary: string | null;
  sections: PageBlock[];
  schema_version: number;
  change_note: string | null;
  published_at: string | null;
  superseded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PageSummary = {
  id: string;
  slug: string;
  system_key: "HOME" | "ABOUT" | "CONTACT" | null;
  status: PageStatus;
  title: string;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  draft_revision_number: number | null;
};

export type PageDetail = PageSummary & {
  draft_revision: PageRevision | null;
  published_revision: PageRevision | null;
};

export type PageListResponse = {
  pages: PageSummary[];
  total: number;
  offset: number;
  limit: number;
};

export type PageRevisionListResponse = {
  page_id: string;
  revisions: PageRevision[];
};

export type PageCreateInput = {
  slug: string;
  title: string;
};

export type PageDraftInput = {
  slug: string;
  title: string;
  summary: string | null;
  sections: PageBlock[];
};

export type PublicPageProject = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  demo_url: string | null;
  github_url: string | null;
  status: "PUBLISHED";
  is_featured: boolean;
  display_order: number;
  cover_media: {
    media_id: string;
    title: string | null;
    alt_text: string | null;
    file_url: string;
  } | null;
};

export type PublicPage = {
  slug: string;
  system_key: "HOME" | "ABOUT" | "CONTACT" | null;
  title: string;
  summary: string | null;
  published_at: string;
  sections: PageBlock[];
  images: Array<{
    id: string;
    title: string | null;
    alt_text: string | null;
    width: number | null;
    height: number | null;
  }>;
  projects: PublicPageProject[];
  pages: Array<{ id: string; slug: string; status: "PUBLISHED" }>;
  posts: Array<{
    id: string;
    kind: "ARTICLE" | "NOTE";
    slug: string;
    status: "PUBLISHED";
  }>;
  rendered_markdown: Record<string, string>;
};

const pageStatuses: ReadonlySet<string> = new Set([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
const revisionStates: ReadonlySet<string> = new Set([
  "DRAFT",
  "PUBLISHED",
  "SUPERSEDED",
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPageLinkTarget(value: unknown): value is PageLinkTarget {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.type === "PAGE" ||
      value.type === "PROJECT" ||
      value.type === "POST")
  );
}

function isSkillProficiencyLevel(
  value: unknown,
): value is SkillProficiencyLevel {
  return SKILL_PROFICIENCY_OPTIONS.some((option) => option.value === value);
}

function isPageSkill(value: unknown): value is PageSkill {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= 100 &&
    isSkillProficiencyLevel(value.proficiency)
  );
}

function isPageBlock(value: unknown): value is PageBlock {
  if (!isRecord(value) || typeof value.id !== "string") return false;
  if (value.type === "HERO") {
    if (
      typeof value.headline !== "string" ||
      !isNullableString(value.subline) ||
      !isNullableString(value.media_id)
    ) {
      return false;
    }
    return (
      value.button === null ||
      (isRecord(value.button) &&
        typeof value.button.label === "string" &&
        isPageLinkTarget(value.button.link_target))
    );
  }
  if (value.type === "MARKDOWN") {
    return typeof value.body === "string";
  }
  if (value.type === "SKILLS") {
    const skills = value.skills;
    if (
      typeof value.heading !== "string" ||
      value.heading.trim().length === 0 ||
      value.heading.length > 100 ||
      !isNullableString(value.description) ||
      (value.description !== null && value.description.length > 300) ||
      !Array.isArray(skills) ||
      skills.length === 0 ||
      skills.length > 40 ||
      !skills.every(isPageSkill)
    ) {
      return false;
    }
    return (
      new Set(skills.map((skill) => skill.id)).size === skills.length &&
      new Set(skills.map((skill) => skill.name.trim().toLowerCase())).size ===
        skills.length
    );
  }
  if (value.type === "PROJECT_GRID") {
    return (
      (value.mode === "FEATURED" || value.mode === "MANUAL") &&
      Array.isArray(value.project_ids) &&
      value.project_ids.every((id) => typeof id === "string") &&
      typeof value.limit === "number" &&
      Number.isInteger(value.limit) &&
      value.limit >= 1 &&
      value.limit <= 12
    );
  }
  return false;
}

function isPageRevision(value: unknown): value is PageRevision {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.page_id === "string" &&
    typeof value.revision_number === "number" &&
    Number.isInteger(value.revision_number) &&
    typeof value.state === "string" &&
    revisionStates.has(value.state) &&
    typeof value.title === "string" &&
    isNullableString(value.summary) &&
    Array.isArray(value.sections) &&
    value.sections.every(isPageBlock) &&
    typeof value.schema_version === "number" &&
    Number.isInteger(value.schema_version) &&
    isNullableString(value.change_note) &&
    isNullableString(value.published_at) &&
    isNullableString(value.superseded_at) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isPageSummary(value: unknown): value is PageSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    (value.system_key === null ||
      value.system_key === "HOME" ||
      value.system_key === "ABOUT" ||
      value.system_key === "CONTACT") &&
    typeof value.status === "string" &&
    pageStatuses.has(value.status) &&
    typeof value.title === "string" &&
    isNullableString(value.published_at) &&
    isNullableString(value.archived_at) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    (value.draft_revision_number === null ||
      (typeof value.draft_revision_number === "number" &&
        Number.isInteger(value.draft_revision_number)))
  );
}

function isNullablePageRevision(value: unknown): value is PageRevision | null {
  return value === null || isPageRevision(value);
}

export function isPageDetail(value: unknown): value is PageDetail {
  if (!isRecord(value)) return false;
  const detail = value;
  if (!isPageSummary(value)) return false;
  return (
    isNullablePageRevision(detail.draft_revision) &&
    isNullablePageRevision(detail.published_revision)
  );
}

export function isPageListResponse(value: unknown): value is PageListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.pages) &&
    value.pages.every(isPageSummary) &&
    typeof value.total === "number" &&
    Number.isInteger(value.total) &&
    value.total >= 0 &&
    typeof value.offset === "number" &&
    Number.isInteger(value.offset) &&
    value.offset >= 0 &&
    typeof value.limit === "number" &&
    Number.isInteger(value.limit) &&
    value.limit > 0
  );
}

export function isPageRevisionListResponse(
  value: unknown,
): value is PageRevisionListResponse {
  return (
    isRecord(value) &&
    typeof value.page_id === "string" &&
    Array.isArray(value.revisions) &&
    value.revisions.every(isPageRevision)
  );
}

export function isPublicPage(value: unknown): value is PublicPage {
  if (!isRecord(value)) return false;
  const sections = value.sections;
  const renderedMarkdown = value.rendered_markdown;
  if (
    typeof value.slug !== "string" ||
    (value.system_key !== null &&
      value.system_key !== "HOME" &&
      value.system_key !== "ABOUT" &&
      value.system_key !== "CONTACT") ||
    typeof value.title !== "string" ||
    !isNullableString(value.summary) ||
    typeof value.published_at !== "string" ||
    !Array.isArray(sections) ||
    !Array.isArray(value.images) ||
    !value.images.every(
      (image: unknown) =>
        isRecord(image) &&
        typeof image.id === "string" &&
        isNullableString(image.title) &&
        isNullableString(image.alt_text) &&
        (image.width === null ||
          (typeof image.width === "number" && Number.isInteger(image.width))) &&
        (image.height === null ||
          (typeof image.height === "number" &&
            Number.isInteger(image.height))),
    ) ||
    !Array.isArray(value.projects) ||
    !value.projects.every(
      (project: unknown) =>
        isRecord(project) &&
        typeof project.id === "string" &&
        typeof project.title === "string" &&
        typeof project.slug === "string" &&
        typeof project.short_description === "string" &&
        isNullableString(project.demo_url) &&
        isNullableString(project.github_url) &&
        project.status === "PUBLISHED" &&
        typeof project.is_featured === "boolean" &&
        typeof project.display_order === "number" &&
        Number.isInteger(project.display_order) &&
        (project.cover_media === undefined ||
          project.cover_media === null ||
          (isRecord(project.cover_media) &&
            typeof project.cover_media.media_id === "string" &&
            isNullableString(project.cover_media.title) &&
            isNullableString(project.cover_media.alt_text) &&
            typeof project.cover_media.file_url === "string")),
    ) ||
    !Array.isArray(value.pages) ||
    !value.pages.every(
      (page: unknown) =>
        isRecord(page) &&
        typeof page.id === "string" &&
        typeof page.slug === "string" &&
        page.status === "PUBLISHED",
    ) ||
    !Array.isArray(value.posts) ||
    !value.posts.every(
      (post: unknown) =>
        isRecord(post) &&
        typeof post.id === "string" &&
        (post.kind === "ARTICLE" || post.kind === "NOTE") &&
        typeof post.slug === "string" &&
        post.status === "PUBLISHED",
    ) ||
    !isRecord(renderedMarkdown) ||
    !Object.values(renderedMarkdown).every(
      (html) => typeof html === "string",
    )
  ) {
    return false;
  }

  for (const section of sections) {
    if (!isPageBlock(section)) return false;
    if (
      section.type === "MARKDOWN" &&
      typeof renderedMarkdown[section.id] !== "string"
    ) {
      return false;
    }
  }
  return true;
}
