import { useAuthStore } from "@/hooks/useAuthStore";

export async function fetchWithJwt<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const jwt = useAuthStore.getState().jwt;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: jwt ? `Bearer ${jwt}` : "",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error?.error || "API Error");
  }

  return res.json();
}
