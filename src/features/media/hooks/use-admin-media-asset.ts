"use client";

import { useEffect, useState } from "react";

import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type AdminMediaAssetState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

type AdminMediaAssetType = "content" | "poster";

type StoredAssetState = {
  requestId: string;
  state: AdminMediaAssetState;
};

export function useAdminMediaAsset(
  mediaId: string,
  assetType: AdminMediaAssetType | null,
): AdminMediaAssetState {
  const requestId = `${mediaId}:${assetType ?? "disabled"}`;
  const [storedState, setStoredState] = useState<StoredAssetState>({
    requestId,
    state: assetType ? { status: "loading" } : { status: "disabled" },
  });

  useEffect(() => {
    if (!assetType) return;

    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    void authenticatedRequest(
      `/api/v1/media/admin/${encodeURIComponent(mediaId)}/${assetType}`,
      { signal: controller.signal },
    )
      .then((response) => response.blob())
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setStoredState({ requestId, state: { status: "ready", url: objectUrl } });
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setStoredState({
          requestId,
          state: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load this media preview.",
          },
        });
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetType, mediaId, requestId]);

  if (!assetType) return { status: "disabled" };
  if (storedState.requestId !== requestId) return { status: "loading" };
  return storedState.state;
}
