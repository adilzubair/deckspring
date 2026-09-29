import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'deckspring-studio-api-'));
const slidesRoot = path.join(root, 'slides');
const themesRoot = path.join(root, 'themes');
const localRoot = path.join(root, 'local');
process.env.DECKSPRING_STUDIO_SLIDES_ROOT = slidesRoot;
process.env.DECKSPRING_STUDIO_THEMES_ROOT = themesRoot;
process.env.DECKSPRING_STUDIO_LOCAL_ROOT = localRoot;

const { handleApi } = await import('./server.mjs');

const themeSpec = {
  name: 'API Signal',
  description: 'A precise editorial system for clear product stories.',
  mode: 'light',
  palette: {
    background: '#F6F7FB',
    text: '#172033',
    accent: '#3157D5',
    muted: '#61708A',
    surface: '#FFFFFF',
    border: '#CAD2E1',
  },
  typography: {
    display: 'Aptos, system-ui, sans-serif',
    body: 'Aptos, system-ui, sans-serif',
    mono: 'Consolas, monospace',
    headingWeight: 700,
    bodyWeight: 400,
  },
  layout: { composition: 'editorial', alignment: 'left', padding: 112, radius: 8 },
  motif: 'line',
  motion: 'subtle',
  aesthetic: 'Direct and spacious, with one cobalt rule per page.',
};

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

test('theme API proposes, creates, reads, duplicates, repairs, and safely deletes themes', async () => {
  await fs.mkdir(path.join(slidesRoot, 'source-deck'), { recursive: true });
  await fs.mkdir(path.join(slidesRoot, 'linked-deck'), { recursive: true });
  await fs.mkdir(themesRoot, { recursive: true });
  await fs.writeFile(
    path.join(slidesRoot, 'source-deck', 'index.tsx'),
    "export const meta = { title: 'Source' }; export default [];",
  );
  await fs.writeFile(
    path.join(slidesRoot, 'linked-deck', 'index.tsx'),
    "export const meta = { title: 'Linked', theme: 'api-signal' }; const visual = '#3157D5'; export default [];",
  );

  let modelReply = JSON.stringify(themeSpec);
  let requiredKey = '';
  const modelServer = http.createServer(async (request, response) => {
    for await (const _chunk of request) {
      // Drain the request before responding, like an OpenAI-compatible endpoint.
    }
    if (requiredKey && request.headers.authorization !== `Bearer ${requiredKey}`) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Missing API key' }));
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: modelReply } }] }));
  });
  const modelOrigin = await listen(modelServer);
  const apiServer = http.createServer(handleApi);
  const apiOrigin = await listen(apiServer);

  const request = async (method, route, body) => {
    const response = await fetch(`${apiOrigin}${route}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, body: await response.json() };
  };

  try {
    const added = await request('POST', '/models', {
      name: 'Stub model',
      baseUrl: `${modelOrigin}/v1`,
      model: 'stub',
      apiKey: '',
    });
    assert.equal(added.response.status, 201);
    const modelId = added.body.model.id;

    requiredKey = 'test-session-key';
    const missingKey = await request('POST', `/models/${modelId}/test`, {});
    assert.match(missingKey.body.error, /requires an API key/);
    const temporaryKey = await request('POST', `/models/${modelId}/test`, {
      apiKey: requiredKey,
    });
    assert.equal(temporaryKey.response.status, 200);
    assert.equal((await request('GET', '/models')).body.models[0].hasKey, false);
    requiredKey = '';

    for (const source of [
      { kind: 'prompt', prompt: 'A clear cobalt editorial system with precise rules.' },
      { kind: 'slide', slideId: 'source-deck' },
    ]) {
      const proposed = await request('POST', '/themes/propose', { modelId, source });
      assert.equal(proposed.response.status, 200);
      assert.deepEqual(proposed.body.spec, { version: 1, ...themeSpec });
    }

    const created = await request('POST', '/themes', { id: 'api-signal', spec: themeSpec });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    assert.match(
      await fs.readFile(path.join(themesRoot, 'api-signal.md'), 'utf8'),
      /studio-spec: 1/,
    );
    assert.match(
      await fs.readFile(path.join(themesRoot, 'api-signal.demo.tsx'), 'utf8'),
      /export default \[Cover, Content, Closer\]/,
    );

    const collision = await request('POST', '/themes', { id: 'api-signal', spec: themeSpec });
    assert.equal(collision.response.status, 400);
    assert.match(collision.body.error, /already exists/);

    const read = await request('GET', '/themes/api-signal');
    assert.deepEqual(read.body.usedBy, ['linked-deck']);
    assert.equal(read.body.spec.name, themeSpec.name);

    modelReply = JSON.stringify({
      title: 'Saved theme deck',
      subtitle: 'Generated through the private API',
      slides: [
        { layout: 'cover', title: 'Opening' },
        { layout: 'bullets', title: 'Middle', bullets: ['One', 'Two'] },
        { layout: 'closing', title: 'Close' },
      ],
    });
    const generated = await request('POST', '/generate', {
      requestId: randomUUID(),
      modelId,
      prompt: 'Create a short deck using the saved visual system.',
      pageCount: 3,
      style: { kind: 'theme', id: 'api-signal' },
      motion: { entrance: 'rich', transition: 'rise', revealBullets: true },
      language: 'en',
    });
    assert.equal(generated.response.status, 201);
    const generatedSource = await fs.readFile(
      path.join(slidesRoot, generated.body.deck.id, 'index.tsx'),
      'utf8',
    );
    assert.match(generatedSource, /theme:\s*['"]api-signal['"]/);
    assert.match(generatedSource, /#3157D5/);
    assert.match(generatedSource, /export const transition: SlideTransition/);
    assert.match(generatedSource, /<Steps>/);
    assert.match(generatedSource, /entrance: 'rich'/);

    const invalidMotion = await request('POST', '/generate', {
      requestId: randomUUID(),
      modelId,
      prompt: 'Create another short deck using the saved visual system.',
      pageCount: 3,
      style: { kind: 'theme', id: 'api-signal' },
      motion: { entrance: 'spin' },
      language: 'en',
    });
    assert.equal(invalidMotion.response.status, 400);
    assert.match(invalidMotion.body.error, /motion settings/);

    const duplicated = await request('POST', '/themes/api-signal/duplicate', {
      id: 'api-signal-copy',
      name: 'API Signal Copy',
    });
    assert.equal(duplicated.response.status, 201);
    assert.equal(
      (await request('GET', '/themes/api-signal-copy')).body.spec.name,
      'API Signal Copy',
    );

    await fs.rm(path.join(themesRoot, 'api-signal.demo.tsx'));
    const repaired = await request('POST', '/themes/api-signal/repair', {});
    assert.equal(repaired.response.status, 200);
    assert.match(await fs.readFile(path.join(themesRoot, 'api-signal.demo.tsx'), 'utf8'), /Cover/);

    modelReply = 'not valid JSON';
    const invalid = await request('POST', '/themes/propose', {
      modelId,
      source: { kind: 'prompt', prompt: 'A valid request that gets an invalid response.' },
    });
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.body.error, /valid JSON/);

    const removed = await request('DELETE', '/themes/api-signal');
    assert.equal(removed.response.status, 200);
    assert.deepEqual(
      new Set(removed.body.detached),
      new Set(['linked-deck', generated.body.deck.id]),
    );
    const linked = await fs.readFile(path.join(slidesRoot, 'linked-deck', 'index.tsx'), 'utf8');
    assert.doesNotMatch(linked, /theme:\s*'api-signal'/);
    assert.match(linked, /#3157D5/);
    const detachedGenerated = await fs.readFile(
      path.join(slidesRoot, generated.body.deck.id, 'index.tsx'),
      'utf8',
    );
    assert.doesNotMatch(detachedGenerated, /theme:\s*['"]api-signal['"]/);
    assert.match(detachedGenerated, /#3157D5/);
  } finally {
    await close(apiServer);
    await close(modelServer);
    await fs.rm(root, { recursive: true, force: true });
  }
});
