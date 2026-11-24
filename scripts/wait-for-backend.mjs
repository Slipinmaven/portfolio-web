const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required for Vercel builds.");
}

let apiUrl;
try {
  apiUrl = new URL(apiBaseUrl);
} catch {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL.");
}
if (apiUrl.protocol !== "https:" && apiUrl.protocol !== "http:") {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL.");
}

const readinessUrl = `${apiBaseUrl}/api/v1/site-settings/public`;
const maximumWaitMs = 3 * 60 * 1000;
const requestTimeoutMs = 10 * 1000;
const retryIntervalMs = 5 * 1000;
const deadline = Date.now() + maximumWaitMs;

async function isBackendReady() {
  try {
    const response = await fetch(readinessUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    const isReady = response.ok;
    await response.body?.cancel();
    return isReady;
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "TimeoutError"))
    ) {
      return false;
    }
    throw error;
  }
}

let attempt = 0;
let backendReady = false;
while (Date.now() < deadline) {
  attempt += 1;
  if (await isBackendReady()) {
    console.info("Backend is ready for prerendering.");
    backendReady = true;
    break;
  }

  if (attempt === 1 || attempt % 3 === 0) {
    console.info(`Backend is starting; retrying readiness check (attempt ${attempt}).`);
  }

  const remainingMs = deadline - Date.now();
  if (remainingMs > 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryIntervalMs, remainingMs)),
    );
  }
}

if (!backendReady) {
  throw new Error(
    "Backend did not become ready within 3 minutes. Check NEXT_PUBLIC_API_BASE_URL and backend/database availability.",
  );
}
