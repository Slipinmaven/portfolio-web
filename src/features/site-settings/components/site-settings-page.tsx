"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { useAdminRole } from "@/features/admin/components/admin-role-context";
import {
  forgetPendingMediaUpload,
  getManagedMedia,
  listAllManagedMedia,
  type MediaItem,
} from "@/features/media/api/media-api";
import { MediaUploadForm } from "@/features/media/components/media-upload-form";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import {
  getManagedSiteSettings,
  updateManagedSiteSettings,
  type SiteLinkPlatform,
  type SiteSettings,
  type SiteSettingsInput,
} from "@/features/site-settings/api/site-settings-api";
import {
  SITE_LINK_DESTINATION_FIELDS,
  siteLinkDestinationForSave,
  siteLinkDestinationFromStoredUrl,
} from "@/features/site-settings/site-link-destination";
import { ApiResponseError } from "@/lib/api/api-errors";

const PLATFORM_OPTIONS: Array<{ value: SiteLinkPlatform; label: string }> = [
  { value: "GITHUB", label: "GitHub" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "X", label: "X" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "BLUESKY", label: "Bluesky" },
  { value: "MASTODON", label: "Mastodon" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "OTHER", label: "Other" },
];

type SettingsSection = "profile" | "branding" | "contact-links";

const SETTINGS_SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  shortLabel: string;
  summary: string;
}> = [
  {
    id: "profile",
    label: "Your profile",
    shortLabel: "Profile",
    summary: "Who you are",
  },
  {
    id: "branding",
    label: "Site appearance",
    shortLabel: "Appearance",
    summary: "How the site looks",
  },
  {
    id: "contact-links",
    label: "Contact options",
    shortLabel: "Contact",
    summary: "Where people find you",
  },
];

function selectedPlatform(value: string): SiteLinkPlatform | null {
  return PLATFORM_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

type SiteSettingsForm = Omit<
  SiteSettings,
  | "tagline"
  | "role_title"
  | "owner_bio"
  | "location"
  | "availability_note"
  | "default_description"
  | "links"
  | "updated_at"
> & {
  tagline: string;
  role_title: string;
  owner_bio: string;
  location: string;
  availability_note: string;
  default_description: string;
  links: Array<{
    id?: string;
    platform: SiteLinkPlatform;
    url: string;
    label: string;
  }>;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; media: MediaItem[] };

type FormFeedback = {
  kind: "validation" | "rejected" | "uncertain";
  message: string;
  section: SettingsSection;
};

type LinkFieldErrors = Record<string, string>;

function confirmNoChangesSaved(message: string): string {
  if (/none of your changes were saved|no changes were saved|changes were not saved/i.test(message)) {
    return message;
  }
  return `${message} None of your changes were saved.`;
}

const FAVICON_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

function toForm(settings: SiteSettings): SiteSettingsForm {
  return {
    site_name: settings.site_name,
    tagline: settings.tagline ?? "",
    owner_name: settings.owner_name,
    role_title: settings.role_title ?? "",
    owner_bio: settings.owner_bio ?? "",
    location: settings.location ?? "",
    availability_note: settings.availability_note ?? "",
    language_code: settings.language_code,
    title_template: settings.title_template,
    default_description: settings.default_description ?? "",
    logo_media_id: settings.logo_media_id,
    favicon_media_id: settings.favicon_media_id,
    default_social_image_media_id: settings.default_social_image_media_id,
    profile_image_media_id: settings.profile_image_media_id,
    links: settings.links.map((link) => ({
      id: link.id,
      platform: link.platform,
      url: siteLinkDestinationFromStoredUrl(link.platform, link.url),
      label: link.label ?? "",
    })),
  };
}

function toInput(form: SiteSettingsForm): SiteSettingsInput {
  return {
    ...form,
    tagline: form.tagline.trim() || null,
    role_title: form.role_title.trim() || null,
    owner_bio: form.owner_bio.trim() || null,
    location: form.location.trim() || null,
    availability_note: form.availability_note.trim() || null,
    default_description: form.default_description.trim() || null,
    links: form.links.map((link) => ({
      ...(link.id ? { id: link.id } : {}),
      platform: link.platform,
      url: link.url.trim(),
      label: link.label.trim() || null,
    })),
  };
}

function linkFieldKey(
  link: SiteSettingsForm["links"][number],
  index: number,
): string {
  return link.id ?? `new-link-${index}`;
}

function sectionForValidationLocation(
  location: Array<string | number>,
): SettingsSection {
  if (location.includes("links")) return "contact-links";
  if (
    location.some((part) =>
      [
        "language_code",
        "title_template",
        "default_description",
        "logo_media_id",
        "favicon_media_id",
        "default_social_image_media_id",
      ].includes(String(part)),
    )
  ) {
    return "branding";
  }
  return "profile";
}

function describeValidationField(
  location: Array<string | number>,
  links: SiteSettingsForm["links"],
): string {
  const linkIndexPosition = location.indexOf("links");
  if (linkIndexPosition >= 0) {
    const linkIndex = location[linkIndexPosition + 1];
    if (typeof linkIndex === "number" && links[linkIndex]) {
      const platformLabel =
        PLATFORM_OPTIONS.find(
          (option) => option.value === links[linkIndex].platform,
        )?.label ?? "Contact";
      return `Contact link ${linkIndex + 1} (${platformLabel})`;
    }
    return "Contact links";
  }

  const fieldName = [...location]
    .reverse()
    .find((part) => typeof part === "string" && part !== "body");
  if (typeof fieldName !== "string") return "Settings";

  const knownLabels: Record<string, string> = {
    site_name: "Site name",
    owner_name: "Your name",
    language_code: "Site language",
    title_template: "Page title format",
    default_description: "Default search description",
  };
  return (
    knownLabels[fieldName] ??
    fieldName.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase())
  );
}

function describeSaveFailure(
  error: unknown,
  activeSection: SettingsSection,
  links: SiteSettingsForm["links"],
): FormFeedback & { linkErrors: LinkFieldErrors } {
  if (error instanceof ApiResponseError) {
    const linkErrors: LinkFieldErrors = {};
    const issueMessages = error.validationIssues.map((issue) => {
      const linkIndexPosition = issue.location.indexOf("links");
      const linkIndex = issue.location[linkIndexPosition + 1];
      if (
        linkIndexPosition >= 0 &&
        typeof linkIndex === "number" &&
        links[linkIndex]
      ) {
        linkErrors[linkFieldKey(links[linkIndex], linkIndex)] = issue.message;
      }
      return `${describeValidationField(issue.location, links)}: ${issue.message}`;
    });

    if (issueMessages.length > 0) {
      const section = sectionForValidationLocation(
        error.validationIssues[0].location,
      );
      return {
        kind: "rejected",
        section,
        linkErrors,
        message: `The server rejected these values. ${issueMessages.join(" ")} Your changes were not saved.`,
      };
    }

    if (error.code === "SITE_LINK_PLATFORM_MIGRATION_REQUIRED") {
      return {
        kind: "rejected",
        section: "contact-links",
        linkErrors,
        message: error.message,
      };
    }

    if (error.code === "SITE_LINK_DUPLICATE_DESTINATION") {
      const match = error.message.match(/contact links (\d+) and (\d+)/i);
      if (match) {
        const firstIndex = Number(match[1]) - 1;
        const secondIndex = Number(match[2]) - 1;
        if (links[firstIndex] && links[secondIndex]) {
          linkErrors[linkFieldKey(links[firstIndex], firstIndex)] =
            `This destination is also used by contact link ${secondIndex + 1}.`;
          linkErrors[linkFieldKey(links[secondIndex], secondIndex)] =
            `This destination is also used by contact link ${firstIndex + 1}.`;
        }
      }
      return {
        kind: "rejected",
        section: "contact-links",
        linkErrors,
        message: confirmNoChangesSaved(error.message),
      };
    }

    if (error.code === "SITE_LINK_INVALID_DESTINATION") {
      return {
        kind: "rejected",
        section: "contact-links",
        linkErrors,
        message: confirmNoChangesSaved(error.message),
      };
    }

    if (error.status === 403) {
      return {
        kind: "rejected",
        section: activeSection,
        linkErrors,
        message:
          "Your account does not have permission to change site settings. Sign in with an administrator account. No changes were saved.",
      };
    }

    if (error.status === 409) {
      return {
        kind: "rejected",
        section: activeSection,
        linkErrors,
        message: confirmNoChangesSaved(error.message),
      };
    }

    if (error.status === 404) {
      return {
        kind: "rejected",
        section: activeSection,
        linkErrors,
        message:
          "The site settings record could not be found. Reload the page to get the latest settings before trying again.",
      };
    }

    if (error.status === 422) {
      return {
        kind: "rejected",
        section: activeSection,
        linkErrors,
        message: `The server rejected these settings. ${error.message} Your changes were not saved.`,
      };
    }

    if (error.status >= 500) {
      return {
        kind: "uncertain",
        section: activeSection,
        linkErrors,
        message:
          "The server did not confirm the save. Your edits are still shown here; reload the page to check whether they were applied before retrying.",
      };
    }

    return {
      kind: "rejected",
      section: activeSection,
      linkErrors,
      message: `${error.message} Your changes were not saved.`,
    };
  }

  const errorMessage = error instanceof Error ? error.message : "";
  if (errorMessage.includes("Unable to connect to the API")) {
    return {
      kind: "uncertain",
      section: activeSection,
      linkErrors: {},
      message:
        "Could not confirm whether your changes were saved because the API connection failed. Reload the page and check the saved values before retrying.",
    };
  }

  if (errorMessage.includes("service returned")) {
    return {
      kind: "uncertain",
      section: activeSection,
      linkErrors: {},
      message:
        "The server response did not confirm whether your changes were saved. Reload the page to verify before trying again.",
    };
  }

  if (errorMessage.toLowerCase().includes("session has expired")) {
    return {
      kind: "rejected",
      section: activeSection,
      linkErrors: {},
      message:
        "Your session has expired. Sign in again, then reload the settings to verify whether your changes were saved.",
    };
  }

  return {
    kind: "uncertain",
    section: activeSection,
    linkErrors: {},
    message:
      "The save could not be confirmed. Your edits are still shown here. Reload the page to verify the saved settings before retrying.",
  };
}

function describeLoadFailure(error: unknown): string {
  if (error instanceof ApiResponseError) {
    if (error.status === 403) {
      return "Your account cannot load site settings. Sign in with an administrator account.";
    }
    if (error.status === 404) {
      return "Site settings could not be found. Ask an administrator to initialize them.";
    }
    if (error.status >= 500) {
      return "The server could not load site settings. Try again; if it keeps failing, contact an administrator.";
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("Unable to connect to the API")) {
      return "Could not reach the API. Check that the backend is running, then try again.";
    }
    return error.message;
  }

  return "Site settings could not be loaded. Try again.";
}

export function SiteSettingsPage() {
  const role = useAdminRole();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState<SiteSettingsForm | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");
  const [error, setError] = useState<FormFeedback | null>(null);
  const [linkErrors, setLinkErrors] = useState<LinkFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role !== "admin") return;
    let active = true;
    void Promise.all([getManagedSiteSettings(), listAllManagedMedia()])
      .then(([nextSettings, media]) => {
        if (!active) return;
        setSettings(nextSettings);
        setForm(toForm(nextSettings));
        setLoadState({ status: "ready", media });
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setLoadState({
          status: "error",
          message: describeLoadFailure(loadError),
        });
      });
    return () => {
      active = false;
    };
  }, [role, loadAttempt]);

  if (role === null) {
    return <p role="status">Checking administrator access…</p>;
  }
  if (role !== "admin") {
    return (
      <section className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Administrator access required</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Only administrators can change public site settings.
        </p>
        <Link className="mt-4 inline-block text-sm underline" href="/admin">
          Return to the workspace
        </Link>
      </section>
    );
  }

  if (loadState.status === "loading") {
    return <p role="status">Loading site settings…</p>;
  }
  if (loadState.status === "error") {
    return (
      <section className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Site settings could not be loaded</h1>
        <p className="mt-3 text-sm text-red-600" role="alert">
          {loadState.message}
        </p>
        <button
          className="mt-5 min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          type="button"
          onClick={() => {
            setLoadState({ status: "loading" });
            setLoadAttempt((attempt) => attempt + 1);
          }}
        >
          Try again
        </button>
      </section>
    );
  }
  if (!form) {
    return <p role="status">Loading site settings…</p>;
  }

  const currentForm = form;
  const media = loadState.media;
  const hasChanges =
    settings !== null &&
    JSON.stringify(toInput(currentForm)) !==
      JSON.stringify(toInput(toForm(settings)));
  const activeStepIndex = SETTINGS_SECTIONS.findIndex(
    (section) => section.id === activeSection,
  );

  function updateField<K extends keyof SiteSettingsForm>(
    key: K,
    value: SiteSettingsForm[K],
  ) {
    setError(null);
    setMessage(null);
    if (key === "links") setLinkErrors({});
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function addAvailableMedia(item: MediaItem) {
    setLoadState((current) =>
      current.status === "ready"
        ? {
            ...current,
            media: [
              item,
              ...current.media.filter((existing) => existing.id !== item.id),
            ],
          }
        : current,
    );
  }

  function discardChanges() {
    if (!settings) return;
    setForm(toForm(settings));
    setError(null);
    setLinkErrors({});
    setMessage(null);
  }

  function navigateToSection(section: SettingsSection) {
    setActiveSection(section);
    setMessage(null);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= currentForm.links.length) return;
    const links = [...currentForm.links];
    [links[index], links[target]] = [links[target], links[index]];
    updateField("links", links);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredFields: Array<{
      section: SettingsSection;
      label: string;
      value: string;
    }> = [
      { section: "profile", label: "Site name", value: currentForm.site_name },
      { section: "profile", label: "Your name", value: currentForm.owner_name },
      {
        section: "branding",
        label: "Site language",
        value: currentForm.language_code,
      },
      {
        section: "branding",
        label: "Page title format",
        value: currentForm.title_template,
      },
    ];
    const missingField = requiredFields.find((field) => !field.value.trim());
    if (missingField) {
      setActiveSection(missingField.section);
      setError({
        kind: "validation",
        section: missingField.section,
        message: `${missingField.label} is required.`,
      });
      setMessage(null);
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    const emptyLinkIndex = currentForm.links.findIndex(
      (link) => !link.url.trim(),
    );
    if (emptyLinkIndex >= 0) {
      const emptyLink = currentForm.links[emptyLinkIndex];
      const platformLabel =
        PLATFORM_OPTIONS.find(
          (option) => option.value === emptyLink.platform,
        )?.label ?? "Contact";
      setActiveSection("contact-links");
      setLinkErrors({
        [linkFieldKey(emptyLink, emptyLinkIndex)]:
          "Enter a destination, or remove this contact link.",
      });
      setError({
        kind: "validation",
        section: "contact-links",
        message: `Contact link ${emptyLinkIndex + 1} (${platformLabel}) needs a destination, or remove it.`,
      });
      setMessage(null);
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    const input = toInput(currentForm);
    const linksForSave: SiteSettingsInput["links"] = [];
    for (const [index, link] of input.links.entries()) {
      try {
        linksForSave.push({
          ...link,
          url: siteLinkDestinationForSave(link.platform, link.url),
        });
      } catch (destinationError: unknown) {
        const message =
          destinationError instanceof Error
            ? destinationError.message
            : "Enter a valid contact destination.";
        const platformLabel =
          PLATFORM_OPTIONS.find(
            (option) => option.value === link.platform,
          )?.label ?? "Contact";
        setActiveSection("contact-links");
        setLinkErrors({
          [linkFieldKey(currentForm.links[index], index)]: message,
        });
        setError({
          kind: "validation",
          section: "contact-links",
          message: `Contact link ${index + 1} (${platformLabel}): ${message}`,
        });
        setMessage(null);
        editorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
    }

    const destinationIndexes = new Map<string, number>();
    for (const [index, link] of linksForSave.entries()) {
      const previousIndex = destinationIndexes.get(link.url);
      if (previousIndex !== undefined) {
        const firstLink = currentForm.links[previousIndex];
        const secondLink = currentForm.links[index];
        setActiveSection("contact-links");
        setLinkErrors({
          [linkFieldKey(firstLink, previousIndex)]:
            `This destination is also used by contact link ${index + 1}.`,
          [linkFieldKey(secondLink, index)]:
            `This destination is also used by contact link ${previousIndex + 1}.`,
        });
        setError({
          kind: "validation",
          section: "contact-links",
          message: `Contact links ${previousIndex + 1} and ${index + 1} use the same destination. Change or remove one of them.`,
        });
        setMessage(null);
        editorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      destinationIndexes.set(link.url, index);
    }

    setIsSaving(true);
    setError(null);
    setLinkErrors({});
    setMessage(null);
    try {
      const updated = await updateManagedSiteSettings({
        ...input,
        links: linksForSave,
      });
      setSettings(updated);
      setForm(toForm(updated));
      setMessage("Site settings saved and published.");
    } catch (saveError: unknown) {
      const failure = describeSaveFailure(
        saveError,
        activeSection,
        currentForm.links,
      );
      setActiveSection(failure.section);
      setError(failure);
      setLinkErrors(failure.linkErrors);
      setMessage(null);
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] pb-28">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Your public presence
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Site settings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Shape the profile visitors see, choose your brand assets, and make
            it easy for people to reach you. No messages are collected here.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
          href="/"
          rel="noreferrer"
          target="_blank"
        >
          View public site <span aria-hidden="true" className="ml-2">↗</span>
        </Link>
      </header>

      <nav
        aria-label="Site setup steps"
        className="mb-6 rounded-2xl border border-border bg-surface p-3 sm:p-4"
      >
        <div
          aria-label={`Step ${activeStepIndex + 1} of ${SETTINGS_SECTIONS.length}`}
          aria-valuemax={SETTINGS_SECTIONS.length}
          aria-valuemin={1}
          aria-valuenow={activeStepIndex + 1}
          className="mb-3 h-1.5 overflow-hidden rounded-full bg-background"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{
              width: `${((activeStepIndex + 1) / SETTINGS_SECTIONS.length) * 100}%`,
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {SETTINGS_SECTIONS.map((section, index) => {
            const isCurrent = section.id === activeSection;
            return (
              <button
                key={section.id}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition-colors sm:gap-3 sm:p-3 ${
                  isCurrent
                    ? "border-border bg-background"
                    : "border-transparent hover:bg-background"
                }`}
                type="button"
                onClick={() => navigateToSection(section.id)}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold ${
                    isCurrent
                      ? "bg-foreground text-background"
                      : "bg-background text-muted"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold sm:text-sm">
                    <span className="sm:hidden">{section.shortLabel}</span>
                    <span className="hidden sm:inline">{section.label}</span>
                  </span>
                  <span className="hidden truncate text-xs text-muted sm:block">
                    {section.summary}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <details className="mb-5 rounded-2xl border border-border bg-surface p-4 xl:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
          Preview this step
          <span className="text-xs font-normal text-muted">
            {activeSection === "branding" ? "Search result" : "Contact page"}
          </span>
        </summary>
        <div className="mt-4">
          <SettingsPreview
            form={form}
            media={media}
            section={activeSection}
          />
        </div>
      </details>

      <form id="site-settings-form" noValidate onSubmit={handleSubmit}>
        {error && (
          <div
            className="mb-5 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300"
            id="site-settings-save-error"
            role="alert"
          >
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-red-500/10 font-semibold"
            >
              !
            </span>
            <div className="min-w-0">
              <p className="font-semibold">
                {error.kind === "validation"
                  ? "Check this before saving"
                  : error.kind === "rejected"
                    ? "Changes were not saved"
                    : "Save not confirmed"}
              </p>
              <p className="mt-1 break-words leading-6">{error.message}</p>
            </div>
          </div>
        )}
        <fieldset
          className="grid min-w-0 gap-6 border-0 p-0"
          disabled={isSaving}
        >
          <div
            className="scroll-mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"
            ref={editorRef}
          >
            <div className="grid min-w-0 content-start gap-5">
              {activeSection === "profile" && (
              <section
                aria-labelledby="profile-heading"
                className="scroll-mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7"
                id="profile"
              >
                <SectionHeading
                  number="01"
                  eyebrow="Your identity"
                  title="Profile"
                  description="The name, introduction, and availability shown to visitors on your Contact page."
                  id="profile-heading"
                />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <TextField
                    hint="Used in page titles and your site header."
                    label="Site name"
                    maxLength={100}
                    required
                    value={form.site_name}
                    onChange={(value) => updateField("site_name", value)}
                  />
                  <TextField
                    hint="A short line next to your site name."
                    label="Tagline"
                    maxLength={200}
                    value={form.tagline}
                    onChange={(value) => updateField("tagline", value)}
                  />
                  <TextField
                    hint="Displayed as your public name."
                    label="Your name"
                    maxLength={100}
                    required
                    value={form.owner_name}
                    onChange={(value) => updateField("owner_name", value)}
                  />
                  <TextField
                    hint="For example, your role or the work you do."
                    label="Role or headline"
                    maxLength={150}
                    value={form.role_title}
                    onChange={(value) => updateField("role_title", value)}
                  />
                  <TextField
                    hint="Optional; shown only when provided."
                    label="Location"
                    maxLength={120}
                    value={form.location}
                    onChange={(value) => updateField("location", value)}
                  />
                  <TextField
                    hint="Keep this current and easy to scan."
                    label="Availability"
                    maxLength={200}
                    value={form.availability_note}
                    onChange={(value) => updateField("availability_note", value)}
                  />
                  <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                    Short introduction
                    <span className="text-xs font-normal leading-5 text-muted">
                      A few sentences about what you do. This is shown on your
                      Contact page.
                    </span>
                    <textarea
                      className="min-h-32 rounded-xl border border-border bg-background px-3.5 py-3 font-normal leading-6 outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                      maxLength={2000}
                      placeholder="Introduce yourself and the kind of work you do."
                      value={form.owner_bio}
                      onChange={(event) =>
                        updateField("owner_bio", event.target.value)
                      }
                    />
                    <span className="text-right text-xs font-normal text-muted">
                      {form.owner_bio.length}/2000
                    </span>
                  </label>
                </div>
                <div className="mt-6 border-t border-border pt-6">
                  <SiteSettingsMediaField
                    hint="Used beside your profile on the Contact page."
                    label="Profile portrait"
                    media={media}
                    value={form.profile_image_media_id}
                    onMediaAvailable={addAvailableMedia}
                    onChange={(value) =>
                      updateField("profile_image_media_id", value)
                    }
                  />
                </div>
              </section>
              )}

              {activeSection === "branding" && (
              <section
                aria-labelledby="branding-heading"
                className="scroll-mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7"
                id="branding"
              >
                <SectionHeading
                  number="02"
                  eyebrow="How your site appears"
                  title="Brand and search"
                  description="Set the browser title, search description, language, and images used when your site is shared."
                  id="branding-heading"
                />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <TextField
                    hint="Use a language tag such as en or en-GB."
                    label="Site language"
                    maxLength={10}
                    required
                    value={form.language_code}
                    onChange={(value) => updateField("language_code", value)}
                  />
                  <TextField
                    hint="Use {title} and optionally {site_name}."
                    label="Page title format"
                    maxLength={100}
                    required
                    value={form.title_template}
                    onChange={(value) => updateField("title_template", value)}
                  />
                  <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                    Default search description
                    <span className="text-xs font-normal leading-5 text-muted">
                      Used when a page does not have its own description.
                    </span>
                    <textarea
                      className="min-h-24 rounded-xl border border-border bg-background px-3.5 py-3 font-normal leading-6 outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                      maxLength={300}
                      placeholder="Describe your portfolio in a sentence."
                      value={form.default_description}
                      onChange={(event) =>
                        updateField("default_description", event.target.value)
                      }
                    />
                    <span className="text-right text-xs font-normal text-muted">
                      {form.default_description.length}/300
                    </span>
                  </label>
                </div>
                <div className="mt-6 grid gap-4 border-t border-border pt-6 md:grid-cols-2">
                  <SiteSettingsMediaField
                    hint="Shown in the site navigation."
                    label="Site logo"
                    media={media}
                    value={form.logo_media_id}
                    onMediaAvailable={addAvailableMedia}
                    onChange={(value) => updateField("logo_media_id", value)}
                  />
                  <SiteSettingsMediaField
                    hint="Small icon shown in browser tabs."
                    label="Browser icon"
                    media={media}
                    value={form.favicon_media_id}
                    faviconOnly
                    onMediaAvailable={addAvailableMedia}
                    onChange={(value) => updateField("favicon_media_id", value)}
                  />
                  <SiteSettingsMediaField
                    hint="Shown in link previews when a page has no image."
                    label="Default social preview image"
                    media={media}
                    value={form.default_social_image_media_id}
                    onMediaAvailable={addAvailableMedia}
                    onChange={(value) =>
                      updateField("default_social_image_media_id", value)
                    }
                  />
                </div>
              </section>
              )}

              {activeSection === "contact-links" && (
              <section
                aria-labelledby="contact-links-heading"
                className="scroll-mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7"
                id="contact-links"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    number="03"
                    eyebrow="Make it easy to connect"
                    title="Contact links"
                    description="Choose which profiles and contact methods appear on your Contact page and in the footer."
                    id="contact-links-heading"
                  />
                  <span className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-muted">
                    {form.links.length} / 8
                  </span>
                </div>
                <div className="mt-6">
                  {form.links.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-8 text-center">
                      <span
                        aria-hidden="true"
                        className="mx-auto grid size-10 place-items-center rounded-full bg-surface text-lg"
                      >
                        +
                      </span>
                      <h3 className="mt-3 text-sm font-semibold">
                        No contact links yet
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
                        Add an email address or profile so visitors know where
                        to find you.
                      </p>
                    </div>
                  ) : (
                    <ol className="grid gap-3">
                      {form.links.map((link, index) => {
                        const platformLabel =
                          PLATFORM_OPTIONS.find(
                            (option) => option.value === link.platform,
                          )?.label ?? "Profile";
                        const destinationField =
                          SITE_LINK_DESTINATION_FIELDS[link.platform];
                        const destinationHelpId =
                          `site-link-destination-help-${link.id ?? index}`;
                        const destinationError =
                          linkErrors[linkFieldKey(link, index)];
                        const destinationErrorId =
                          `site-link-destination-error-${link.id ?? index}`;
                        return (
                          <li
                            key={link.id ?? `new-link-${index}`}
                            className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-xs font-semibold text-muted">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">
                                    {link.label.trim() || platformLabel}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {platformLabel} · Public link
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  aria-label={`Move ${platformLabel} link up`}
                                  className="grid size-9 place-items-center rounded-lg border border-border text-sm transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={index === 0 || isSaving}
                                  title="Move up"
                                  type="button"
                                  onClick={() => moveLink(index, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  aria-label={`Move ${platformLabel} link down`}
                                  className="grid size-9 place-items-center rounded-lg border border-border text-sm transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={
                                    index === form.links.length - 1 || isSaving
                                  }
                                  title="Move down"
                                  type="button"
                                  onClick={() => moveLink(index, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  className="min-h-9 rounded-lg px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10"
                                  disabled={isSaving}
                                  type="button"
                                  onClick={() =>
                                    updateField(
                                      "links",
                                      form.links.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="grid gap-2 text-sm font-medium">
                                Platform
                                <select
                                  className="min-h-11 rounded-xl border border-border bg-surface px-3.5 text-sm font-normal text-foreground outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                                  value={link.platform}
                                  onChange={(event) => {
                                    const platform = selectedPlatform(
                                      event.target.value,
                                    );
                                    if (!platform) return;
                                    updateField(
                                      "links",
                                      form.links.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, platform, url: "" }
                                          : item,
                                      ),
                                    );
                                  }}
                                >
                                  {PLATFORM_OPTIONS.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-2 text-sm font-medium">
                                {destinationField.label}
                                <input
                                  aria-describedby={
                                    destinationError
                                      ? `${destinationHelpId} ${destinationErrorId}`
                                      : destinationHelpId
                                  }
                                  aria-invalid={Boolean(destinationError)}
                                  autoCapitalize="none"
                                  className={`min-h-11 min-w-0 rounded-xl border bg-surface px-3.5 text-sm font-normal text-foreground outline-none transition focus:ring-2 ${
                                    destinationError
                                      ? "border-red-600 focus:border-red-600 focus:ring-red-600/20"
                                      : "border-border focus:border-[var(--focus-ring)] focus:ring-[var(--focus-ring)]/20"
                                  }`}
                                  inputMode={destinationField.inputMode}
                                  maxLength={500}
                                  placeholder={destinationField.placeholder}
                                  required
                                  type="text"
                                  value={link.url}
                                  onChange={(event) =>
                                    updateField(
                                      "links",
                                      form.links.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, url: event.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                                <span
                                  className="text-xs leading-5 text-muted"
                                  id={destinationHelpId}
                                >
                                  {destinationField.help}
                                </span>
                                {destinationError && (
                                  <span
                                    className="text-sm font-medium text-red-600 dark:text-red-300"
                                    id={destinationErrorId}
                                  >
                                    {destinationError}
                                  </span>
                                )}
                              </label>
                            </div>
                            <details className="mt-4 border-t border-border pt-3">
                              <summary className="cursor-pointer text-sm font-medium marker:text-muted">
                                Accessibility label
                                <span className="ml-2 font-normal text-muted">
                                  {link.label.trim()
                                    ? `Current: ${link.label.trim()}`
                                    : "Optional; describes this link to assistive technology"}
                                </span>
                              </summary>
                              <label className="mt-3 grid gap-2 text-sm font-medium">
                                Label announced to screen readers
                                <input
                                  className="min-h-11 rounded-xl border border-border bg-surface px-3.5 text-sm font-normal text-foreground outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                                  maxLength={100}
                                  value={link.label}
                                  onChange={(event) =>
                                    updateField(
                                      "links",
                                      form.links.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, label: event.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                            </details>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  <button
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={form.links.length >= 8 || isSaving}
                    type="button"
                    onClick={() =>
                      updateField("links", [
                        ...form.links,
                        { platform: "OTHER", url: "", label: "" },
                      ])
                    }
                  >
                    <span aria-hidden="true" className="text-lg leading-none">+</span>
                    Add a contact link
                  </button>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Enter an email, number, username, or handle. Full URLs also
                    work; destinations are formatted when you save. For
                    Mastodon, enter @username@server or paste a profile URL.
                    Links are shown in this order.
                  </p>
                </div>
              </section>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  className="min-h-11 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={activeStepIndex === 0}
                  type="button"
                  onClick={() =>
                    navigateToSection(
                      SETTINGS_SECTIONS[Math.max(0, activeStepIndex - 1)].id,
                    )
                  }
                >
                  <span aria-hidden="true" className="mr-2">←</span>
                  Back
                </button>
                <p className="text-xs text-muted">
                  Step {activeStepIndex + 1} of {SETTINGS_SECTIONS.length}
                </p>
                {activeStepIndex < SETTINGS_SECTIONS.length - 1 ? (
                  <button
                    className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
                    type="button"
                    onClick={() =>
                      navigateToSection(
                        SETTINGS_SECTIONS[activeStepIndex + 1].id,
                      )
                    }
                  >
                    Continue
                    <span aria-hidden="true" className="ml-2">→</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-muted">
                    Ready to save
                  </span>
                )}
              </div>
            </div>

            <aside className="hidden content-start gap-4 xl:sticky xl:top-6 xl:grid">
              <SettingsPreview
                form={form}
                media={media}
                section={activeSection}
              />
              <section className="rounded-2xl border border-border bg-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {activeSection === "profile"
                    ? "A useful profile"
                    : activeSection === "branding"
                      ? "Search preview"
                      : "Contact choices"}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {activeSection === "profile"
                    ? "Keep the introduction focused on what you do and the kind of work you want people to contact you about."
                    : activeSection === "branding"
                      ? "Page-specific titles and descriptions take priority. These values are the defaults for the rest of the site."
                      : "Only add destinations you want to share publicly. Reorder them to put your preferred way to connect first."}
                </p>
              </section>
            </aside>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:left-64">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
              <div aria-live="polite" className="min-w-0">
                {error ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-red-600">
                      {error.kind === "validation"
                        ? "Fix the highlighted issue."
                        : error.kind === "rejected"
                          ? "Changes were not saved. Review the details."
                          : "Save not confirmed. Review the details."}
                    </p>
                    <button
                      className="text-sm font-semibold underline underline-offset-2"
                      type="button"
                      onClick={() => {
                        setActiveSection(error.section);
                        document
                          .getElementById("site-settings-save-error")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }}
                    >
                      Review
                    </button>
                  </div>
                ) : message ? (
                  <p className="text-sm font-medium text-foreground" role="status">
                    {message}
                  </p>
                ) : (
                  <p className="text-sm font-medium">
                    {isSaving
                      ? "Saving your changes…"
                      : hasChanges
                        ? "You have unsaved changes"
                        : "All changes saved"}
                  </p>
                )}
                {settings && (
                  <p className="hidden text-xs text-muted sm:block">
                    Last saved {new Date(settings.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasChanges && (
                  <button
                    className="min-h-11 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
                    disabled={isSaving}
                    type="button"
                    onClick={discardChanges}
                  >
                    Discard
                  </button>
                )}
                <button
                  className="min-h-11 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
                  disabled={!hasChanges || isSaving}
                  type="submit"
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
  id,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-xs font-semibold text-muted">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl" id={id}>
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingsPreview({
  form,
  section,
  media,
}: {
  form: SiteSettingsForm;
  section: SettingsSection;
  media: MediaItem[];
}) {
  const initials = form.owner_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const isBranding = section === "branding";
  const titlePreview = form.title_template
    .replace(/\{title\}/g, "Projects")
    .replace(/\{site_name\}/g, form.site_name || "Your site");
  const socialImage = media.find(
    (item) => item.id === form.default_social_image_media_id,
  );

  return (
    <section
      aria-label={
        isBranding
          ? "Live preview of browser and search metadata"
          : "Live preview of the Contact page"
      }
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Live preview
          </p>
          <p className="mt-1 text-sm font-medium">
            {isBranding ? "Browser and search" : "Contact page"}
          </p>
        </div>
        <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Preview
        </span>
      </div>
      {isBranding ? (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-medium text-muted">
            {form.site_name || "Your site"}
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--focus-ring)]">
            {titlePreview || form.site_name || "Your page title"}
          </p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">
            {form.default_description ||
              "Your default search description will appear here."}
          </p>
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Share image
            </p>
            <p className="mt-1 truncate text-sm">
              {socialImage
                ? socialImage.title || socialImage.original_filename
                : "No default image selected"}
            </p>
          </div>
        </div>
      ) : (
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-sm font-semibold">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {form.owner_name || "Your name"}
            </p>
            <p className="truncate text-xs text-muted">
              {form.role_title || "Your role"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold">
          {form.site_name || "Your site"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {form.tagline || "Your tagline"}
        </p>
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted">
          {form.owner_bio || "Your short introduction will appear here."}
        </p>
        {(form.location || form.availability_note) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {form.location && (
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs">
                {form.location}
              </span>
            )}
            {form.availability_note && (
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs">
                {form.availability_note}
              </span>
            )}
          </div>
        )}
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Contact options
          </p>
          {form.links.length > 0 ? (
            <ul className="mt-2 grid gap-2">
              {form.links.map((link, index) => {
                const platform =
                  PLATFORM_OPTIONS.find(
                    (option) => option.value === link.platform,
                  )?.label ?? "Profile";
                return (
                  <li
                    className="flex items-center justify-between gap-3 text-sm"
                    key={link.id ?? `preview-link-${index}`}
                  >
                    <span className="truncate font-medium">
                      {link.label.trim() || platform}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{platform}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted">
              Add a contact link to show visitors how to reach you.
            </p>
          )}
        </div>
      </div>
      )}
      <Link
        className="mt-4 inline-flex text-sm font-medium underline-offset-4 hover:underline"
        href={isBranding ? "/" : "/contact"}
        rel="noreferrer"
        target="_blank"
      >
        {isBranding ? "Open public site" : "Open Contact page"}
        <span aria-hidden="true" className="ml-1">↗</span>
      </Link>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {hint && (
        <span className="text-xs font-normal leading-5 text-muted">{hint}</span>
      )}
      <input
        className="min-h-11 min-w-0 rounded-xl border border-border bg-background px-3.5 py-2.5 font-normal outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
        maxLength={maxLength}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SiteSettingsMediaField({
  label,
  media,
  value,
  hint,
  faviconOnly = false,
  onMediaAvailable,
  onChange,
}: {
  label: string;
  media: MediaItem[];
  value: string | null;
  hint?: string;
  faviconOnly?: boolean;
  onMediaAvailable: (media: MediaItem) => void;
  onChange: (value: string | null) => void;
}) {
  const availableMedia = media
    .filter(
      (item) =>
        item.kind === "IMAGE" &&
        (!faviconOnly ||
          FAVICON_MIME_TYPES.some(
            (mimeType) => mimeType === item.mime_type.toLowerCase(),
          )),
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const selectedMedia = availableMedia.find((item) => item.id === value) ?? null;
  const preview = useAdminMediaAsset(
    selectedMedia?.id ?? "",
    selectedMedia ? "content" : null,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [duplicateChoice, setDuplicateChoice] = useState<{
    uploaded: MediaItem;
    existing: MediaItem | null;
    isLoading: boolean;
    error: string | null;
  } | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const headingId = `site-image-picker-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const searchTerm = query.trim().toLocaleLowerCase();
  const matchingMedia = searchTerm
    ? availableMedia.filter((item) =>
        [item.title, item.original_filename, item.alt_text]
          .filter((text): text is string => Boolean(text))
          .some((text) => text.toLocaleLowerCase().includes(searchTerm)),
      )
    : availableMedia;
  const visibleMedia = matchingMedia.slice(0, visibleCount);

  function closePicker() {
    setIsOpen(false);
    setActiveTab("library");
    setQuery("");
    setVisibleCount(12);
    setDuplicateChoice(null);
    setUploadNotice(null);
  }

  function chooseMedia(item: MediaItem) {
    onChange(item.id);
    closePicker();
  }

  function handleUploaded(uploaded: MediaItem, uploadId: string) {
    forgetPendingMediaUpload(uploadId);
    onMediaAvailable(uploaded);
    setActiveTab("library");

    if (
      faviconOnly &&
      !FAVICON_MIME_TYPES.some(
        (mimeType) => mimeType === uploaded.mime_type.toLowerCase(),
      )
    ) {
      setUploadNotice(
        "Browser icons need PNG, SVG, or ICO format. This image was added to your library, but cannot be selected here.",
      );
      return;
    }

    setUploadNotice(null);
    if (!uploaded.duplicate_checksum) {
      chooseMedia(uploaded);
      return;
    }

    if (!uploaded.duplicate_media_id) {
      setDuplicateChoice({
        uploaded,
        existing: null,
        isLoading: false,
        error:
          "A matching image was detected, but its library entry could not be identified. You can still use this uploaded copy.",
      });
      return;
    }

    setDuplicateChoice({
      uploaded,
      existing: null,
      isLoading: true,
      error: null,
    });
    void getManagedMedia(uploaded.duplicate_media_id)
      .then((existing) => {
        onMediaAvailable(existing);
        setDuplicateChoice((current) =>
          current?.uploaded.id === uploaded.id
            ? { ...current, existing, isLoading: false }
            : current,
        );
      })
      .catch((loadError: unknown) => {
        setDuplicateChoice((current) =>
          current?.uploaded.id === uploaded.id
            ? {
                ...current,
                isLoading: false,
                error:
                  loadError instanceof Error
                    ? `The matching image could not be loaded: ${loadError.message}`
                    : "The matching image could not be loaded. You can still use the uploaded copy.",
              }
            : current,
        );
      });
  }

  return (
    <>
      <div className="grid gap-3 rounded-xl border border-border bg-background p-3.5 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
        <div className="grid min-w-0 gap-3">
          <div>
            <p className="text-sm font-medium">{label}</p>
            {hint && (
              <p className="mt-1 text-xs leading-5 text-muted">{hint}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85"
              type="button"
              onClick={() => setIsOpen(true)}
            >
              <span aria-hidden="true">▧</span>
              {selectedMedia ? "Change image" : "Choose image"}
            </button>
            {selectedMedia && (
              <button
                className="min-h-10 rounded-full px-3 py-2 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                type="button"
                onClick={() => onChange(null)}
              >
                Remove
              </button>
            )}
          </div>
          {selectedMedia ? (
            <p className="truncate text-xs text-muted">
              Selected: {selectedMedia.title || selectedMedia.original_filename}
            </p>
          ) : (
            <p className="text-xs text-muted">No image selected</p>
          )}
        </div>
        <div className="relative grid h-24 place-items-center overflow-hidden rounded-lg border border-border bg-surface">
          {preview.status === "ready" && selectedMedia ? (
            <Image
              alt={selectedMedia.alt_text ?? selectedMedia.title ?? label}
              className="object-contain p-2"
              fill
              sizes="112px"
              src={preview.url}
              unoptimized
            />
          ) : selectedMedia && preview.status === "error" ? (
            <p className="px-2 text-center text-xs text-red-600" role="alert">
              Preview unavailable
            </p>
          ) : (
            <span className="px-2 text-center text-xs text-muted">
              {selectedMedia ? "Loading preview…" : "Image preview"}
            </span>
          )}
        </div>
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby={headingId}
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
            onCancel={(event) => {
              event.preventDefault();
              closePicker();
            }}
            onClose={closePicker}
            onClick={(event) => {
              if (event.target === event.currentTarget) closePicker();
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Site images
                </p>
                <h2 className="mt-2 text-xl font-semibold" id={headingId}>
                  Choose {label.toLowerCase()}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Pick an image already in your library or upload a new one.
                </p>
              </div>
              <button
                aria-label="Close image picker"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-lg transition-colors hover:bg-surface"
                type="button"
                onClick={closePicker}
              >
                ×
              </button>
            </div>

            <div className="p-5 sm:p-7">
              <div
                aria-label="Image picker options"
                className="mb-5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="inline-flex rounded-full border border-border bg-surface p-1">
                  <button
                    aria-pressed={activeTab === "library"}
                    className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                      activeTab === "library"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                    type="button"
                    onClick={() => setActiveTab("library")}
                  >
                    Image library
                  </button>
                  <button
                    aria-pressed={activeTab === "upload"}
                    className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                      activeTab === "upload"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                    type="button"
                    onClick={() => setActiveTab("upload")}
                  >
                    Upload new
                  </button>
                </div>
                {activeTab === "library" && (
                  <label className="relative min-w-0 flex-1 sm:max-w-sm">
                    <span className="sr-only">Search images</span>
                    <input
                      className="min-h-11 w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                      placeholder="Search by name or description"
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setVisibleCount(12);
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                    >
                      ⌕
                    </span>
                  </label>
                )}
              </div>

              {activeTab === "upload" ? (
                <MediaUploadForm
                  allowedKinds={["IMAGE"]}
                  acceptedImageExtensions={
                    faviconOnly ? [".png"] : undefined
                  }
                  hasPendingUploads={false}
                  onClose={() => setActiveTab("library")}
                  onUploadStarted={() => setUploadNotice(null)}
                  onUploaded={handleUploaded}
                />
              ) : (
                <>
                  {uploadNotice && (
                    <p
                      className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50"
                      role="status"
                    >
                      {uploadNotice}
                    </p>
                  )}
                  {duplicateChoice && (
                    <section
                      aria-labelledby={`${headingId}-duplicate-heading`}
                      className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50"
                    >
                      <h3
                        className="font-semibold"
                        id={`${headingId}-duplicate-heading`}
                      >
                        This image may already be in your library
                      </h3>
                      <p className="mt-1 text-sm leading-6">
                        Choose whether to use the existing image or your newly
                        uploaded copy.
                      </p>
                      {duplicateChoice.error && (
                        <p className="mt-2 text-sm" role="alert">
                          {duplicateChoice.error}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {duplicateChoice.existing ? (
                          <button
                            className="min-h-10 rounded-full border border-amber-900/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-amber-100 dark:hover:bg-amber-900"
                            type="button"
                            onClick={() => {
                              if (duplicateChoice.existing) {
                                chooseMedia(duplicateChoice.existing);
                              }
                            }}
                          >
                            Use existing image
                          </button>
                        ) : duplicateChoice.isLoading ? (
                          <p className="self-center text-sm" role="status">
                            Loading the matching image…
                          </p>
                        ) : null}
                        <button
                          className="min-h-10 rounded-full bg-amber-950 px-4 py-2 text-sm font-medium text-amber-50 transition-opacity hover:opacity-85 dark:bg-amber-50 dark:text-amber-950"
                          type="button"
                          onClick={() => chooseMedia(duplicateChoice.uploaded)}
                        >
                          Use uploaded copy
                        </button>
                      </div>
                    </section>
                  )}

                  {availableMedia.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
                      <span
                        aria-hidden="true"
                        className="mx-auto grid size-12 place-items-center rounded-2xl bg-background text-xl"
                      >
                        ▧
                      </span>
                      <h3 className="mt-4 font-semibold">
                        No compatible images yet
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                        Upload an image to add it to your media library and
                        select it here.
                      </p>
                      <button
                        className="mt-5 min-h-11 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
                        type="button"
                        onClick={() => setActiveTab("upload")}
                      >
                        Upload an image
                      </button>
                    </div>
                  ) : matchingMedia.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">
                      No images match “{query}”. Try another search.
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted">
                          {matchingMedia.length}{" "}
                          {matchingMedia.length === 1 ? "image" : "images"}
                          {searchTerm ? " found" : " in your library"}
                        </p>
                        {selectedMedia && (
                          <button
                            className="text-xs font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                            type="button"
                            onClick={() => onChange(null)}
                          >
                            Clear selection
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {visibleMedia.map((item) => (
                          <SiteSettingsMediaOption
                            key={item.id}
                            isSelected={item.id === value}
                            media={item}
                            onSelect={() => chooseMedia(item)}
                          />
                        ))}
                      </div>
                      {visibleCount < matchingMedia.length && (
                        <button
                          className="mt-5 min-h-11 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
                          type="button"
                          onClick={() =>
                            setVisibleCount((count) => count + 12)
                          }
                        >
                          Show more images
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}

function SiteSettingsMediaOption({
  media,
  isSelected,
  onSelect,
}: {
  media: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const preview = useAdminMediaAsset(media.id, "content");

  return (
    <button
      aria-pressed={isSelected}
      className={`min-w-0 overflow-hidden rounded-2xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
        isSelected
          ? "border-[var(--focus-ring)] bg-surface ring-2 ring-[var(--focus-ring)]/30"
          : "border-border bg-background hover:bg-surface"
      }`}
      type="button"
      onClick={onSelect}
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-surface">
        {preview.status === "ready" ? (
          <Image
            alt=""
            className="object-contain p-2"
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            src={preview.url}
            unoptimized
          />
        ) : preview.status === "error" ? (
          <span className="grid h-full place-items-center px-2 text-center text-xs text-red-600">
            Preview unavailable
          </span>
        ) : (
          <span className="grid h-full place-items-center text-xs text-muted">
            Loading preview…
          </span>
        )}
        {isSelected && (
          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-foreground text-xs text-background">
            ✓
          </span>
        )}
      </span>
      <span className="block min-w-0 p-3">
        <span className="block truncate text-sm font-medium">
          {media.title || media.original_filename}
        </span>
        <span className="mt-1 block text-xs text-muted">
          {media.width && media.height
            ? `${media.width} × ${media.height}`
            : media.mime_type}
        </span>
      </span>
    </button>
  );
}
