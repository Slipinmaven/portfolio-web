"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import type { AdminPost } from "@/features/posts/api/post-types";
import {
  forgetPendingMediaUpload,
  type MediaItem,
} from "@/features/media/api/media-api";
import { MediaUploadForm } from "@/features/media/components/media-upload-form";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import type { ProjectSummary } from "@/features/projects/api/projects-api";
import type {
  PageBlock,
  PageLinkTarget,
  PageSummary,
  SkillsBlock,
} from "@/features/pages/api/page-types";
import {
  SKILL_PROFICIENCY_LABELS,
  SKILL_PROFICIENCY_OPTIONS,
} from "@/features/pages/api/page-types";
import { orderAboutPageSections } from "@/features/pages/api/about-page-order";
import { PageMarkdownEditor } from "@/features/pages/components/page-markdown-editor";
import type { Tag } from "@/features/taxonomy/api/taxonomy-api";

type LinkOption = {
  key: string;
  target: PageLinkTarget;
  label: string;
};

const BLOCK_CHOICES: ReadonlyArray<{
  type: PageBlock["type"];
  title: string;
  description: string;
  marker: string;
}> = [
  {
    type: "HERO",
    title: "Hero",
    description: "Introduce the page with a headline, image, and action.",
    marker: "01",
  },
  {
    type: "MARKDOWN",
    title: "Writing",
    description: "Tell the story with formatted text and inline media.",
    marker: "Aa",
  },
  {
    type: "PROJECT_GRID",
    title: "Projects",
    description: "Show featured work or choose specific projects.",
    marker: "[]",
  },
  {
    type: "SKILLS",
    title: "Skills section",
    description: "Create one list, then add and rate skills inside it.",
    marker: "S",
  },
];

function linkOptions(
  pages: readonly PageSummary[],
  projects: readonly ProjectSummary[],
  posts: readonly AdminPost[],
): LinkOption[] {
  return [
    ...pages
      .filter((page) => page.status === "PUBLISHED")
      .map((page) => ({
        key: `PAGE:${page.id}`,
        target: { type: "PAGE" as const, id: page.id },
        label: `Page: ${page.title} (/${page.slug === "home" ? "" : page.slug})`,
      })),
    ...projects
      .filter((project) => project.status === "PUBLISHED")
      .map((project) => ({
        key: `PROJECT:${project.id}`,
        target: { type: "PROJECT" as const, id: project.id },
        label: `Project: ${project.title} (/${project.slug})`,
      })),
    ...posts
      .filter((post) => post.status === "PUBLISHED")
      .map((post) => ({
        key: `POST:${post.id}`,
        target: { type: "POST" as const, id: post.id },
        label: `${post.kind === "ARTICLE" ? "Article" : "Note"}: ${post.title}`,
      })),
  ];
}

function blockTitle(block: PageBlock): string {
  if (block.type === "HERO") return "Hero";
  if (block.type === "MARKDOWN") return "Writing";
  if (block.type === "SKILLS") return "Skills";
  return "Project grid";
}

function stripMarkdown(body: string): string {
  return body
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ImagePreview({
  image,
  className,
}: {
  image: MediaItem;
  className: string;
}) {
  const preview = useAdminMediaAsset(image.id, "content");

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-soft-surface ${className}`}
    >
      {preview.status === "ready" ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={image.height ?? 480}
          src={preview.url}
          unoptimized
          width={image.width ?? 640}
        />
      ) : preview.status === "error" ? (
        <span className="px-3 text-center text-xs text-muted">
          Preview unavailable
        </span>
      ) : (
        <span className="text-xs text-muted">Loading preview…</span>
      )}
    </div>
  );
}

function HeroImagePicker({
  images,
  mediaId,
  onChange,
  onImageAdded,
}: {
  images: readonly MediaItem[];
  mediaId: string | null;
  onChange: (mediaId: string | null) => void;
  onImageAdded: (image: MediaItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const selectedImage = images.find((image) => image.id === mediaId) ?? null;
  const filteredImages = images.filter((image) => {
    const searchTerm = query.trim().toLowerCase();
    return (
      !searchTerm ||
      image.original_filename.toLowerCase().includes(searchTerm) ||
      (image.title ?? "").toLowerCase().includes(searchTerm)
    );
  });
  const visibleImages = filteredImages.slice(0, visibleCount);

  function chooseImage(image: MediaItem) {
    onChange(image.id);
    setIsOpen(false);
    setQuery("");
  }

  function handleUploaded(image: MediaItem, uploadId: string) {
    forgetPendingMediaUpload(uploadId);
    onImageAdded(image);
    onChange(image.id);
    setIsUploading(false);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <section
      aria-labelledby="hero-image-heading"
      className="rounded-2xl border border-border bg-background p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" id="hero-image-heading">
            Hero image
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Choose a visual from the shared media library.
          </p>
        </div>
        {selectedImage && (
          <button
            className="text-xs font-medium text-muted underline underline-offset-4 hover:text-foreground"
            onClick={() => onChange(null)}
            type="button"
          >
            Remove image
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
        {selectedImage ? (
          <ImagePreview
            className="size-20 shrink-0 rounded-lg"
            image={selectedImage}
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid size-20 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-background text-2xl text-muted"
          >
            +
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {selectedImage
              ? selectedImage.title || selectedImage.original_filename
              : "No image selected"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {selectedImage
              ? selectedImage.alt_text
                ? "Alternative text is set in the media library."
                : "Alternative text has not been added yet."
              : "An image is optional for this hero."}
          </p>
          <button
            className="mt-2 min-h-9 rounded-lg border border-border px-3 text-xs font-semibold transition-colors hover:bg-background"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen
              ? "Close image library"
              : selectedImage
                ? "Change image"
                : "Choose from library"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="grid min-w-48 flex-1 gap-1.5 text-xs font-medium">
              Search images
              <input
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(12);
                }}
                placeholder="Search by title or filename"
                value={query}
              />
            </label>
            <button
              className="min-h-10 rounded-lg border border-border px-3 text-xs font-semibold transition-colors hover:bg-background"
              onClick={() => setIsUploading((uploading) => !uploading)}
              type="button"
            >
              {isUploading ? "Choose existing image" : "Upload an image"}
            </button>
          </div>

          {isUploading ? (
            <div className="mt-4">
              <MediaUploadForm
                allowedKinds={["IMAGE"]}
                hasPendingUploads={false}
                onClose={() => setIsUploading(false)}
                onUploadStarted={() => undefined}
                onUploaded={handleUploaded}
              />
            </div>
          ) : (
            <>
              {visibleImages.length > 0 ? (
                <ul className="mt-4 grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                  {visibleImages.map((image) => (
                    <li key={image.id}>
                      <button
                        aria-pressed={image.id === mediaId}
                        className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                          image.id === mediaId
                            ? "border-foreground bg-background"
                            : "border-border bg-background hover:border-muted"
                        }`}
                        onClick={() => chooseImage(image)}
                        type="button"
                      >
                        <ImagePreview
                          className="aspect-[4/3] w-full"
                          image={image}
                        />
                        <span className="min-w-0 p-2.5">
                          <span className="block truncate text-xs font-semibold">
                            {image.title || image.original_filename}
                          </span>
                          <span className="mt-1 block truncate text-[11px] text-muted">
                            {image.width && image.height
                              ? `${image.width} × ${image.height}`
                              : image.original_filename}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                  {images.length === 0
                    ? "The media library has no images yet. Upload one to use it here."
                    : "No images match your search."}
                </p>
              )}
              {visibleCount < filteredImages.length && (
                <button
                  className="mt-3 min-h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-background"
                  onClick={() => setVisibleCount((count) => count + 12)}
                  type="button"
                >
                  Show more images
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function BlockCanvasPreview({
  block,
  image,
  projects,
}: {
  block: PageBlock;
  image: MediaItem | null;
  projects: readonly ProjectSummary[];
}) {
  if (block.type === "HERO") {
    return (
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-w-0 rounded-xl bg-surface p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Introductory section
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight">
            {block.headline || "Add a headline to introduce this page"}
          </p>
          {block.subline && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
              {block.subline}
            </p>
          )}
          {block.button && (
            <span className="mt-4 inline-flex rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background">
              {block.button.label || "Button"}
            </span>
          )}
        </div>
        {image ? (
          <ImagePreview className="aspect-[4/3] rounded-xl" image={image} />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-surface text-xs text-muted">
            Optional hero image
          </div>
        )}
      </div>
    );
  }

  if (block.type === "MARKDOWN") {
    const excerpt = stripMarkdown(block.body);
    const wordCount = block.body.trim()
      ? block.body.trim().split(/\s+/).length
      : 0;
    return (
      <div className="rounded-xl bg-surface p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Page copy
        </p>
        <p className="mt-3 line-clamp-3 text-sm leading-6">
          {excerpt || "Add formatted writing, links, or inline images."}
        </p>
        <p className="mt-3 text-xs text-muted">
          {wordCount} {wordCount === 1 ? "word" : "words"} · Markdown content
        </p>
      </div>
    );
  }

  if (block.type === "SKILLS") {
    return (
      <div className="rounded-xl bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Skills and proficiency
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight">
              {block.heading || "Skills"}
            </p>
            {block.description && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                {block.description}
              </p>
            )}
          </div>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted">
            {block.skills.length}{" "}
            {block.skills.length === 1 ? "skill" : "skills"}
          </span>
        </div>
        {block.skills.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {block.skills.slice(0, 6).map((skill) => (
              <li
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
                key={skill.id}
              >
                <span className="font-semibold">{skill.name}</span>
                <span className="ml-2 text-muted">
                  {SKILL_PROFICIENCY_LABELS[skill.proficiency]}
                </span>
              </li>
            ))}
            {block.skills.length > 6 && (
              <li className="px-2 py-2 text-xs text-muted">
                +{block.skills.length - 6} more
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Add skills and choose a proficiency level for each.
          </p>
        )}
      </div>
    );
  }

  const selectedProjects = block.project_ids
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is ProjectSummary => project !== undefined);
  return (
    <div className="rounded-xl bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {block.mode === "FEATURED" ? "Featured work" : "Selected work"}
        </p>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted">
          Up to {block.limit} projects
        </span>
      </div>
      {block.mode === "MANUAL" && selectedProjects.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedProjects.map((project) => (
            <span
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium"
              key={project.id}
            >
              {project.title}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {block.mode === "FEATURED"
            ? "Automatically filled by featured projects."
            : "Choose projects to show in this section."}
        </p>
      )}
    </div>
  );
}

function SkillsBlockEditor({
  block,
  tags,
  onChange,
}: {
  block: SkillsBlock;
  tags: readonly Tag[];
  onChange: (updated: SkillsBlock) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const selectedNames = new Set(
    block.skills.map((skill) => skill.name.trim().toLowerCase()),
  );
  const matchingTags = tags
    .filter(
      (tag) =>
        tag.is_active &&
        !selectedNames.has(tag.name.trim().toLowerCase()) &&
        normalizedQuery.length > 0 &&
        tag.name.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, 8);
  const duplicateQuery = selectedNames.has(normalizedQuery);
  const matchingTagIsExact = tags.some(
    (tag) =>
      tag.is_active &&
      tag.name.trim().toLowerCase() === normalizedQuery,
  );

  function addSkill(name: string) {
    const trimmedName = name.trim();
    if (
      !trimmedName ||
      block.skills.length >= 40 ||
      selectedNames.has(trimmedName.toLowerCase())
    ) {
      return;
    }
    onChange({
      ...block,
      skills: [
        ...block.skills,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          proficiency: "FAMILIAR",
        },
      ],
    });
    setQuery("");
  }

  function updateSkill(
    skillId: string,
    update: (skill: SkillsBlock["skills"][number]) => SkillsBlock["skills"][number],
  ) {
    onChange({
      ...block,
      skills: block.skills.map((skill) =>
        skill.id === skillId ? update(skill) : skill,
      ),
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Section heading
            <input
              className="min-h-11 rounded-xl border border-border bg-surface px-3 font-normal"
              maxLength={100}
              onChange={(event) =>
                onChange({ ...block, heading: event.target.value })
              }
              value={block.heading}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Supporting text <span className="font-normal text-muted">optional</span>
            <textarea
              className="min-h-20 resize-y rounded-xl border border-border bg-surface px-3 py-2 font-normal"
              maxLength={300}
              onChange={(event) =>
                onChange({
                  ...block,
                  description: event.target.value || null,
                })
              }
              placeholder="A short introduction to your selected skills."
              value={block.description ?? ""}
            />
          </label>
        </div>
      </section>

      <section
        aria-labelledby={`skills-picker-${block.id}`}
        className="rounded-2xl border border-border bg-background p-4 sm:p-5"
      >
        <h3
          className="text-sm font-semibold"
          id={`skills-picker-${block.id}`}
        >
          Choose your skills
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          Pick a project-tag suggestion or type a skill and press Enter. Only
          skills you add appear on this page.
        </p>
        <label className="mt-4 grid gap-1.5 text-sm font-medium">
          Add a skill
          <input
            className="min-h-11 rounded-xl border border-border bg-surface px-3 font-normal"
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const exactTag = tags.find(
                (tag) =>
                  tag.is_active &&
                  tag.name.trim().toLowerCase() === normalizedQuery,
              );
              addSkill(exactTag?.name ?? query);
            }}
            placeholder="Type a skill and press Enter"
            type="search"
            value={query}
          />
        </label>

        {normalizedQuery && matchingTags.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Project tag suggestions
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {matchingTags.map((tag) => (
                <li key={tag.id}>
                  <button
                    className="min-h-9 rounded-full border border-border bg-surface px-3 text-xs font-medium transition-colors hover:border-foreground"
                    disabled={block.skills.length >= 40}
                    onClick={() => addSkill(tag.name)}
                    type="button"
                  >
                    + {tag.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {normalizedQuery &&
          !matchingTagIsExact &&
          !duplicateQuery &&
          block.skills.length < 40 && (
            <button
              className="mt-3 min-h-9 rounded-lg border border-dashed border-border px-3 text-xs font-semibold transition-colors hover:bg-surface"
              onClick={() => addSkill(query)}
              type="button"
            >
              Add custom skill &ldquo;{query.trim()}&rdquo;
            </button>
          )}

        {duplicateQuery && (
          <p className="mt-3 text-xs text-muted" role="status">
            This skill is already in your list.
          </p>
        )}
        {block.skills.length >= 40 && (
          <p className="mt-3 text-xs text-muted" role="status">
            You can add up to 40 skills in one section.
          </p>
        )}
      </section>

      <section
        aria-labelledby={`skills-list-${block.id}`}
        className="rounded-2xl border border-border bg-background p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold"
              id={`skills-list-${block.id}`}
            >
              Proficiency levels
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              New skills start at Familiar. Adjust each level to match your
              experience before publishing.
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted">
            {block.skills.length}/40
          </span>
        </div>

        {block.skills.length > 0 ? (
          <ol className="mt-4 grid gap-3">
            {block.skills.map((skill, index) => (
              <li
                className="grid items-end gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)_auto] sm:p-4"
                key={skill.id}
              >
                <label className="grid gap-1.5 text-xs font-semibold">
                  <span className="text-muted">
                    {String(index + 1).padStart(2, "0")} · Skill name
                  </span>
                  <input
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                    maxLength={100}
                    onChange={(event) =>
                      updateSkill(skill.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    value={skill.name}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Proficiency
                  <select
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                    onChange={(event) => {
                      const proficiency = SKILL_PROFICIENCY_OPTIONS.find(
                        (option) => option.value === event.target.value,
                      )?.value;
                      if (!proficiency) return;
                      updateSkill(skill.id, (current) => ({
                        ...current,
                        proficiency,
                      }));
                    }}
                    value={skill.proficiency}
                  >
                    {SKILL_PROFICIENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label={`Remove ${skill.name || `skill ${index + 1}`}`}
                  className="grid size-10 place-items-center rounded-lg border border-border text-lg text-red-600 transition-colors hover:bg-red-500/5"
                  onClick={() =>
                    onChange({
                      ...block,
                      skills: block.skills.filter(
                        (candidate) => candidate.id !== skill.id,
                      ),
                    })
                  }
                  type="button"
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            Add at least one skill above, then choose its proficiency.
          </p>
        )}
      </section>
    </div>
  );
}

export function PageComposer({
  sections,
  systemKey,
  pages,
  projects,
  posts,
  images,
  tags,
  onChange,
  onImageAdded,
}: {
  sections: PageBlock[];
  systemKey: PageSummary["system_key"];
  pages: readonly PageSummary[];
  projects: readonly ProjectSummary[];
  posts: readonly AdminPost[];
  images: readonly MediaItem[];
  tags: readonly Tag[];
  onChange: (sections: PageBlock[]) => void;
  onImageAdded: (image: MediaItem) => void;
}) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorHeadingId = useId();
  const targets = linkOptions(pages, projects, posts);
  const editingIndex = sections.findIndex(
    (block) => block.id === editingBlockId,
  );
  const editingBlock =
    editingIndex >= 0 ? sections[editingIndex] ?? null : null;
  const hasSkillsSection = sections.some((block) => block.type === "SKILLS");
  const isAboutPage = systemKey === "ABOUT";
  const compositionSections = isAboutPage
    ? orderAboutPageSections(sections)
    : sections;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (editingBlockId && !dialog.open) dialog.showModal();
    if (!editingBlockId && dialog.open) dialog.close();
  }, [editingBlockId]);

  function updateBlock(updated: PageBlock) {
    onChange(
      sections.map((block) => (block.id === updated.id ? updated : block)),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    if (
      isAboutPage &&
      compositionSections[index]?.type !== compositionSections[targetIndex]?.type
    ) {
      return;
    }
    const next = [...compositionSections];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function canMoveBlock(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    return (
      targetIndex >= 0 &&
      targetIndex < compositionSections.length &&
      (!isAboutPage ||
        compositionSections[index]?.type ===
          compositionSections[targetIndex]?.type)
    );
  }

  function removeBlock(blockId: string) {
    onChange(sections.filter((block) => block.id !== blockId));
    if (editingBlockId === blockId) setEditingBlockId(null);
  }

  function addBlock(type: PageBlock["type"]) {
    if (type === "SKILLS" && hasSkillsSection) return;
    const id = crypto.randomUUID();
    const block: PageBlock =
      type === "HERO"
        ? {
            id,
            type: "HERO",
            headline: "",
            subline: null,
            media_id: null,
            button: null,
          }
        : type === "MARKDOWN"
          ? { id, type: "MARKDOWN", body: "" }
          : type === "SKILLS"
            ? {
                id,
                type: "SKILLS",
                heading: "Skills and strengths",
                description: null,
                skills: [],
              }
            : {
                id,
                type: "PROJECT_GRID",
                mode: "FEATURED",
                project_ids: [],
                limit: 3,
              };
    onChange([...sections, block]);
    setEditingBlockId(id);
  }

  return (
    <section
      aria-labelledby="page-composition-heading"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Build the page
          </p>
          <h2 className="mt-1 text-xl font-semibold" id="page-composition-heading">
            Page composition
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            {isAboutPage
              ? "About pages follow a profile story: introduction, writing, work, then skills."
              : "Arrange sections in reading order. Edit a section to shape its content and presentation."}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted">
          {sections.length} {sections.length === 1 ? "section" : "sections"}
        </span>
      </header>

      {sections.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-background px-5 py-8 text-center sm:px-8 sm:py-10">
          <p className="text-base font-semibold">Start with a section</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            Build this page in the order readers will experience it. Choose an
            introduction, writing, skills, or a project showcase.
          </p>
        </div>
      ) : (
        <ol className="mt-5 grid gap-3">
          {compositionSections.map((block, index) => {
            const image =
              block.type === "HERO"
                ? images.find((item) => item.id === block.media_id) ?? null
                : null;
            return (
              <li key={block.id}>
                <article className="rounded-2xl border border-border bg-background p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-soft-surface text-xs font-bold text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {blockTitle(block)}
                        </p>
                        <p className="text-xs text-muted">
                          {block.type === "HERO"
                            ? block.headline || "Introductory section"
                            : block.type === "MARKDOWN"
                              ? "Formatted page copy"
                              : block.type === "SKILLS"
                                ? `${block.skills.length} selected ${
                                    block.skills.length === 1 ? "skill" : "skills"
                                  }`
                                : block.mode === "FEATURED"
                                  ? "Featured projects"
                                  : `${block.project_ids.length} selected projects`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        aria-label={`Move section ${index + 1} up`}
                        className="grid size-9 place-items-center rounded-lg border border-border text-sm transition-colors hover:bg-surface disabled:opacity-40"
                        disabled={!canMoveBlock(index, -1)}
                        onClick={() => moveBlock(index, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Move section ${index + 1} down`}
                        className="grid size-9 place-items-center rounded-lg border border-border text-sm transition-colors hover:bg-surface disabled:opacity-40"
                        disabled={!canMoveBlock(index, 1)}
                        onClick={() => moveBlock(index, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        className="min-h-9 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-85"
                        onClick={() => setEditingBlockId(block.id)}
                        type="button"
                      >
                        {block.type === "SKILLS"
                          ? "Add or edit skills"
                          : "Edit section"}
                      </button>
                      <button
                        aria-label={`Remove section ${index + 1}`}
                        className="grid size-9 place-items-center rounded-lg border border-border text-sm text-red-600 transition-colors hover:bg-red-500/5"
                        onClick={() => removeBlock(block.id)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <BlockCanvasPreview
                    block={block}
                    image={image}
                    projects={projects}
                  />
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Add a section</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {BLOCK_CHOICES.map((choice) => (
            <button
              className="group flex min-h-20 items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-muted hover:bg-soft-surface disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-background"
              disabled={choice.type === "SKILLS" && hasSkillsSection}
              key={choice.type}
              onClick={() => addBlock(choice.type)}
              type="button"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-soft-surface text-xs font-bold text-muted transition-colors group-hover:bg-background">
                {choice.marker}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {choice.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  {choice.type === "SKILLS" && hasSkillsSection
                    ? "Already added. Use “Add or edit skills” on the existing section."
                    : choice.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <dialog
        aria-labelledby={editorHeadingId}
        className="m-auto max-h-[94dvh] w-[min(68rem,calc(100vw-1rem))] overflow-hidden rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/60"
        onCancel={() => setEditingBlockId(null)}
        ref={dialogRef}
      >
        {editingBlock && (
          <div className="flex max-h-[94dvh] flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Section {editingIndex + 1} of {sections.length}
                </p>
                <h2 className="mt-1 text-xl font-semibold" id={editorHeadingId}>
                  Edit {blockTitle(editingBlock).toLowerCase()}
                </h2>
              </div>
              <button
                aria-label="Close section editor"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-lg transition-colors hover:bg-background"
                onClick={() => setEditingBlockId(null)}
                type="button"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {editingBlock.type === "HERO" && (
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      Headline
                      <input
                        className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal"
                        maxLength={200}
                        onChange={(event) =>
                          updateBlock({
                            ...editingBlock,
                            headline: event.target.value,
                          })
                        }
                        placeholder="A clear first impression"
                        value={editingBlock.headline}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      Supporting text
                      <textarea
                        className="min-h-24 resize-y rounded-xl border border-border bg-background px-3 py-2 font-normal"
                        maxLength={500}
                        onChange={(event) =>
                          updateBlock({
                            ...editingBlock,
                            subline: event.target.value || null,
                          })
                        }
                        placeholder="A sentence that adds context to the headline."
                        value={editingBlock.subline ?? ""}
                      />
                    </label>
                  </div>

                  <HeroImagePicker
                    images={images}
                    mediaId={editingBlock.media_id}
                    onChange={(media_id) =>
                      updateBlock({ ...editingBlock, media_id })
                    }
                    onImageAdded={onImageAdded}
                  />

                  <section className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Primary action</h3>
                        <p className="mt-1 text-xs text-muted">
                          Give readers a clear next step.
                        </p>
                      </div>
                      {editingBlock.button ? (
                        <button
                          className="text-xs font-medium text-red-600 underline underline-offset-4"
                          onClick={() =>
                            updateBlock({ ...editingBlock, button: null })
                          }
                          type="button"
                        >
                          Remove action
                        </button>
                      ) : (
                        <button
                          className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50"
                          disabled={targets.length === 0}
                          onClick={() => {
                            const firstTarget = targets[0];
                            if (!firstTarget) return;
                            updateBlock({
                              ...editingBlock,
                              button: {
                                label: "Learn more",
                                link_target: firstTarget.target,
                              },
                            });
                          }}
                          type="button"
                        >
                          Add action
                        </button>
                      )}
                    </div>
                    {editingBlock.button && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm font-medium">
                          Button label
                          <input
                            className="min-h-11 rounded-xl border border-border bg-surface px-3 font-normal"
                            maxLength={80}
                            onChange={(event) =>
                              updateBlock({
                                ...editingBlock,
                                button: {
                                  ...editingBlock.button!,
                                  label: event.target.value,
                                },
                              })
                            }
                            value={editingBlock.button.label}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                          Destination
                          <select
                            className="min-h-11 rounded-xl border border-border bg-surface px-3 font-normal"
                            onChange={(event) => {
                              const nextTarget = targets.find(
                                (target) => target.key === event.target.value,
                              )?.target;
                              if (!nextTarget) return;
                              updateBlock({
                                ...editingBlock,
                                button: {
                                  ...editingBlock.button!,
                                  link_target: nextTarget,
                                },
                              });
                            }}
                            value={`${editingBlock.button.link_target.type}:${editingBlock.button.link_target.id}`}
                          >
                            {targets.map((target) => (
                              <option key={target.key} value={target.key}>
                                {target.label}
                              </option>
                            ))}
                            {!targets.some(
                              (target) =>
                                target.key ===
                                `${editingBlock.button!.link_target.type}:${editingBlock.button!.link_target.id}`,
                            ) && (
                              <option
                                value={`${editingBlock.button.link_target.type}:${editingBlock.button.link_target.id}`}
                              >
                                Unavailable destination
                              </option>
                            )}
                          </select>
                        </label>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {editingBlock.type === "MARKDOWN" && (
                <PageMarkdownEditor
                  body={editingBlock.body}
                  onChange={(body) =>
                    updateBlock({ ...editingBlock, body })
                  }
                />
              )}

              {editingBlock.type === "SKILLS" && (
                <SkillsBlockEditor
                  block={editingBlock}
                  key={editingBlock.id}
                  onChange={updateBlock}
                  tags={tags}
                />
              )}

              {editingBlock.type === "PROJECT_GRID" && (
                <div className="grid gap-5">
                  <section className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                    <h3 className="text-sm font-semibold">What to show</h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Choose a live featured feed or hand-pick the projects for
                      this page.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          {
                            mode: "FEATURED",
                            title: "Featured projects",
                            description: "Updates as project features change.",
                          },
                          {
                            mode: "MANUAL",
                            title: "Choose projects",
                            description: "Keep a deliberate set for this page.",
                          },
                        ] as const
                      ).map((option) => (
                        <button
                          aria-pressed={editingBlock.mode === option.mode}
                          className={`rounded-xl border p-3 text-left transition-colors ${
                            editingBlock.mode === option.mode
                              ? "border-foreground bg-soft-surface"
                              : "border-border hover:bg-surface"
                          }`}
                          key={option.mode}
                          onClick={() => {
                            const mode = option.mode;
                            updateBlock({
                              ...editingBlock,
                              mode,
                              project_ids:
                                mode === "FEATURED"
                                  ? []
                                  : editingBlock.project_ids.length > 0
                                    ? editingBlock.project_ids
                                    : projects[0]
                                      ? [projects[0].id]
                                      : [],
                            });
                          }}
                          type="button"
                        >
                          <span className="block text-sm font-semibold">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                    <label className="mt-4 grid max-w-xs gap-1.5 text-sm font-medium">
                      Maximum projects
                      <input
                        className="min-h-11 rounded-xl border border-border bg-surface px-3 font-normal"
                        max={12}
                        min={1}
                        onChange={(event) =>
                          updateBlock({
                            ...editingBlock,
                            limit: Number(event.target.value),
                          })
                        }
                        type="number"
                        value={editingBlock.limit}
                      />
                    </label>
                  </section>

                  {editingBlock.mode === "MANUAL" && (
                    <fieldset className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                      <legend className="px-1 text-sm font-semibold">
                        Select projects
                      </legend>
                      {projects.length === 0 ? (
                        <p className="text-sm text-muted">
                          No projects are available yet.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {projects.map((project) => (
                            <label
                              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface"
                              key={project.id}
                            >
                              <input
                                checked={editingBlock.project_ids.includes(
                                  project.id,
                                )}
                                className="mt-1 size-4 accent-foreground"
                                onChange={(event) => {
                                  const project_ids = event.target.checked
                                    ? [
                                        ...editingBlock.project_ids,
                                        project.id,
                                      ]
                                    : editingBlock.project_ids.filter(
                                        (id) => id !== project.id,
                                      );
                                  updateBlock({ ...editingBlock, project_ids });
                                }}
                                type="checkbox"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {project.title}
                                </span>
                                <span className="mt-1 block truncate text-xs text-muted">
                                  {project.status.toLowerCase()} · /{project.slug}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      {editingBlock.project_ids.length === 0 && (
                        <p className="mt-3 text-sm text-red-600" role="alert">
                          Select at least one project for this section.
                        </p>
                      )}
                    </fieldset>
                  )}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 sm:px-6">
              <p className="text-xs text-muted">
                Section edits are part of the page draft until you save.
              </p>
              <button
                className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
                onClick={() => setEditingBlockId(null)}
                type="button"
              >
                Done editing
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  );
}
