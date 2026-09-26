import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createViteConfig } from '@deckspring/core/vite';
import { createServer } from 'vite';
import { buildCommentProposal, makeCommentPrompt, readComments } from './comment-edits.mjs';
import { deckPrompt, makeDeckId, renderDeckSource, THEMES, validateDeck } from './deck.mjs';
import { callModel, chatCompletionsUrl, parseModelJson } from './model.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_ROOT = path.join(ROOT, 'slides');
const LOCAL_ROOT = path.join(ROOT, '.local');
const MODELS_FILE = path.join(LOCAL_ROOT, 'models.json');
const EXPORTS_ROOT = path.join(LOCAL_ROOT, 'exports');
const BIOME_BIN = path.join(ROOT, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
const keys = new Map();
const generationJobs = new Map();
const commentProposals = new Map();
let profiles = [];
let viteServer;

function publicProfile(profile) {
  return { ...profile, hasKey: keys.has(profile.id) };
}

async function loadProfiles() {
  try {
    const parsed = JSON.parse(await fs.readFile(MODELS_FILE, 'utf8'));
    if (Array.isArray(parsed)) {
      profiles = parsed
        .filter(
          (entry) =>
            entry &&
            typeof entry.id === 'string' &&
            typeof entry.name === 'string' &&
            typeof entry.baseUrl === 'string' &&
            typeof entry.model === 'string',
        )
        .map(({ id, name, baseUrl, model }) => ({ id, name, baseUrl, model }));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function saveProfiles() {
  await fs.mkdir(LOCAL_ROOT, { recursive: true });
  await fs.writeFile(MODELS_FILE, `${JSON.stringify(profiles, null, 2)}\n`, { mode: 0o600 });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function fail(res, error) {
  const status = error?.status ?? 400;
  sendJson(res, status, { error: error?.message ?? 'Request failed.' });
}

function sourceHash(source) {
  return createHash('sha256').update(source).digest('hex');
}

function checkMutation(req, requireBody) {
  if (req.headers['sec-fetch-site'] === 'cross-site')
    throw new Error('Cross-site requests are blocked.');
  const origin = req.headers.origin;
  if (origin) {
    const expected = `http://${req.headers.host}`;
    if (origin !== expected) throw new Error('Request origin does not match the studio.');
  }
  if (requireBody && !req.headers['content-type']?.startsWith('application/json')) {
    throw new Error('Send a JSON request.');
  }
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

async function readPptx(req) {
  if (
    req.headers['content-type'] !==
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    throw new Error('Send a PowerPoint file.');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 50_000_000) throw new Error('PowerPoint file is too large.');
    chunks.push(chunk);
  }
  const file = Buffer.concat(chunks);
  if (file.length < 4 || file.toString('ascii', 0, 4) !== 'PK\x03\x04') {
    throw new Error('PowerPoint file is invalid.');
  }
  return file;
}

function checkedProfile(body, existing) {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
  const model = typeof body.model === 'string' ? body.model.trim().slice(0, 120) : '';
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
  if (!name || !model) throw new Error('Enter a name and model name.');
  chatCompletionsUrl(baseUrl);
  if (baseUrl.length > 500) throw new Error('The base URL is too long.');
  if (body.apiKey !== undefined && typeof body.apiKey !== 'string') {
    throw new Error('API key must be text.');
  }
  return { id: existing?.id ?? randomUUID(), name, baseUrl, model };
}

async function formatDeck(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIOME_BIN, 'check', '--write', file], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('Could not format the generated deck.')),
    );
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://studio.local');
  const route = url.pathname;
  const method = req.method ?? 'GET';
  try {
    if (method === 'GET' && route === '/models') {
      return sendJson(res, 200, { models: profiles.map(publicProfile) });
    }
    const jobMatch = route.match(/^\/jobs\/([a-f0-9-]{36})$/);
    if (method === 'GET' && jobMatch) {
      const job = generationJobs.get(jobMatch[1]);
      return job
        ? sendJson(res, 200, job)
        : sendJson(res, 404, { error: 'Generation job not found.' });
    }
    const exportMatch = route.match(/^\/exports\/([a-z0-9-]{1,100})$/);
    if (method !== 'GET') {
      checkMutation(req, method === 'POST' || (method === 'PUT' && !exportMatch));
    }
    if (method === 'PUT' && exportMatch) {
      const slideId = exportMatch[1];
      const slide = await fs.stat(path.join(SLIDES_ROOT, slideId, 'index.tsx')).catch(() => null);
      if (!slide?.isFile()) return sendJson(res, 404, { error: 'Slide not found.' });
      const file = await readPptx(req);
      await fs.mkdir(EXPORTS_ROOT, { recursive: true });
      await fs.writeFile(path.join(EXPORTS_ROOT, `${slideId}.pptx`), file, { mode: 0o600 });
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && route === '/comments/propose') {
      const body = await readJson(req);
      const slideId = body.slideId;
      if (typeof slideId !== 'string' || !/^[a-z0-9-]{1,100}$/.test(slideId)) {
        throw new Error('Slide ID is invalid.');
      }
      const profile = profiles.find((item) => item.id === body.modelId);
      if (!profile) throw new Error('Choose a model first.');
      const file = path.join(SLIDES_ROOT, slideId, 'index.tsx');
      const source = await fs.readFile(file, 'utf8').catch((error) => {
        if (error.code === 'ENOENT') throw new Error('Slide not found.');
        throw error;
      });
      const comments = readComments(source);
      if (comments.length === 0) throw new Error('This slide has no pending comments.');
      const answer = await callModel(
        profile,
        keys.get(profile.id),
        [
          {
            role: 'system',
            content: 'You are a careful React slide editor. Return only JSON edit proposals.',
          },
          { role: 'user', content: makeCommentPrompt(source, comments) },
        ],
        6000,
      );
      const proposal = buildCommentProposal(source, comments, parseModelJson(answer));
      let proposalId = null;
      if (proposal.changes.length > 0) {
        proposalId = randomUUID();
        commentProposals.set(proposalId, {
          slideId,
          sourceHash: sourceHash(source),
          changes: proposal.changes,
          createdAt: Date.now(),
        });
      }
      for (const [id, pending] of commentProposals) {
        if (Date.now() - pending.createdAt > 15 * 60_000) commentProposals.delete(id);
      }
      return sendJson(res, 200, {
        proposalId,
        changes: proposal.changes,
        skipped: proposal.skipped,
      });
    }

    if (method === 'POST' && route === '/comments/apply') {
      const body = await readJson(req);
      const pending = commentProposals.get(body.proposalId);
      if (!pending || Date.now() - pending.createdAt > 15 * 60_000) {
        throw new Error('This proposal expired. Review the comments again.');
      }
      const file = path.join(SLIDES_ROOT, pending.slideId, 'index.tsx');
      const current = await fs.readFile(file, 'utf8');
      if (sourceHash(current) !== pending.sourceHash) {
        commentProposals.delete(body.proposalId);
        throw new Error('The slide changed after the proposal. Review the comments again.');
      }
      const commentIds = body.commentIds;
      if (
        !Array.isArray(commentIds) ||
        commentIds.length === 0 ||
        new Set(commentIds).size !== commentIds.length ||
        commentIds.some((id) => !pending.changes.some((change) => change.commentId === id))
      ) {
        throw new Error('Choose the proposed changes to apply.');
      }
      const selectedEdits = pending.changes
        .filter((change) => commentIds.includes(change.commentId))
        .map((change) => ({
          commentId: change.commentId,
          oldText: change.before,
          newText: change.after,
          summary: change.summary,
        }));
      const selected = buildCommentProposal(current, readComments(current), {
        edits: selectedEdits,
      });
      if (selected.changes.length !== selectedEdits.length) {
        throw new Error('The selected changes could not be applied. Review them again.');
      }
      await fs.writeFile(file, selected.next, 'utf8');
      commentProposals.delete(body.proposalId);
      return sendJson(res, 200, { applied: selected.changes.length });
    }

    if (method === 'POST' && route === '/models') {
      const body = await readJson(req);
      const profile = checkedProfile(body);
      profiles.push(profile);
      if (body.apiKey?.trim()) keys.set(profile.id, body.apiKey.trim());
      await saveProfiles();
      return sendJson(res, 201, { model: publicProfile(profile) });
    }

    const modelMatch = route.match(/^\/models\/([a-f0-9-]+)$/);
    if (modelMatch) {
      const index = profiles.findIndex((profile) => profile.id === modelMatch[1]);
      if (index === -1) return sendJson(res, 404, { error: 'Model not found.' });
      const profile = profiles[index];
      if (method === 'DELETE') {
        profiles.splice(index, 1);
        keys.delete(profile.id);
        await saveProfiles();
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'PUT') {
        const body = await readJson(req);
        const updated = checkedProfile(body, profile);
        profiles[index] = updated;
        if (body.apiKey?.trim()) keys.set(profile.id, body.apiKey.trim());
        else if (updated.baseUrl !== profile.baseUrl) keys.delete(profile.id);
        await saveProfiles();
        return sendJson(res, 200, { model: publicProfile(updated) });
      }
    }

    const testMatch = route.match(/^\/models\/([a-f0-9-]+)\/test$/);
    if (method === 'POST' && testMatch) {
      const profile = profiles.find((item) => item.id === testMatch[1]);
      if (!profile) return sendJson(res, 404, { error: 'Model not found.' });
      await readJson(req);
      await callModel(
        profile,
        keys.get(profile.id),
        [{ role: 'user', content: 'Reply with OK.' }],
        12,
      );
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && route === '/generate') {
      const body = await readJson(req);
      const profile = profiles.find((item) => item.id === body.modelId);
      if (!profile) throw new Error('Choose a model first.');
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const pageCount = Number(body.pageCount);
      const theme = body.theme;
      const language = body.language ?? 'en';
      const requestId = body.requestId;
      if (prompt.length < 10 || prompt.length > 4000) {
        throw new Error('Describe the deck in 10 to 4,000 characters.');
      }
      if (!Number.isInteger(pageCount) || pageCount < 3 || pageCount > 12) {
        throw new Error('Choose between 3 and 12 pages.');
      }
      if (!Object.hasOwn(THEMES, theme)) throw new Error('Choose a valid visual style.');
      if (language !== 'en' && language !== 'ar') throw new Error('Choose English or Arabic.');
      if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId)) {
        throw new Error('Generation request ID is invalid.');
      }
      if (generationJobs.has(requestId)) throw new Error('Generation is already in progress.');
      for (const [id, job] of generationJobs) {
        if (Date.now() - job.createdAt > 30 * 60_000) generationJobs.delete(id);
      }
      generationJobs.set(requestId, { status: 'running', createdAt: Date.now() });
      try {
        const answer = await callModel(profile, keys.get(profile.id), [
          {
            role: 'system',
            content:
              'You are a presentation writer. Produce concise, useful slide content as valid JSON.',
          },
          { role: 'user', content: deckPrompt(prompt, pageCount, language) },
        ]);
        const deck = validateDeck(parseModelJson(answer), pageCount);
        const id = makeDeckId(deck.title);
        await fs.mkdir(path.join(SLIDES_ROOT, id), { recursive: false });
        const file = path.join(SLIDES_ROOT, id, 'index.tsx');
        await fs.writeFile(file, renderDeckSource(deck, theme, undefined, language), {
          flag: 'wx',
        });
        await formatDeck(file);
        const result = { id, title: deck.title, url: `/s/${encodeURIComponent(id)}` };
        generationJobs.set(requestId, { status: 'done', createdAt: Date.now(), deck: result });
        const slidesModule = viteServer?.moduleGraph.getModuleById('\0virtual:deckspring/slides');
        if (slidesModule) viteServer.moduleGraph.invalidateModule(slidesModule);
        viteServer?.ws.send({ type: 'full-reload' });
        return sendJson(res, 201, { deck: result });
      } catch (error) {
        generationJobs.set(requestId, {
          status: 'error',
          createdAt: Date.now(),
          error: error?.message ?? 'Generation failed.',
        });
        throw error;
      }
    }
    return sendJson(res, 404, { error: 'Route not found.' });
  } catch (error) {
    fail(res, error);
  }
}

function studioPlugin() {
  return {
    name: 'deckspring:studio',
    configureServer(server) {
      viteServer = server;
      server.middlewares.use('/__studio', handleApi);
    },
  };
}

await loadProfiles();
await fs.mkdir(SLIDES_ROOT, { recursive: true });
const port = Number(process.env.DECKSPRING_STUDIO_PORT ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DECKSPRING_STUDIO_PORT must be a valid port number.');
}
const config = await createViteConfig({ userCwd: ROOT });
const server = await createServer({
  ...config,
  plugins: [...config.plugins, studioPlugin()],
  server: { ...config.server, host: '127.0.0.1', port, strictPort: true },
});
await server.listen();
console.log(`\nDeckspring Studio: http://127.0.0.1:${port}/\n`);
