import { getApiErrorMessage } from "@/lib/api/api-errors";

export const AUTH_API_BASE_PATH = "/api/v1/auth";

export type LoginPayload = {
  email: string;
  password: string;
  trusted_device: boolean;
};

export type LoginResult = {
  user_id: string;
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

let refreshRequest: Promise<LoginResult | null> | null = null;
const SESSION_REFRESH_TIMEOUT_MS = 10_000;

function isLoginResult(value: unknown): value is LoginResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "user_id" in value &&
    typeof value.user_id === "string" &&
    "access_token" in value &&
    typeof value.access_token === "string" &&
    value.access_token.length > 0 &&
    "token_type" in value &&
    value.token_type === "bearer" &&
    "expires_in" in value &&
    typeof value.expires_in === "number" &&
    Number.isFinite(value.expires_in) &&
    value.expires_in > 0
  );
}

async function readLoginResult(
  response: Response,
  serviceName: string,
): Promise<LoginResult> {
  let result: unknown;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(`${serviceName} returned an invalid response.`, {
      cause: error,
    });
  }
  if (!isLoginResult(result)) {
    throw new Error(`${serviceName} returned an invalid response.`);
  }
  return result;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_API_BASE_PATH}/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      "Unable to connect to sign in. Check that the backend is running and allows this site in its CORS settings, then try again.",
      { cause: error },
    );
  }

  if (!response.ok) {
    const message = await getApiErrorMessage(
      response,
      "We couldn’t sign you in. Check your details and try again.",
    );
    throw new Error(message);
  }

  return readLoginResult(response, "The sign-in service");
}

async function requestSessionRefresh(): Promise<LoginResult | null> {
  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SESSION_REFRESH_TIMEOUT_MS,
  );
  try {
    response = await fetch(`${AUTH_API_BASE_PATH}/refresh`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "The session check took too long. Check the backend connection and try again.",
        { cause: error },
      );
    }
    throw new Error(
      "Unable to restore your session. Check the backend connection and try again.",
      { cause: error },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) return null;
  if (!response.ok) {
    const message = await getApiErrorMessage(
      response,
      "Unable to restore your session. Please try again.",
    );
    throw new Error(message);
  }

  return readLoginResult(response, "The session service");
}

export function refreshSession(): Promise<LoginResult | null> {
  if (!refreshRequest) {
    refreshRequest = requestSessionRefresh().finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}
