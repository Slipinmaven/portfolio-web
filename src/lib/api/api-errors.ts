export type ApiValidationIssue = {
  location: Array<string | number>;
  message: string;
};

export type ApiErrorDetails = {
  message: string;
  code?: string;
  validationIssues: ApiValidationIssue[];
};

export class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly validationIssues: ApiValidationIssue[] = [],
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getApiErrorDetails(
  response: Response,
  fallback: string,
): Promise<ApiErrorDetails> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body)) {
      const code = typeof body.code === "string" ? body.code : undefined;
      if ("message" in body && typeof body.message === "string") {
        return { message: body.message, code, validationIssues: [] };
      }
      if ("detail" in body && typeof body.detail === "string") {
        return { message: body.detail, code, validationIssues: [] };
      }
      if (Array.isArray(body.detail)) {
        const validationIssues = body.detail.flatMap(
          (item): ApiValidationIssue[] => {
          if (typeof item === "string") {
              const message = item.trim();
              return message ? [{ location: [], message }] : [];
          }
          if (!isRecord(item) || typeof item.msg !== "string") return [];
          const message = item.msg.replace(/^Value error,\s*/i, "").trim();
            if (!message) return [];
            const location = Array.isArray(item.loc)
              ? item.loc.filter(
                  (part): part is string | number =>
                    typeof part === "string" || typeof part === "number",
                )
              : [];
            return [{ location, message }];
          },
        );
        if (validationIssues.length > 0) {
          return {
            message: validationIssues
              .map((issue) => issue.message)
              .join(" "),
            code,
            validationIssues,
          };
        }
      }
    }
  } catch {
    return { message: fallback, validationIssues: [] };
  }
  return { message: fallback, validationIssues: [] };
}

export async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  return (await getApiErrorDetails(response, fallback)).message;
}
