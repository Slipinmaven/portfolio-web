import {
  ApiResponseError,
  getApiErrorDetails,
} from "@/lib/api/api-errors";
import { API_BASE_URL } from "@/lib/api/api-url";
import {
  expireSession,
  getAccessToken,
  setAccessToken,
} from "@/features/auth/auth-session";
import { refreshSession } from "@/features/auth/api/auth-api";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Sign in again to continue.");
    this.name = "SessionExpiredError";
  }
}

async function requestWithToken(
  endpoint: string,
  init: RequestInit,
  accessToken: string,
  onUploadProgress?: (percent: number | null) => void,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  try {
    if (onUploadProgress) {
      if (!(init.body instanceof FormData)) {
        throw new Error("Upload progress requires a form data request.");
      }
      const body = init.body;

      return await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(init.method ?? "GET", `${API_BASE_URL}${endpoint}`);
        xhr.withCredentials = true;
        headers.forEach((value, name) => xhr.setRequestHeader(name, value));
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && event.total > 0) {
            onUploadProgress(
              Math.min(100, Math.round((event.loaded / event.total) * 100)),
            );
          }
        });
        xhr.upload.addEventListener("load", () => onUploadProgress(null));
        xhr.addEventListener(
          "load",
          () => {
            try {
              const responseHeaders = new Headers();
              for (const line of xhr
                .getAllResponseHeaders()
                .trim()
                .split(/\r?\n/)) {
                const separator = line.indexOf(":");
                if (separator > 0) {
                  responseHeaders.append(
                    line.slice(0, separator),
                    line.slice(separator + 1).trim(),
                  );
                }
              }
              const responseBody =
                xhr.status === 204 || xhr.status === 205 || xhr.status === 304
                  ? null
                  : xhr.responseText;
              resolve(
                new Response(responseBody, {
                  status: xhr.status,
                  statusText: xhr.statusText,
                  headers: responseHeaders,
                }),
              );
            } catch (error) {
              reject(error);
            }
          },
          { once: true },
        );
        xhr.addEventListener(
          "error",
          () => reject(new TypeError("Failed to fetch")),
          { once: true },
        );
        xhr.addEventListener(
          "abort",
          () => reject(new DOMException("The request was aborted.", "AbortError")),
          { once: true },
        );
        xhr.send(body);
      });
    }

    return await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      "Unable to connect to the API. Check the backend connection and try again.",
      { cause: error },
    );
  }
}

async function getRefreshedAccessToken(): Promise<string> {
  const session = await refreshSession();
  if (!session) {
    expireSession();
    throw new SessionExpiredError();
  }
  setAccessToken(session.access_token);
  return session.access_token;
}

export async function authenticatedRequest(
  endpoint: string,
  init: RequestInit = {},
  onUploadProgress?: (percent: number | null) => void,
): Promise<Response> {
  let accessToken = getAccessToken();
  if (!accessToken) {
    accessToken = await getRefreshedAccessToken();
  }

  let response = await requestWithToken(
    endpoint,
    init,
    accessToken,
    onUploadProgress,
  );
  if (response.status === 401) {
    accessToken = await getRefreshedAccessToken();
    response = await requestWithToken(
      endpoint,
      init,
      accessToken,
      onUploadProgress,
    );
    if (response.status === 401) {
      expireSession();
      throw new SessionExpiredError();
    }
  }

  if (!response.ok) {
    const errorDetails = await getApiErrorDetails(
      response,
      "The request failed. Please try again.",
    );
    throw new ApiResponseError(
      errorDetails.message,
      response.status,
      errorDetails.code,
      errorDetails.validationIssues,
    );
  }

  return response;
}
