import { getApiErrorMessage } from "@/lib/api/api-errors";
import { AUTH_API_BASE_PATH } from "@/features/auth/api/auth-api";

export async function logout(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_API_BASE_PATH}/logout`, {
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
