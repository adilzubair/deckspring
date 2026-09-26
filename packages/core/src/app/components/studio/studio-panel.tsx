import { ArrowUpRight, Check, KeyRound, Loader2, Plus, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
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
import { studioCopy } from './studio-copy';

type Model = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  hasKey: boolean;
};

type ModelForm = {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const EMPTY_FORM: ModelForm = { name: '', baseUrl: '', model: '', apiKey: '' };
const PENDING_GENERATION_KEY = 'studio:pending-generation';

const inputClass =
  'h-9 w-full rounded-[6px] border border-input bg-card px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-foreground/30 focus:ring-2 focus:ring-ring/20';

async function studioApi<T>(method: string, route: string, body?: object): Promise<T> {
  const response = await fetch(`/__studio${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result as T;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function isLocalModel(profile: Model): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(profile.baseUrl).hostname);
  } catch {
    return false;
  }
}

export function StudioPanel() {
  const locale = useLocale();
  const copy = studioCopy[locale.id];
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('studio:model') ?? '');
  const [prompt, setPrompt] = useState('');
  const [pageCount, setPageCount] = useState(6);
  const [palette, setPalette] = useState('cobalt');
  const [deckLanguage, setDeckLanguage] = useState<'en' | 'ar'>(locale.id);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY_FORM);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogStatus, setDialogStatus] = useState('');

  useEffect(() => {
    studioApi<{ models: Model[] }>('GET', '/models')
      .then(({ models: loaded }) => {
        setModels(loaded);
        setSelectedId((current) =>
          loaded.some((model) => model.id === current) ? current : (loaded[0]?.id ?? ''),
        );
      })
      .catch((caught) => {
        setError(true);
        setStatus(`${copy.loadModelsError}: ${errorMessage(caught)}`);
      })
      .finally(() => setModelsLoading(false));
  }, [copy.loadModelsError]);

  useEffect(() => {
    const requestId = sessionStorage.getItem(PENDING_GENERATION_KEY);
    if (!requestId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let missingAttempts = 0;
    setBusy(true);
    setStatus(copy.writingDeck);

    async function poll() {
      try {
        const job = await studioApi<{
          status: 'running' | 'done' | 'error';
          deck?: { url: string };
          error?: string;
        }>('GET', `/jobs/${requestId}`);
        if (cancelled) return;
        if (job.status === 'done' && job.deck) {
          window.location.assign(job.deck.url);
          return;
        }
        if (job.status === 'error') {
          sessionStorage.removeItem(PENDING_GENERATION_KEY);
          setBusy(false);
          setError(true);
          setStatus(job.error ?? copy.generationFailed);
          return;
        }
        timer = setTimeout(poll, 700);
      } catch (caught) {
        if (cancelled) return;
        if (++missingAttempts < 4) {
          timer = setTimeout(poll, 700);
          return;
        }
        sessionStorage.removeItem(PENDING_GENERATION_KEY);
        setBusy(false);
        setError(true);
        setStatus(`${copy.resumeError}: ${errorMessage(caught)}`);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [copy.generationFailed, copy.resumeError, copy.writingDeck]);

  const selected = models.find((model) => model.id === selectedId);

  useEffect(() => setDeckLanguage(locale.id), [locale.id]);

  function chooseModel(id: string) {
    setSelectedId(id);
    localStorage.setItem('studio:model', id);
    setStatus('');
  }

  function openModel(profile?: Model) {
    setEditingId(profile?.id ?? null);
    setForm({
      name: profile?.name ?? '',
      baseUrl: profile?.baseUrl ?? '',
      model: profile?.model ?? '',
      apiKey: '',
    });
    setDialogStatus('');
    setDialogOpen(true);
  }

  async function refreshModels(preferredId?: string) {
    const { models: loaded } = await studioApi<{ models: Model[] }>('GET', '/models');
    setModels(loaded);
    const nextId =
      preferredId && loaded.some((model) => model.id === preferredId)
        ? preferredId
        : loaded.some((model) => model.id === selectedId)
          ? selectedId
          : (loaded[0]?.id ?? '');
    chooseModel(nextId);
  }

  async function saveModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDialogBusy(true);
    setDialogStatus('');
    try {
      const { model } = await studioApi<{ model: Model }>(
        editingId ? 'PUT' : 'POST',
        editingId ? `/models/${editingId}` : '/models',
        form,
      );
      await refreshModels(model.id);
      setDialogOpen(false);
      setStatus(copy.modelSaved);
      setError(false);
    } catch (caught) {
      setDialogStatus(errorMessage(caught));
    } finally {
      setDialogBusy(false);
    }
  }

  async function deleteModel() {
    if (!editingId || !window.confirm(copy.deleteConfirm)) return;
    setDialogBusy(true);
    try {
      await studioApi('DELETE', `/models/${editingId}`);
      await refreshModels();
      setDialogOpen(false);
      setStatus(copy.modelDeleted);
      setError(false);
    } catch (caught) {
      setDialogStatus(errorMessage(caught));
    } finally {
      setDialogBusy(false);
    }
  }

  async function testModel() {
    if (!editingId) return;
    setDialogBusy(true);
    setDialogStatus(copy.contacting);
    try {
      await studioApi('POST', `/models/${editingId}/test`, {});
      setDialogStatus(copy.connectionWorks);
    } catch (caught) {
      setDialogStatus(errorMessage(caught));
    } finally {
      setDialogBusy(false);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError(true);
      setStatus(copy.chooseModel);
      return;
    }
    if (!selected.hasKey && !isLocalModel(selected)) {
      openModel(selected);
      setError(true);
      setStatus(copy.enterKey);
      return;
    }
    setBusy(true);
    setError(false);
    setStatus(copy.writingDeck);
    const requestId = crypto.randomUUID();
    sessionStorage.setItem(PENDING_GENERATION_KEY, requestId);
    try {
      const { deck } = await studioApi<{ deck: { id: string; url: string } }>('POST', '/generate', {
        requestId,
        modelId: selectedId,
        prompt,
        pageCount,
        theme: palette,
        language: deckLanguage,
      });
      window.location.assign(deck.url);
    } catch (caught) {
      sessionStorage.removeItem(PENDING_GENERATION_KEY);
      setError(true);
      setStatus(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-edge">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-brand-soft text-brand">
            <Sparkles className="size-4" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-heading text-[15px] font-semibold tracking-[-0.015em]">
              {copy.createTitle}
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{copy.createDescription}</p>
          </div>
        </div>
        <span className="eyebrow mt-1">{copy.localWorkspace}</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <form onSubmit={generate} className="min-w-0 p-5 md:p-6">
          <label htmlFor="studio-prompt" className="text-[12px] font-medium">
            {copy.promptLabel}
          </label>
          <textarea
            id="studio-prompt"
            dir="auto"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            minLength={10}
            maxLength={4000}
            required
            rows={5}
            placeholder={copy.promptPlaceholder}
            className="mt-2 block min-h-32 w-full resize-y rounded-[6px] border border-input bg-background px-3 py-2.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-foreground/30 focus:ring-2 focus:ring-ring/20"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="me-1">{copy.try}</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPrompt(copy.productPrompt)}
            >
              {copy.productLaunch}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPrompt(copy.investorPrompt)}
            >
              {copy.investorUpdate}
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="grid min-w-28 gap-1.5 text-[12px] font-medium">
              {copy.pages}
              <select
                value={pageCount}
                onChange={(event) => setPageCount(Number(event.target.value))}
                className={inputClass}
              >
                {[4, 6, 8, 10, 12].map((count) => (
                  <option key={count} value={count}>
                    {count} {copy.pageUnit}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-32 gap-1.5 text-[12px] font-medium">
              {copy.palette}
              <select
                value={palette}
                onChange={(event) => setPalette(event.target.value)}
                className={inputClass}
              >
                <option value="cobalt">{copy.cobalt}</option>
                <option value="citrus">{copy.citrus}</option>
                <option value="evergreen">{copy.evergreen}</option>
                <option value="midnight">{copy.midnight}</option>
              </select>
            </label>
            <label className="grid min-w-28 gap-1.5 text-[12px] font-medium">
              {copy.outputLanguage}
              <select
                value={deckLanguage}
                onChange={(event) => setDeckLanguage(event.target.value as 'en' | 'ar')}
                className={inputClass}
              >
                <option value="en">{copy.english}</option>
                <option value="ar">{copy.arabic}</option>
              </select>
            </label>
            <Button type="submit" variant="brand" disabled={busy} className="ms-auto">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles />}
              {busy ? copy.generating : copy.generate}
              {!busy && <ArrowUpRight />}
            </Button>
          </div>
          {status && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-3 text-[12px] ${error ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {status}
            </p>
          )}
        </form>

        <div className="border-t border-border bg-sidebar/55 p-5 lg:border-t-0 lg:border-s md:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="eyebrow">{copy.models}</h3>
            <Button type="button" variant="outline" size="xs" onClick={() => openModel()}>
              <Plus /> {copy.addModel}
            </Button>
          </div>
          <div className="mt-3 grid gap-1.5">
            {modelsLoading && (
              <p className="px-3 py-4 text-[12px] text-muted-foreground">{copy.loadingModels}</p>
            )}
            {!modelsLoading && models.length === 0 && (
              <p className="rounded-[6px] border border-dashed border-border px-3 py-4 text-[12px] leading-5 text-muted-foreground">
                {copy.noModels}
              </p>
            )}
            {models.map((model) => {
              const ready = model.hasKey || isLocalModel(model);
              const active = model.id === selectedId;
              return (
                <div
                  key={model.id}
                  className={`flex items-center gap-1 rounded-[6px] border px-2 py-1.5 ${active ? 'border-foreground/15 bg-background shadow-edge' : 'border-transparent hover:bg-muted/60'}`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseModel(model.id)}
                    className="min-w-0 flex-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <span className="flex items-center gap-1.5 truncate text-[12px] font-medium">
                      {active && <Check className="size-3 shrink-0 text-brand" />}
                      {model.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {model.model} · {ready ? copy.ready : copy.needsKey}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => openModel(model)}
                    aria-label={`${copy.edit} ${model.name}`}
                  >
                    {copy.edit}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
            <KeyRound className="mt-0.5 size-3 shrink-0" />
            {copy.keyMemory}
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={saveModel}>
            <DialogHeader className="text-start">
              <DialogTitle>{editingId ? copy.editModel : copy.addAModel}</DialogTitle>
              <DialogDescription>{copy.connectionDescription}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              {(
                [
                  ['name', copy.connectionName, 'My model', 'text'],
                  ['baseUrl', copy.baseUrl, 'https://api.example.com/v1', 'url'],
                  ['model', copy.modelName, 'model-name', 'text'],
                  ['apiKey', copy.apiKey, copy.keyPlaceholder, 'password'],
                ] as const
              ).map(([key, label, placeholder, type]) => (
                <label key={key} className="grid gap-1.5 text-[12px] font-medium">
                  {label}
                  <input
                    type={type}
                    dir={key === 'name' ? 'auto' : 'ltr'}
                    value={form[key]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    placeholder={
                      key === 'apiKey' &&
                      editingId &&
                      models.find((item) => item.id === editingId)?.hasKey
                        ? copy.keepKeyPlaceholder
                        : placeholder
                    }
                    required={key !== 'apiKey'}
                    maxLength={key === 'name' ? 60 : key === 'model' ? 120 : undefined}
                    autoComplete={key === 'apiKey' ? 'off' : undefined}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-4 text-muted-foreground">{copy.localDetails}</p>
            {dialogStatus && (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 text-[12px] text-muted-foreground"
              >
                {dialogStatus}
              </p>
            )}
            <DialogFooter className="mt-4 items-center">
              {editingId && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deleteModel}
                    disabled={dialogBusy}
                    className="text-destructive sm:me-auto"
                  >
                    {copy.delete}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testModel}
                    disabled={dialogBusy}
                  >
                    {copy.testConnection}
                  </Button>
                </>
              )}
              <Button type="submit" size="sm" disabled={dialogBusy}>
                {dialogBusy ? copy.saving : copy.saveModel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
