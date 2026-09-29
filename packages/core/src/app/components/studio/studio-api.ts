export type StudioModel = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  hasKey: boolean;
};

export async function studioApi<T>(method: string, route: string, body?: object): Promise<T> {
  const response = await fetch(`/__studio${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result as T;
}

export function studioError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function isLocalModel(profile: StudioModel): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(profile.baseUrl).hostname);
  } catch {
    return false;
  }
}
