"use client";

import { useEffect, useRef } from "react";

const copyStatusTimers = new WeakMap<HTMLButtonElement, number>();

function showCopyStatus(button: HTMLButtonElement, status: string) {
  const label = button.querySelector<HTMLElement>(
    "[data-markdown-code-copy-label]",
  );
  if (!label) return;

  const previousTimer = copyStatusTimers.get(button);
  if (previousTimer !== undefined) window.clearTimeout(previousTimer);

  label.textContent = status;
  button.setAttribute(
    "aria-label",
    status === "Copied" ? "Code copied" : status,
  );
  button.title = status === "Copied" ? "Code copied" : status;

  const timer = window.setTimeout(() => {
    label.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");
    button.title = "Copy code";
  }, 1800);
  copyStatusTimers.set(button, timer);
}

export function MarkdownContentClient({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    async function handleCopy(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>(
        "[data-markdown-code-copy]",
      );
      if (!button || !contentRef.current?.contains(button)) return;

      const code = button
        .closest(".markdown-code-block")
        ?.querySelector("pre code")?.textContent;
      if (code === undefined || !navigator.clipboard?.writeText) {
        showCopyStatus(button, "Copy unavailable");
        return;
      }

      try {
        await navigator.clipboard.writeText(code);
        showCopyStatus(button, "Copied");
      } catch {
        showCopyStatus(button, "Copy failed");
      }
    }

    container.addEventListener("click", handleCopy);
    return () => container.removeEventListener("click", handleCopy);
  }, []);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={contentRef}
    />
  );
}
