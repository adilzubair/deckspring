const REQUEST_TIMEOUT_MS = 120_000;

export function chatCompletionsUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new Error('Enter an API base URL.');
  }
  let url;
  try {
    url = new URL(baseUrl.trim());
  } catch {
    throw new Error('Enter a valid API base URL.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('Use HTTPS, or HTTP for a model running on this computer.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The base URL cannot contain credentials, a query, or a fragment.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  url.pathname = path.endsWith('/chat/completions') ? path : `${path}/chat/completions`;
  return url.toString();
}

export function textFromCompletion(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
    if (text.trim()) return text;
  }
  throw new Error('The model returned no text. Check that it supports chat completions.');
}

export async function callModel(profile, key, messages, maxTokens = 6500) {
  const endpoint = chatCompletionsUrl(profile.baseUrl);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model: profile.model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') throw new Error('The model request timed out.');
    throw new Error(`Could not reach the model endpoint: ${error?.message ?? 'network error'}`);
  }
  if (!response.ok) {
    let detail = '';
    const raw = await response.text();
    try {
      const body = JSON.parse(raw);
      detail = body?.error?.message ?? body?.message ?? '';
    } catch {
      detail = raw.slice(0, 250);
    }
    throw new Error(`Model request failed (${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The model endpoint returned a non-JSON response.');
  }
  return textFromCompletion(data);
}

export function parseModelJson(text) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch {}
    }
    throw new Error('The model did not return valid deck JSON. Try again or choose another model.');
  }
}
