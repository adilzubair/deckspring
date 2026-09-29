import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callModel,
  chatCompletionsUrl,
  isLocalModelUrl,
  parseModelJson,
  textFromCompletion,
} from './model.mjs';

test('builds an OpenAI-compatible chat URL', () => {
  assert.equal(
    chatCompletionsUrl('https://api.example.com/v1'),
    'https://api.example.com/v1/chat/completions',
  );
  assert.equal(
    chatCompletionsUrl('http://localhost:11434/v1/'),
    'http://localhost:11434/v1/chat/completions',
  );
  assert.throws(() => chatCompletionsUrl('http://api.example.com/v1'), /Use HTTPS/);
});

test('requires credentials for remote endpoints but permits local models', async () => {
  assert.equal(isLocalModelUrl('http://127.0.0.1:11434/v1'), true);
  assert.equal(isLocalModelUrl('https://api.example.com/v1'), false);
  await assert.rejects(
    () =>
      callModel({ baseUrl: 'https://api.example.com/v1', model: 'model' }, '', [
        { role: 'user', content: 'Hello' },
      ]),
    /API key/,
  );
});

test('reads common text responses and fenced JSON', () => {
  assert.equal(textFromCompletion({ choices: [{ message: { content: 'Hello' } }] }), 'Hello');
  assert.deepEqual(parseModelJson('```json\n{"title":"Deck"}\n```'), { title: 'Deck' });
});
