"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createResource,
  deleteResource,
  listManagedResources,
  updateResource,
  type ManagedResource,
  type ResourceStatus,
  type ResourceType,
} from "@/features/resources/api/resources-api";

const resourceTypes: readonly ResourceType[] = [
  "ARTICLE",
  "BOOK",
  "COURSE",
  "DOCS",
  "TOOL",
  "VIDEO",
  "OTHER",
];

type FormState = {
  id: string | null;
  title: string;
  url: string;
  resourceType: ResourceType;
  creator: string;
  summary: string;
  commentary: string;
  status: ResourceStatus;
};

const emptyForm: FormState = {
  id: null,
  title: "",
  url: "",
  resourceType: "ARTICLE",
  creator: "",
  summary: "",
  commentary: "",
  status: "DRAFT",
};

export function ResourceManagerPage() {
  const [resources, setResources] = useState<ManagedResource[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const page = await listManagedResources();
      setResources(page.resources);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load resources.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  function editResource(resource: ManagedResource) {
    setForm({
      id: resource.id,
      title: resource.title,
      url: resource.url,
      resourceType: resource.resource_type,
      creator: resource.creator ?? "",
      summary: resource.summary ?? "",
      commentary: resource.commentary ?? "",
      status: resource.status,
    });
    setMessage(null);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const input = {
        title: form.title.trim(),
        url: form.url.trim(),
        resource_type: form.resourceType,
        creator: form.creator.trim() || null,
        summary: form.summary.trim() || null,
        commentary: form.commentary.trim() || null,
      };
      if (form.id) {
        await updateResource(form.id, { ...input, status: form.status });
        setMessage("Resource updated.");
      } else {
        const created = await createResource(input);
        setForm({ ...emptyForm, status: created.status });
        setMessage("Resource created.");
      }
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the resource.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(resource: ManagedResource) {
    if (!window.confirm(`Delete "${resource.title}"? Its attachment rows will also be removed.`)) {
      return;
    }
    setError(null);
    try {
      await deleteResource(resource.id);
      if (form.id === resource.id) setForm(emptyForm);
      setMessage("Resource deleted.");
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the resource.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Workspace / Knowledge
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Resources</h1>
      </header>

      {error && (
        <p className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-5 text-sm text-foreground" role="status">{message}</p>
      )}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted">Loading resources…</p>
          ) : resources.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">
              No resources yet. Create the first one.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {resources.map((resource) => (
                <article key={resource.id} className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="min-w-0 text-left text-sm font-semibold hover:underline"
                        type="button"
                        onClick={() => editResource(resource)}
                      >
                        {resource.title}
                      </button>
                      <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                        {resource.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">{resource.url}</p>
                  </div>
                  <button
                    className="min-h-9 rounded-lg px-3 text-xs font-medium text-muted hover:bg-soft-surface hover:text-foreground"
                    type="button"
                    onClick={() => void remove(resource)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="rounded-2xl border border-border bg-surface p-5" onSubmit={save}>
          <h2 className="text-base font-semibold">
            {form.id ? "Edit resource" : "New resource"}
          </h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Title
              <input
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                maxLength={200}
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              HTTPS URL
              <input
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                maxLength={500}
                required
                type="url"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Type
              <select
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                value={form.resourceType}
                onChange={(event) =>
                  setForm({ ...form, resourceType: event.target.value as ResourceType })
                }
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            {form.id && (
              <label className="grid gap-1.5 text-sm font-medium">
                Status
                <select
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as ResourceStatus })
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
            )}
            <label className="grid gap-1.5 text-sm font-medium">
              Creator
              <input
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                maxLength={150}
                value={form.creator}
                onChange={(event) => setForm({ ...form, creator: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Summary
              <textarea
                className="min-h-20 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                maxLength={300}
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Commentary (Markdown)
              <textarea
                className="min-h-32 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                value={form.commentary}
                onChange={(event) => setForm({ ...form, commentary: event.target.value })}
              />
            </label>
            <div className="flex gap-2">
              {form.id && (
                <button
                  className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium"
                  type="button"
                  onClick={() => setForm(emptyForm)}
                >
                  Cancel
                </button>
              )}
              <button
                className="min-h-11 flex-1 rounded-lg bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving…" : form.id ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
