import { ArrowUpRight, Check, KeyRound, Loader2, Plus, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { themes } from '../../lib/themes';
import { isLocalModel, studioApi, studioError } from './studio-api';
import { studioCopy } from './studio-copy';
import { modelIsReady, useStudioModels } from './studio-models';
import { type StudioMotion, StudioMotionControls } from './studio-motion';
import { StudioSelect } from './studio-select';

const PENDING_GENERATION_KEY = 'studio:pending-generation';

export function StudioPanel() {
  const locale = useLocale();
  const copy = studioCopy[locale.id];
  const {
    models,
    loading: modelsLoading,
    error: modelsError,
    selectedId,
    selected,
    choose,
    openManager,
  } = useStudioModels();
  const [prompt, setPrompt] = useState('');
  const [pageCount, setPageCount] = useState(6);
  const [style, setStyle] = useState('builtin:cobalt');
  const [motion, setMotion] = useState<StudioMotion>({
    entrance: 'theme',
    transition: 'theme',
    revealBullets: false,
  });
  const [deckLanguage, setDeckLanguage] = useState<'en' | 'ar'>(locale.id);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);

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
        setStatus(`${copy.resumeError}: ${studioError(caught)}`);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [copy.generationFailed, copy.resumeError, copy.writingDeck]);

  useEffect(() => setDeckLanguage(locale.id), [locale.id]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError(true);
      setStatus(copy.chooseModel);
      return;
    }
    if (!modelIsReady(selected)) {
      openManager(selected);
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
        style: style.startsWith('theme:')
          ? { kind: 'theme', id: style.slice('theme:'.length) }
          : { kind: 'builtin', id: style.slice('builtin:'.length) },
        motion,
        language: deckLanguage,
      });
      window.location.assign(deck.url);
    } catch (caught) {
      sessionStorage.removeItem(PENDING_GENERATION_KEY);
      setError(true);
      setStatus(studioError(caught));
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
            <h2 className="font-heading text-[17px] font-semibold tracking-[-0.015em]">
              {copy.createTitle}
            </h2>
            <p className="mt-0.5 text-[13.5px] text-muted-foreground">{copy.createDescription}</p>
          </div>
        </div>
        <span className="eyebrow mt-1">{copy.localWorkspace}</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={generate} className="min-w-0 p-5 md:p-6">
          <label htmlFor="studio-prompt" className="text-[14px] font-medium">
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
            className="mt-2 block min-h-32 w-full resize-y rounded-[6px] border border-input bg-background px-3 py-2.5 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-foreground/30 focus:ring-2 focus:ring-ring/20"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <span className="me-1">{copy.try}</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-7 text-[12.5px]"
              onClick={() => setPrompt(copy.productPrompt)}
            >
              {copy.productLaunch}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-7 text-[12.5px]"
              onClick={() => setPrompt(copy.investorPrompt)}
            >
              {copy.investorUpdate}
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="grid min-w-28 gap-1.5 text-[14px] font-medium">
              <span>{copy.pages}</span>
              <StudioSelect
                label={copy.pages}
                value={String(pageCount)}
                onValueChange={(value) => setPageCount(Number(value))}
                options={[4, 6, 8, 10, 12].map((count) => ({
                  value: String(count),
                  label: `${count} ${copy.pageUnit}`,
                }))}
              />
            </div>
            <div className="grid min-w-32 gap-1.5 text-[14px] font-medium">
              <span>{copy.visualStyle}</span>
              <StudioSelect
                label={copy.visualStyle}
                value={style}
                onValueChange={setStyle}
                groups={[
                  ...(themes.some((theme) => theme.studioReady)
                    ? [
                        {
                          label: copy.savedThemes,
                          options: themes
                            .filter((theme) => theme.studioReady)
                            .map((theme) => ({
                              value: `theme:${theme.id}`,
                              label: theme.name,
                            })),
                        },
                      ]
                    : []),
                  {
                    label: copy.quickStyles,
                    options: [
                      { value: 'builtin:cobalt', label: copy.cobalt },
                      { value: 'builtin:citrus', label: copy.citrus },
                      { value: 'builtin:evergreen', label: copy.evergreen },
                      { value: 'builtin:midnight', label: copy.midnight },
                    ],
                  },
                ]}
              />
            </div>
            <div className="grid min-w-28 gap-1.5 text-[14px] font-medium">
              <span>{copy.outputLanguage}</span>
              <StudioSelect
                label={copy.outputLanguage}
                value={deckLanguage}
                onValueChange={(value) => setDeckLanguage(value as 'en' | 'ar')}
                options={[
                  { value: 'en', label: copy.english },
                  { value: 'ar', label: copy.arabic },
                ]}
              />
            </div>
          </div>
          <StudioMotionControls
            value={motion}
            onChange={setMotion}
            themeMotion={
              themes.find((theme) => `theme:${theme.id}` === style)?.studioSpec?.motion ?? 'static'
            }
            copy={copy}
            rtl={locale.id === 'ar'}
          />
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="brand" disabled={busy} className="h-10 text-[14px]">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles />}
              {busy ? copy.generating : copy.generate}
              {!busy && <ArrowUpRight />}
            </Button>
          </div>
          {status && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-3 text-[13.5px] ${error ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {status}
            </p>
          )}
        </form>

        <div className="border-t border-border bg-sidebar/55 p-5 lg:border-t-0 lg:border-s md:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="eyebrow">{copy.models}</h3>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-7 text-[12.5px]"
              onClick={() => openManager()}
            >
              <Plus /> {copy.addModel}
            </Button>
          </div>
          <div className="mt-3 grid gap-1.5">
            {modelsLoading && (
              <p className="px-3 py-4 text-[13.5px] text-muted-foreground">{copy.loadingModels}</p>
            )}
            {!modelsLoading && models.length === 0 && (
              <p className="rounded-[6px] border border-dashed border-border px-3 py-4 text-[13.5px] leading-5 text-muted-foreground">
                {copy.noModels}
              </p>
            )}
            {models.map((model) => {
              const active = model.id === selectedId;
              return (
                <div
                  key={model.id}
                  className={`flex items-center gap-1 rounded-[6px] border px-2 py-1.5 ${active ? 'border-foreground/15 bg-background shadow-edge' : 'border-transparent hover:bg-muted/60'}`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      choose(model.id);
                      setStatus('');
                    }}
                    className="min-w-0 flex-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <span className="flex items-center gap-1.5 truncate text-[14px] font-medium">
                      {active && <Check className="size-3 shrink-0 text-brand" />}
                      {model.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                      {model.model} ·{' '}
                      {model.hasKey
                        ? copy.ready
                        : isLocalModel(model)
                          ? copy.localNoKey
                          : copy.needsKey}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 text-[12.5px]"
                    onClick={() => openManager(model)}
                    aria-label={`${copy.edit} ${model.name}`}
                  >
                    {copy.edit}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-[12.5px] leading-5 text-muted-foreground">
            <KeyRound className="mt-0.5 size-3 shrink-0" />
            {copy.keyMemory}
          </p>
          {modelsError && <p className="mt-3 text-[12.5px] text-destructive">{modelsError}</p>}
        </div>
      </div>
    </section>
  );
}
