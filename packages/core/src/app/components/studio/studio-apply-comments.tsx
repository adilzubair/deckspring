import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/lib/use-locale';
import { studioApi, studioError } from './studio-api';
import { studioCopy } from './studio-copy';
import { useStudioModels } from './studio-models';

type Change = {
  commentId: string;
  note: string;
  summary: string;
  before: string;
  after: string;
};
type Skipped = { commentId: string; note: string; reason: string };
type Proposal = { proposalId: string | null; changes: Change[]; skipped: Skipped[] };

export function StudioApplyComments({
  slideId,
  onApplied,
  pendingEdits,
}: {
  slideId: string;
  onApplied: () => Promise<void>;
  pendingEdits: boolean;
}) {
  const locale = useLocale();
  const copy = studioCopy[locale.id];
  const { models, loading: modelsLoading, selectedId, choose, openManager } = useStudioModels();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function propose() {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await studioApi<Proposal>('POST', '/comments/propose', {
        slideId,
        modelId: selectedId,
      });
      setProposal(result);
      setSelectedChanges(result.changes.map((change) => change.commentId));
      setReviewOpen(true);
    } catch (caught) {
      setError(studioError(caught) || copy.reviewError);
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!proposal?.proposalId || selectedChanges.length === 0) return;
    setApplying(true);
    setError('');
    try {
      const { applied } = await studioApi<{ applied: number }>('POST', '/comments/apply', {
        proposalId: proposal.proposalId,
        commentIds: selectedChanges,
      });
      await onApplied();
      const message = `${applied} ${applied === 1 ? copy.comment : copy.comments} ${copy.applied}`;
      setSuccess(message);
      toast.success(message);
      setReviewOpen(false);
      setProposal(null);
    } catch (caught) {
      setError(studioError(caught) || copy.applyError);
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div className="border-t px-3 py-3">
        {modelsLoading ? (
          <p className="text-[12.5px] text-muted-foreground">{copy.loadingModels}</p>
        ) : models.length > 0 ? (
          <>
            <label
              className="block text-[12.5px] font-medium text-muted-foreground"
              htmlFor="comment-model"
            >
              {copy.reviewWithModel}
            </label>
            <select
              id="comment-model"
              value={selectedId}
              onChange={(event) => {
                choose(event.target.value);
              }}
              className="mt-1.5 h-8 w-full rounded-[5px] border border-input bg-card px-2 text-[13px] outline-none focus:border-foreground/30"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.model}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[12.5px] leading-4 text-muted-foreground">{copy.commentHelp}</p>
            {pendingEdits && (
              <p className="mt-2 text-[12.5px] leading-4 text-muted-foreground">
                {copy.saveBeforeReview}
              </p>
            )}
            <Button
              type="button"
              variant="brand"
              size="sm"
              className="mt-3 w-full"
              disabled={loading || !selectedId || pendingEdits}
              onClick={propose}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {loading ? copy.reviewing : copy.reviewAiEdits}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => openManager()}
          >
            {copy.addModel}
          </Button>
        )}
        {success && (
          <p className="mt-2 text-[12.5px] text-foreground" role="status">
            {success}
          </p>
        )}
        {error && (
          <p className="mt-2 text-[12.5px] text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!applying) setReviewOpen(open);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="text-start">
            <DialogTitle>{copy.reviewTitle}</DialogTitle>
            <DialogDescription>{copy.reviewDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {proposal?.changes.map((change) => (
              <section key={change.commentId} className="rounded-[6px] border border-border">
                <label className="flex cursor-pointer items-start gap-2 border-b border-border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedChanges.includes(change.commentId)}
                    onChange={(event) =>
                      setSelectedChanges((current) =>
                        event.target.checked
                          ? [...current, change.commentId]
                          : current.filter((id) => id !== change.commentId),
                      )
                    }
                    className="mt-0.5 accent-brand"
                  />
                  <span>
                    <span className="block text-[13px] font-medium">{change.note}</span>
                    <span className="mt-1 block text-[12.5px] text-muted-foreground">
                      {change.summary}
                    </span>
                  </span>
                </label>
                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-1 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      {copy.before}
                    </p>
                    <pre
                      dir="ltr"
                      className="max-h-40 overflow-auto rounded-[5px] bg-muted/70 p-2 text-left text-[11.5px] leading-4 whitespace-pre-wrap break-all"
                    >
                      {change.before}
                    </pre>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      {copy.after}
                    </p>
                    <pre
                      dir="ltr"
                      className="max-h-40 overflow-auto rounded-[5px] bg-brand-soft p-2 text-left text-[11.5px] leading-4 whitespace-pre-wrap break-all"
                    >
                      {change.after}
                    </pre>
                  </div>
                </div>
              </section>
            ))}
            {proposal?.skipped.map((item) => (
              <section
                key={item.commentId}
                className="rounded-[6px] border border-border px-3 py-2"
              >
                <p className="text-[13px] font-medium">
                  {copy.skipped}: {item.note}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">{item.reason}</p>
              </section>
            ))}
            {proposal?.changes.length === 0 && proposal?.skipped.length === 0 && (
              <p className="text-[13px] text-muted-foreground">{copy.noChanges}</p>
            )}
            {error && (
              <p className="text-[13px] text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={applying}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={apply}
              disabled={applying || !proposal?.proposalId || selectedChanges.length === 0}
            >
              {applying && <Loader2 className="animate-spin" />}
              {copy.apply} {selectedChanges.length}{' '}
              {selectedChanges.length === 1 ? copy.change : copy.changes}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
