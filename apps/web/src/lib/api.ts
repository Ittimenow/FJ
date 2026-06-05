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
    throw new Error(error || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
