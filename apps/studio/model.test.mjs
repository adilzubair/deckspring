import assert from 'node:assert/strict';
import test from 'node:test';
import { chatCompletionsUrl, parseModelJson, textFromCompletion } from './model.mjs';

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

test('reads common text responses and fenced JSON', () => {
  assert.equal(textFromCompletion({ choices: [{ message: { content: 'Hello' } }] }), 'Hello');
  assert.deepEqual(parseModelJson('```json\n{"title":"Deck"}\n```'), { title: 'Deck' });
});
