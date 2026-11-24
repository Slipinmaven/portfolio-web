"use client";

import { useEffect, useRef } from "react";

import { authenticatedRequest } from "@/lib/api/authenticated-request";

const ADMIN_MEDIA_SOURCE_PATTERN =
  /^\/api\/v1\/media\/admin\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/content$/i;
const ADMIN_MEDIA_SOURCE_ATTRIBUTE_PATTERN =
  /\bsrc=(["'])(\/api\/v1\/media\/admin\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/content)\1/gi;
const ADMIN_MEDIA_HREF_ATTRIBUTE_PATTERN =
  /\bhref=(["'])(\/api\/v1\/media\/admin\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/content)\1/gi;

function deferAdminMediaRequests(html: string): string {
  return html
    .replace(
      ADMIN_MEDIA_SOURCE_ATTRIBUTE_PATTERN,
      (_match, quote: string, source: string) =>
        `data-admin-src=${quote}${source}${quote}`,
    )
    .replace(
      ADMIN_MEDIA_HREF_ATTRIBUTE_PATTERN,
      (_match, quote: string, source: string) =>
        `data-admin-href=${quote}${source}${quote}`,
    );
}

function getDownloadFilename(contentDisposition: string | null): string {
  const extendedFilename = contentDisposition?.match(
    /filename\*=UTF-8''([^;]+)/i,
  )?.[1];
  const basicFilename = contentDisposition?.match(
    /filename="?([^";]+)"?/i,
  )?.[1];
  let filename = extendedFilename ?? basicFilename ?? "download";
  if (extendedFilename) {
    try {
      filename = decodeURIComponent(extendedFilename);
    } catch {
      filename = extendedFilename;
    }
  }
  return filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "download";
}

export function AdminMarkdownPreview({ html }: { html: string }) {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    let active = true;
    const controller = new AbortController();
    const objectUrls = new Set<string>();
    const requests = new Map<string, Promise<string>>();
    const pendingImages: Array<{
      image: HTMLImageElement;
      placeholder: HTMLSpanElement;
    }> = [];
    const pendingVideos: Array<{
      video: HTMLVideoElement;
      placeholder: HTMLDivElement;
    }> = [];
    const downloadListeners: Array<{
      anchor: HTMLAnchorElement;
      listener: (event: MouseEvent) => void;
    }> = [];

    function requestAsset(source: string): Promise<string> {
      let request = requests.get(source);
      if (!request) {
        request = authenticatedRequest(source, { signal: controller.signal })
          .then((response) => response.blob())
          .then((blob) => {
            if (!active) return "";
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.add(objectUrl);
            return objectUrl;
          });
        requests.set(source, request);
      }
      return request;
    }

    for (const image of preview.querySelectorAll<HTMLImageElement>(
      "img[data-admin-src]",
    )) {
      const source = image.getAttribute("data-admin-src");
      if (!source || !ADMIN_MEDIA_SOURCE_PATTERN.test(source)) continue;

      const placeholder = document.createElement("span");
      placeholder.className = "image-preview-placeholder";
      placeholder.dataset.state = "loading";
      placeholder.setAttribute("role", "status");
      placeholder.setAttribute(
        "aria-label",
        image.alt ? `Loading image: ${image.alt}` : "Loading image",
      );
      placeholder.textContent = "Loading image…";
      const layoutStyle = image.getAttribute("style");
      if (layoutStyle) placeholder.setAttribute("style", layoutStyle);
      image.replaceWith(placeholder);
      pendingImages.push({ image, placeholder });

      void requestAsset(source)
        .then((objectUrl) => {
          if (!active || !objectUrl || !placeholder.isConnected) return;
          const loadedImage = document.createElement("img");
          loadedImage.src = objectUrl;
          loadedImage.alt = image.alt;
          loadedImage.decoding = "async";
          for (const attribute of ["class", "style", "title"]) {
            const value = image.getAttribute(attribute);
            if (value) loadedImage.setAttribute(attribute, value);
          }
          placeholder.replaceWith(loadedImage);
        })
        .catch(() => {
          if (!active || controller.signal.aborted || !placeholder.isConnected) {
            return;
          }
          placeholder.className =
            "image-preview-placeholder image-preview-fallback";
          placeholder.dataset.state = "error";
          placeholder.setAttribute("role", "img");
          placeholder.setAttribute(
            "aria-label",
            image.alt ? `${image.alt} (image unavailable)` : "Image unavailable",
          );
          placeholder.textContent = "Image unavailable";
        });
    }

    for (const video of preview.querySelectorAll<HTMLVideoElement>(
      "video[data-admin-src]",
    )) {
      const source = video.getAttribute("data-admin-src");
      if (!source || !ADMIN_MEDIA_SOURCE_PATTERN.test(source)) continue;

      const placeholder = document.createElement("div");
      placeholder.className = "video-preview-placeholder";
      placeholder.setAttribute("role", "status");
      placeholder.textContent = "Loading video...";
      video.replaceWith(placeholder);
      pendingVideos.push({ video, placeholder });

      void requestAsset(source)
        .then((objectUrl) => {
          if (!active || !objectUrl || !placeholder.isConnected) return;
          video.src = objectUrl;
          video.removeAttribute("data-admin-src");
          placeholder.replaceWith(video);
          video.load();
        })
        .catch(() => {
          if (!active || controller.signal.aborted || !placeholder.isConnected) {
            return;
          }
          placeholder.className = "video-preview-placeholder";
          placeholder.setAttribute("role", "alert");
          placeholder.textContent = "Video unavailable.";
        });
    }

    for (const anchor of preview.querySelectorAll<HTMLAnchorElement>(
      "a[data-admin-href]",
    )) {
      const source = anchor.getAttribute("data-admin-href");
      if (!source || !ADMIN_MEDIA_SOURCE_PATTERN.test(source)) continue;
      anchor.setAttribute("href", "#");
      const listener = (event: MouseEvent) => {
        event.preventDefault();
        if (
          anchor.getAttribute("aria-disabled") === "true" ||
          anchor.getAttribute("aria-busy") === "true"
        ) {
          return;
        }
        anchor.setAttribute("aria-busy", "true");
        void authenticatedRequest(source, { signal: controller.signal })
          .then(async (response) => {
            const filename = getDownloadFilename(
              response.headers.get("content-disposition"),
            );
            const objectUrl = URL.createObjectURL(await response.blob());
            if (!active) {
              URL.revokeObjectURL(objectUrl);
              return;
            }
            objectUrls.add(objectUrl);
            const download = document.createElement("a");
            download.href = objectUrl;
            download.download = filename;
            download.click();
            window.setTimeout(() => {
              objectUrls.delete(objectUrl);
              URL.revokeObjectURL(objectUrl);
            }, 1000);
            anchor.removeAttribute("aria-busy");
          })
          .catch((error: unknown) => {
            if (!active || controller.signal.aborted) return;
            anchor.removeAttribute("aria-busy");
            anchor.setAttribute("aria-disabled", "true");
            const message = document.createElement("span");
            message.className = "media-download-error";
            message.setAttribute("role", "alert");
            message.textContent =
              error instanceof Error
                ? `Download unavailable: ${error.message}`
                : "Download unavailable.";
            anchor.insertAdjacentElement("afterend", message);
          });
      };
      anchor.addEventListener("click", listener);
      downloadListeners.push({ anchor, listener });
    }

    return () => {
      active = false;
      controller.abort();
      for (const { image, placeholder } of pendingImages) {
        if (placeholder.isConnected) placeholder.replaceWith(image);
      }
      for (const { video, placeholder } of pendingVideos) {
        if (placeholder.isConnected) placeholder.replaceWith(video);
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      for (const { anchor, listener } of downloadListeners) {
        anchor.removeEventListener("click", listener);
      }
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    };
  }, [html]);

  return (
    <div
      ref={previewRef}
      className="markdown-content admin-markdown-preview"
      dangerouslySetInnerHTML={{ __html: deferAdminMediaRequests(html) }}
    />
  );
}
