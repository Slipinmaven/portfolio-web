import { getApiErrorMessage } from "@/lib/api/api-errors";
import { API_BASE_URL } from "@/lib/api/api-url";

export async function logout(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    throw new Error(
      "Unable to contact the sign-out service. Check the backend connection and try again.",
      { cause: error },
    );
  }

  if (response.ok) return;

  throw new Error(
    await getApiErrorMessage(
      response,
      "We couldn’t sign you out. Please try again.",
    ),
  );
}
