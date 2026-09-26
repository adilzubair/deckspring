import { parse } from '@babel/parser';

const MARKER_RE =
  /\{\/\*\s*@slide-comment\s+id="(c-[a-f0-9]+)"\s+ts="([^"]+)"\s+text="([A-Za-z0-9_-]+={0,2})"\s*\*\/\}/g;
const MAX_COMMENTS = 8;

export function readComments(source) {
  const comments = [];
  for (const match of source.matchAll(MARKER_RE)) {
    try {
      const payload = JSON.parse(Buffer.from(match[3], 'base64url').toString('utf8'));
      if (typeof payload.note !== 'string' || !payload.note.trim()) continue;
      comments.push({
        id: match[1],
        note: payload.note,
        markerStart: match.index,
        markerEnd: match.index + match[0].length,
      });
    } catch {}
  }
  return comments;
}

export function makeCommentPrompt(source, comments) {
  const selected = comments.slice(0, MAX_COMMENTS);
  const blocks = selected.map((comment) => {
    const start = Math.max(0, comment.markerStart - 2400);
    const end = Math.min(source.length, comment.markerEnd + 3600);
    return `Comment ${comment.id}: ${comment.note}\nSource excerpt:\n${source.slice(start, end)}`;
  });
  return `Suggest minimal edits to a React TSX slide file for the comments below.
Return JSON only: {"edits":[{"commentId":"c-...","oldText":"exact source substring","newText":"replacement source substring","summary":"short description"}],"skipped":[{"commentId":"c-...","reason":"why it cannot be safely resolved"}]}.
Use at most one edit per comment. oldText must occur exactly once in the file and must be copied verbatim from the source excerpt. Do not include or edit @slide-comment markers; the app removes them after approval. Keep changes local to the commented element. Preserve the surrounding design and avoid adding imports, network calls, or unrelated code. If a request is ambiguous, put it in skipped. Do not claim an edit was made when it was not.

${blocks.join('\n\n---\n\n')}`;
}

export function buildCommentProposal(source, comments, answer) {
  if (!answer || !Array.isArray(answer.edits)) {
    throw new Error('The model did not return a valid edit proposal.');
  }
  const selected = comments.slice(0, MAX_COMMENTS);
  const skipped = comments.slice(MAX_COMMENTS).map((comment) => ({
    commentId: comment.id,
    note: comment.note,
    reason: 'Review the first eight comments, then run this again.',
  }));
  const candidates = [];

  for (const comment of selected) {
    const matching = answer.edits.filter((edit) => edit?.commentId === comment.id);
    const modelSkip = Array.isArray(answer.skipped)
      ? answer.skipped.find((item) => item?.commentId === comment.id)
      : null;
    if (matching.length !== 1) {
      skipped.push({
        commentId: comment.id,
        note: comment.note,
        reason:
          matching.length > 1
            ? 'The model returned multiple edits for this comment.'
            : typeof modelSkip?.reason === 'string'
              ? modelSkip.reason.slice(0, 240)
              : 'The model did not propose an edit.',
      });
      continue;
    }
    const edit = matching[0];
    const oldText = edit.oldText;
    const newText = edit.newText;
    if (
      typeof oldText !== 'string' ||
      typeof newText !== 'string' ||
      !oldText ||
      oldText === newText ||
      oldText.length > 5000 ||
      newText.length > 5000 ||
      oldText.includes('@slide-comment') ||
      newText.includes('@slide-comment')
    ) {
      skipped.push({
        commentId: comment.id,
        note: comment.note,
        reason: 'The proposed replacement is invalid or makes no change.',
      });
      continue;
    }
    const start = source.indexOf(oldText);
    const end = start + oldText.length;
    if (start < 0 || source.indexOf(oldText, start + 1) !== -1) {
      skipped.push({
        commentId: comment.id,
        note: comment.note,
        reason: 'The source text could not be matched uniquely.',
      });
      continue;
    }
    if (start < comment.markerStart - 2400 || end > comment.markerEnd + 3600) {
      skipped.push({
        commentId: comment.id,
        note: comment.note,
        reason: 'The proposed edit is too far from the commented element.',
      });
      continue;
    }
    if (candidates.some((candidate) => start < candidate.end && end > candidate.start)) {
      skipped.push({
        commentId: comment.id,
        note: comment.note,
        reason: 'This edit overlaps another proposed edit.',
      });
      continue;
    }
    candidates.push({
      commentId: comment.id,
      note: comment.note,
      summary:
        typeof edit.summary === 'string' && edit.summary.trim()
          ? edit.summary.trim().slice(0, 180)
          : 'Update the commented element',
      before: oldText,
      after: newText,
      start,
      end,
    });
  }

  let next = source;
  for (const candidate of [...candidates].sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, candidate.start)}${candidate.after}${next.slice(candidate.end)}`;
  }
  for (const candidate of candidates) {
    const markerLine = new RegExp(
      `^[ \\t]*\\{\\/\\*\\s*@slide-comment\\s+id="${candidate.commentId}"[^\\n]*\\*\\/\\}[ \\t]*\\r?\\n?`,
      'm',
    );
    if (!markerLine.test(next)) throw new Error('A comment marker changed during proposal.');
    next = next.replace(markerLine, '');
  }

  if (candidates.length > 0) {
    try {
      parse(next, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    } catch {
      throw new Error('The proposed edits contain invalid TSX. No changes were applied.');
    }
  }

  return {
    next,
    changes: candidates.map(({ commentId, note, summary, before, after }) => ({
      commentId,
      note,
      summary,
      before,
      after,
    })),
    skipped,
  };
}
