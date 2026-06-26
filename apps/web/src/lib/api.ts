export function apiBaseUrl() {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_PROXY_PATH ??
    "http://localhost:4000"
  );
}

export function publicApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_PROXY_PATH ??
    "http://localhost:4000"
  );
}

export function publicSocketBaseUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL !== undefined) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL !== undefined) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NEXT_PUBLIC_API_PROXY_PATH !== undefined) {
    return "";
  }
  return "http://localhost:4000";
}

export function publicSocketPath() {
  return process.env.NEXT_PUBLIC_SOCKET_PATH ?? "/socket.io";
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isUnauthorizedApiError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function isForbiddenApiError(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

export function isNotFoundApiError(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

function apiErrorMessage(body: string, status: number) {
  if (!body) return `Request failed: ${status}`;

  try {
    const data = JSON.parse(body) as { message?: unknown; error?: unknown };
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) return data.message.join(", ");
    if (typeof data.error === "string") return data.error;
  } catch {
    // Fall through to the raw response body.
  }

  return body;
}

export async function apiFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(apiErrorMessage(error, response.status), response.status, error);
  }

  return (await response.json()) as T;
}
