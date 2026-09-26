import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCommentProposal, readComments } from './comment-edits.mjs';

const payload = Buffer.from(JSON.stringify({ note: 'make this smaller' })).toString('base64url');
const marker = `{/* @slide-comment id="c-12345678" ts="2026-09-27T00:00:00.000Z" text="${payload}" */}`;
const source = `export default function Slide() {
  return <h1 style={{ fontSize: 40 }}>
    ${marker}
    Hello
  </h1>;
}`;

test('applies a nearby unique edit and clears its marker', () => {
  const comments = readComments(source);
  const proposal = buildCommentProposal(source, comments, {
    edits: [
      {
        commentId: comments[0].id,
        oldText: 'fontSize: 40',
        newText: 'fontSize: 32',
        summary: 'Reduce the heading size',
      },
    ],
  });
  assert.equal(proposal.changes.length, 1);
  assert.equal(proposal.skipped.length, 0);
  assert.match(proposal.next, /fontSize: 32/);
  assert.equal(readComments(proposal.next).length, 0);
});

test('leaves ambiguous or invalid edits pending', () => {
  const comments = readComments(source);
  const duplicate = buildCommentProposal(
    source.replace('fontSize: 40', 'fontSize: 40, gap: 40'),
    comments,
    {
      edits: [
        {
          commentId: comments[0].id,
          oldText: '40',
          newText: '32',
        },
      ],
    },
  );
  assert.equal(duplicate.changes.length, 0);
  assert.equal(duplicate.skipped.length, 1);
  assert.equal(readComments(duplicate.next).length, 1);

  assert.throws(
    () =>
      buildCommentProposal(source, comments, {
        edits: [
          {
            commentId: comments[0].id,
            oldText: 'fontSize: 40',
            newText: 'fontSize: }',
          },
        ],
      }),
    /invalid TSX/,
  );
});
