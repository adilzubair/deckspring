import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/use-locale';
import { SlidePageProvider } from '../../lib/page-context';
import { slideIds } from '../../lib/slides';
import type { ThemeSpecV1 } from '../../lib/themes';
import { SlideCanvas } from '../slide-canvas';
import { isMissingStudioRoute, studioApi, studioError } from '../studio/studio-api';
import { studioCopy } from '../studio/studio-copy';
import { modelIsReady, useStudioModels } from '../studio/studio-models';

const inputClass =
  'h-10 w-full rounded-[6px] border border-input bg-background px-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-foreground/30 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground';
const fieldClass = 'h-10 px-3 text-[14px]';
const fieldTextareaClass = 'min-h-24 resize-y px-3 py-2.5 text-[14px]';

type ThemeResponse = {
  id: string;
  spec: ThemeSpecV1 | null;
  markdown: string;
  hasDemo: boolean;
  usedBy: string[];
};

export function ThemeEditor({ themeId }: { themeId?: string }) {
  const locale = useLocale();
  const copy = studioCopy[locale.id];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duplicateId = themeId ? null : searchParams.get('duplicate');
  const {
    models,
    loading: modelsLoading,
    selectedId,
    selected,
    choose,
    openManager,
  } = useStudioModels();
  const [sourceMode, setSourceMode] = useState<'prompt' | 'slide'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [slideId, setSlideId] = useState(slideIds[0] ?? '');
  const [spec, setSpec] = useState<ThemeSpecV1 | null>(null);
  const [id, setId] = useState(themeId ?? '');
  const [legacy, setLegacy] = useState(false);
  const [loading, setLoading] = useState(Boolean(themeId || duplicateId));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  );

  useEffect(() => {
    const sourceId = themeId ?? duplicateId;
    if (!sourceId) return;
    let cancelled = false;
    studioApi<ThemeResponse>('GET', `/themes/${encodeURIComponent(sourceId)}`)
      .then((result) => {
        if (cancelled) return;
        if (result.spec) {
          setSpec(duplicateId ? { ...result.spec, name: `${result.spec.name} Copy` } : result.spec);
          if (duplicateId) {
            setId(`${sourceId}-copy`.slice(0, 64));
            setDirty(true);
          }
        } else {
          setLegacy(true);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(studioError(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [themeId, duplicateId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const leave = () => {
    navigate(themeId ? `/themes/${encodeURIComponent(themeId)}` : '/themes');
  };

  const generateDraft = async () => {
    if (!selected) {
      openManager();
      setError(copy.themeSourceRequired);
      return;
    }
    if (!modelIsReady(selected)) {
      openManager(selected);
      setError(copy.enterKey);
      return;
    }
    const importId = themeId ?? duplicateId;
    const source =
      legacy && importId
        ? { kind: 'theme', themeId: importId }
        : sourceMode === 'slide'
          ? { kind: 'slide', slideId }
          : { kind: 'prompt', prompt };
    setGenerating(true);
    setError('');
    try {
      const result = await studioApi<{ spec: ThemeSpecV1; suggestedId: string }>(
        'POST',
        '/themes/propose',
        { modelId: selectedId, source },
      );
      setSpec(result.spec);
      if (!themeId) setId((current) => current || result.suggestedId);
      setLegacy(false);
      setDirty(true);
    } catch (caught) {
      setError(
        isMissingStudioRoute(caught)
          ? copy.themeServerRestart
          : studioError(caught) || copy.themeDraftFailed,
      );
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!spec) return;
    setSaving(true);
    setError('');
    try {
      const result = await studioApi<{ url: string }>(
        themeId ? 'PUT' : 'POST',
        themeId ? `/themes/${encodeURIComponent(themeId)}` : '/themes',
        themeId ? { spec } : { id, spec },
      );
      dirtyRef.current = false;
      setDirty(false);
      window.location.assign(result.url);
    } catch (caught) {
      setError(studioError(caught) || copy.themeSaveFailed);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-start gap-4 border-b border-hairline pb-6">
        <Button type="button" variant="ghost" size="sm" className="-ms-2" onClick={leave}>
          <ArrowLeft className="rtl:rotate-180" />
          {copy.themeBack}
        </Button>
        <div className="basis-full md:ms-0 md:basis-auto md:flex-1">
          <h1 className="font-heading text-[24px] font-semibold tracking-[-0.025em]">
            {themeId ? copy.themeEditTitle : copy.themeCreateTitle}
          </h1>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            {copy.themeCreateDescription}
          </p>
        </div>
        {spec && (
          <Button
            type="button"
            variant="brand"
            disabled={saving || (!themeId && !id)}
            onClick={save}
          >
            {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Save />}
            {saving ? copy.themeSaving : copy.themeSave}
          </Button>
        )}
      </header>

      {!spec ? (
        <ThemeSource
          copy={copy}
          legacy={legacy}
          sourceMode={sourceMode}
          setSourceMode={setSourceMode}
          prompt={prompt}
          setPrompt={(value) => {
            setPrompt(value);
            setDirty(true);
          }}
          slideId={slideId}
          setSlideId={setSlideId}
          models={models}
          modelsLoading={modelsLoading}
          selectedId={selectedId}
          selected={selected}
          choose={choose}
          openManager={openManager}
          generating={generating}
          generateDraft={generateDraft}
        />
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="order-2 min-w-0 xl:order-1">
            <ThemeFields
              copy={copy}
              spec={spec}
              id={id}
              idLocked={Boolean(themeId)}
              onId={(value) => {
                setId(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                setDirty(true);
              }}
              onChange={(next) => {
                setSpec(next);
                setDirty(true);
              }}
            />
          </div>
          <div className="order-1 min-w-0 xl:sticky xl:top-8 xl:order-2">
            <p className="mb-3 text-[13px] font-medium text-muted-foreground">
              {copy.themePreview}
            </p>
            <ThemeDraftPreview spec={spec} copy={copy} rtl={locale.id === 'ar'} />
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-[6px] border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13.5px] text-destructive"
        >
          {error}
        </p>
      )}
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.themeUnsavedConfirm}</DialogTitle>
            <DialogDescription>{copy.themeUnsavedDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => blocker.reset?.()}>
              {copy.cancel}
            </Button>
            <Button type="button" variant="destructive" onClick={() => blocker.proceed?.()}>
              {copy.themeDiscard}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ThemeSource({
  copy,
  legacy,
  sourceMode,
  setSourceMode,
  prompt,
  setPrompt,
  slideId,
  setSlideId,
  models,
  modelsLoading,
  selectedId,
  selected,
  choose,
  openManager,
  generating,
  generateDraft,
}: {
  copy: (typeof studioCopy)['en'] | (typeof studioCopy)['ar'];
  legacy: boolean;
  sourceMode: 'prompt' | 'slide';
  setSourceMode: (value: 'prompt' | 'slide') => void;
  prompt: string;
  setPrompt: (value: string) => void;
  slideId: string;
  setSlideId: (value: string) => void;
  models: ReturnType<typeof useStudioModels>['models'];
  modelsLoading: boolean;
  selectedId: string;
  selected: ReturnType<typeof useStudioModels>['selected'];
  choose: (value: string) => void;
  openManager: ReturnType<typeof useStudioModels>['openManager'];
  generating: boolean;
  generateDraft: () => void;
}) {
  return (
    <Card className="mx-auto w-full max-w-3xl gap-0 rounded-[8px] py-0 shadow-edge">
      <CardContent className="px-5 py-6 md:px-6">
        {legacy ? (
          <div className="mb-6">
            <h2 className="font-heading text-[19px] font-semibold">{copy.themeImportTitle}</h2>
            <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {copy.themeImportDescription}
            </p>
          </div>
        ) : (
          <>
            <Tabs
              value={sourceMode}
              onValueChange={(value) => setSourceMode(value as 'prompt' | 'slide')}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="prompt">{copy.themeDescribe}</TabsTrigger>
                <TabsTrigger value="slide">{copy.themeExtract}</TabsTrigger>
              </TabsList>
            </Tabs>
            {sourceMode === 'prompt' ? (
              <label htmlFor="theme-source-prompt" className="grid gap-2 text-[14px] font-medium">
                {copy.themePromptLabel}
                <Textarea
                  id="theme-source-prompt"
                  dir="auto"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  minLength={10}
                  maxLength={4000}
                  rows={6}
                  placeholder={copy.themePromptPlaceholder}
                  className={fieldTextareaClass}
                />
              </label>
            ) : (
              <label className="grid gap-2 text-[14px] font-medium">
                {copy.themeDeckLabel}
                <select
                  value={slideId}
                  onChange={(event) => setSlideId(event.target.value)}
                  className={inputClass}
                >
                  {slideIds.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-hairline pt-6">
          <label className="grid min-w-64 flex-1 gap-2 text-[14px] font-medium">
            {copy.themeModelLabel}
            <select
              value={selectedId}
              onChange={(event) => choose(event.target.value)}
              disabled={modelsLoading || models.length === 0}
              className={inputClass}
            >
              {models.length === 0 && <option value="">{copy.noModels}</option>}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.model}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={() => openManager()}>
            {copy.addModel}
          </Button>
          {selected && (
            <Button type="button" variant="outline" onClick={() => openManager(selected)}>
              {copy.editModel}
            </Button>
          )}
          <Button type="button" variant="brand" disabled={generating} onClick={generateDraft}>
            {generating ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Sparkles />
            )}
            {generating
              ? copy.themeGeneratingDraft
              : legacy
                ? copy.themeImportAction
                : copy.themeGenerateDraft}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemeFields({
  copy,
  spec,
  id,
  idLocked,
  onId,
  onChange,
}: {
  copy: (typeof studioCopy)['en'] | (typeof studioCopy)['ar'];
  spec: ThemeSpecV1;
  id: string;
  idLocked: boolean;
  onId: (value: string) => void;
  onChange: (spec: ThemeSpecV1) => void;
}) {
  const sectionClass = 'border-t border-hairline pt-5 first:border-t-0 first:pt-0';
  return (
    <div className="grid min-w-0 gap-6">
      <section className={sectionClass}>
        <h2 className="mb-4 font-heading text-[16px] font-semibold">{copy.themeIdentity}</h2>
        <div className="grid gap-4">
          <Field label={copy.themeName}>
            <Input
              value={spec.name}
              dir="auto"
              maxLength={80}
              onChange={(event) => onChange({ ...spec, name: event.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label={copy.themeId} hint={copy.themeIdHelp}>
            <Input
              value={id}
              dir="ltr"
              disabled={idLocked}
              maxLength={64}
              onChange={(event) => onId(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label={copy.themeDescription}>
            <Textarea
              value={spec.description}
              dir="auto"
              maxLength={180}
              rows={3}
              onChange={(event) => onChange({ ...spec, description: event.target.value })}
              className={fieldTextareaClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={copy.themeMode}
              value={spec.mode}
              onChange={(value) => onChange({ ...spec, mode: value as ThemeSpecV1['mode'] })}
              options={[
                ['light', copy.themeLight],
                ['dark', copy.themeDark],
              ]}
            />
            <SelectField
              label={copy.themeMotion}
              value={spec.motion}
              onChange={(value) => onChange({ ...spec, motion: value as ThemeSpecV1['motion'] })}
              options={[
                ['static', copy.themeStatic],
                ['subtle', copy.themeSubtle],
                ['rich', copy.themeRich],
              ]}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 font-heading text-[16px] font-semibold">{copy.themePalette}</h2>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['background', copy.themeBackground],
              ['text', copy.themeText],
              ['accent', copy.themeAccent],
              ['muted', copy.themeMuted],
              ['surface', copy.themeSurface],
              ['border', copy.themeBorder],
            ] as const
          ).map(([key, label]) => (
            <ColorField
              key={key}
              label={label}
              value={spec.palette[key]}
              onChange={(value) =>
                onChange({ ...spec, palette: { ...spec.palette, [key]: value } })
              }
            />
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 font-heading text-[16px] font-semibold">{copy.themeTypography}</h2>
        <div className="grid gap-3">
          <Field label={copy.themeDisplayFont}>
            <Input
              value={spec.typography.display}
              onChange={(event) =>
                onChange({
                  ...spec,
                  typography: { ...spec.typography, display: event.target.value },
                })
              }
              className={fieldClass}
            />
          </Field>
          <Field label={copy.themeBodyFont}>
            <Input
              value={spec.typography.body}
              onChange={(event) =>
                onChange({ ...spec, typography: { ...spec.typography, body: event.target.value } })
              }
              className={fieldClass}
            />
          </Field>
          <Field label={copy.themeMonoFont}>
            <Input
              value={spec.typography.mono}
              onChange={(event) =>
                onChange({ ...spec, typography: { ...spec.typography, mono: event.target.value } })
              }
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={copy.themeHeadingWeight}
              value={spec.typography.headingWeight}
              min={400}
              max={900}
              step={100}
              onChange={(value) =>
                onChange({ ...spec, typography: { ...spec.typography, headingWeight: value } })
              }
            />
            <NumberField
              label={copy.themeBodyWeight}
              value={spec.typography.bodyWeight}
              min={300}
              max={700}
              step={100}
              onChange={(value) =>
                onChange({ ...spec, typography: { ...spec.typography, bodyWeight: value } })
              }
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 font-heading text-[16px] font-semibold">{copy.themeComposition}</h2>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={copy.themeLayout}
            value={spec.layout.composition}
            onChange={(value) =>
              onChange({
                ...spec,
                layout: {
                  ...spec.layout,
                  composition: value as ThemeSpecV1['layout']['composition'],
                },
              })
            }
            options={[
              ['editorial', copy.themeEditorial],
              ['modular', copy.themeModular],
              ['split', copy.themeSplit],
              ['poster', copy.themePoster],
            ]}
          />
          <SelectField
            label={copy.themeAlignment}
            value={spec.layout.alignment}
            onChange={(value) =>
              onChange({
                ...spec,
                layout: { ...spec.layout, alignment: value as ThemeSpecV1['layout']['alignment'] },
              })
            }
            options={[
              ['left', copy.themeLeft],
              ['center', copy.themeCenter],
            ]}
          />
          <NumberField
            label={copy.themePadding}
            value={spec.layout.padding}
            min={64}
            max={180}
            step={4}
            onChange={(value) => onChange({ ...spec, layout: { ...spec.layout, padding: value } })}
          />
          <NumberField
            label={copy.themeRadius}
            value={spec.layout.radius}
            min={0}
            max={48}
            step={2}
            onChange={(value) => onChange({ ...spec, layout: { ...spec.layout, radius: value } })}
          />
          <SelectField
            label={copy.themeMotif}
            value={spec.motif}
            onChange={(value) => onChange({ ...spec, motif: value as ThemeSpecV1['motif'] })}
            options={[
              ['line', copy.themeLine],
              ['block', copy.themeBlock],
              ['dot', copy.themeDot],
              ['frame', copy.themeFrame],
              ['glow', copy.themeGlow],
              ['pixel', copy.themePixel],
            ]}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <Field label={copy.themeAesthetic}>
          <Textarea
            value={spec.aesthetic}
            dir="auto"
            maxLength={900}
            rows={6}
            onChange={(event) => onChange({ ...spec, aesthetic: event.target.value })}
            className={fieldTextareaClass}
          />
        </Field>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-label'?: string }>, { 'aria-label': label })
    : children;
  return (
    <div className="grid gap-1.5 text-[13px] font-medium">
      <span>{label}</span>
      {control}
      {hint && (
        <span className="text-[11.5px] font-normal leading-4 text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map(([option, name]) => (
          <option key={option} value={option}>
            {name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className={fieldClass}
      />
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex h-10 items-center gap-2 rounded-[6px] border border-input bg-background px-2 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/20">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          aria-label={`${label} hex`}
          dir="ltr"
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none"
        />
      </div>
    </Field>
  );
}

function ThemeDraftPreview({
  spec,
  copy,
  rtl,
}: {
  spec: ThemeSpecV1;
  copy: (typeof studioCopy)['en'] | (typeof studioCopy)['ar'];
  rtl: boolean;
}) {
  const [page, setPage] = useState(0);
  const [replay, setReplay] = useState(0);
  const [animate, setAnimate] = useState(false);
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-[8px] border border-hairline bg-card shadow-floating ring-1 ring-foreground/[0.05]">
        <SlideCanvas flat freezeMotion={!animate}>
          <SlidePageProvider index={page} total={3}>
            <PreviewPage
              key={`${page}-${replay}`}
              spec={spec}
              page={page}
              copy={copy}
              rtl={rtl}
              animate={animate}
            />
          </SlidePageProvider>
        </SlideCanvas>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={copy.themePreviewPrevious}
          disabled={page === 0}
          onClick={() => {
            setAnimate(true);
            setPage((value) => Math.max(0, value - 1));
          }}
        >
          <ChevronLeft className={rtl ? 'rotate-180' : undefined} />
        </Button>
        <span className="folio" dir="ltr">
          {page + 1} / 3
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={copy.themePreviewReplay}
          onClick={() => {
            setAnimate(true);
            setReplay((value) => value + 1);
          }}
        >
          <RotateCcw /> {copy.themePreviewReplay}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={copy.themePreviewNext}
          disabled={page === 2}
          onClick={() => {
            setAnimate(true);
            setPage((value) => Math.min(2, value + 1));
          }}
        >
          <ChevronRight className={rtl ? 'rotate-180' : undefined} />
        </Button>
      </div>
    </div>
  );
}

function PreviewPage({
  spec,
  page,
  copy,
  rtl,
  animate,
}: {
  spec: ThemeSpecV1;
  page: number;
  copy: (typeof studioCopy)['en'] | (typeof studioCopy)['ar'];
  rtl: boolean;
  animate: boolean;
}) {
  const p = spec.palette;
  const align = spec.layout.alignment === 'center' ? 'center' : rtl ? 'flex-end' : 'flex-start';
  const base: CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    padding: spec.layout.padding,
    background: p.background,
    color: p.text,
    fontFamily: spec.typography.body,
    direction: rtl ? 'rtl' : 'ltr',
    textAlign: spec.layout.alignment === 'center' ? 'center' : rtl ? 'right' : 'left',
    display: 'flex',
    flexDirection: 'column',
  };
  return (
    <div
      className="studio-theme-preview-motion"
      style={{
        ...base,
        animation:
          animate && spec.motion !== 'static'
            ? `studio-theme-preview-${spec.motion} ${spec.motion === 'rich' ? 780 : 480}ms cubic-bezier(0.22, 1, 0.36, 1) both`
            : undefined,
      }}
    >
      <style>{`@keyframes studio-theme-preview-subtle { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes studio-theme-preview-rich { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .studio-theme-preview-motion { animation: none !important; } }`}</style>
      <PreviewMark spec={spec} rtl={rtl} />
      {page === 1 ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <PreviewEyebrow spec={spec}>{copy.themePreviewLanguage}</PreviewEyebrow>
          <h2
            style={{
              margin: '28px 0 0',
              fontFamily: spec.typography.display,
              fontSize: 72,
              lineHeight: 1.08,
            }}
          >
            {copy.themePreviewHeading}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                spec.layout.composition === 'split' ? '1fr 1fr' : 'repeat(3, 1fr)',
              gap: 24,
              marginTop: 54,
            }}
          >
            {copy.themePreviewPrinciples.map((label, index) => (
              <div
                key={label}
                style={{
                  minHeight: 220,
                  padding: 30,
                  borderRadius: spec.layout.radius,
                  background: p.surface,
                  border: `2px solid ${index === 0 ? p.accent : p.border}`,
                }}
              >
                <div
                  dir="ltr"
                  style={{ color: p.accent, fontFamily: spec.typography.mono, fontSize: 20 }}
                >
                  0{index + 1}
                </div>
                <div
                  style={{
                    marginTop: 50,
                    fontFamily: spec.typography.display,
                    fontSize: 38,
                    fontWeight: spec.typography.headingWeight,
                  }}
                >
                  {label}
                </div>
                <p style={{ color: p.muted, fontSize: 24, lineHeight: 1.4 }}>
                  {copy.themePreviewPrincipleBody}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 'auto 0',
            alignSelf: align,
            display: 'grid',
            justifyItems: align,
            gap: 30,
          }}
        >
          <PreviewEyebrow spec={spec}>
            {page === 0 ? copy.themePreviewSpecimen : copy.themePreviewReady}
          </PreviewEyebrow>
          <h1
            style={{
              margin: 0,
              maxWidth: 1460,
              fontFamily: spec.typography.display,
              fontSize: 128,
              fontWeight: spec.typography.headingWeight,
              lineHeight: 1.02,
              letterSpacing: rtl ? 0 : '-0.045em',
            }}
          >
            {page === 0 ? spec.name : copy.themePreviewCloser}
          </h1>
          <p style={{ margin: 0, maxWidth: 1120, color: p.muted, fontSize: 34, lineHeight: 1.35 }}>
            {page === 0 ? spec.description : spec.aesthetic}
          </p>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: spec.layout.padding,
          right: spec.layout.padding,
          bottom: 54,
          display: 'flex',
          justifyContent: 'space-between',
          color: p.muted,
          fontFamily: spec.typography.mono,
          fontSize: 22,
        }}
      >
        <span>{spec.name}</span>
        <span dir="ltr">{page + 1} / 3</span>
      </div>
    </div>
  );
}

function PreviewEyebrow({ spec, children }: { spec: ThemeSpecV1; children: ReactNode }) {
  return (
    <div
      style={{
        color: spec.palette.accent,
        fontFamily: spec.typography.mono,
        fontSize: 22,
        letterSpacing: '0.14em',
      }}
    >
      {children}
    </div>
  );
}

function PreviewMark({ spec, rtl }: { spec: ThemeSpecV1; rtl: boolean }) {
  const p = spec.palette;
  if (spec.motif === 'pixel')
    return (
      <div
        style={{
          position: 'absolute',
          [rtl ? 'left' : 'right']: 100,
          top: 100,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 54px)',
          gap: 6,
          transform: 'rotate(-9deg)',
        }}
      >
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((slot, index) => (
          <div
            key={slot}
            style={{
              width: 54,
              height: 54,
              background: index % 4 === 0 ? p.accent : p.surface,
              boxShadow: `inset 5px 5px 0 ${p.border}, inset -5px -5px 0 #00000066`,
            }}
          />
        ))}
      </div>
    );
  if (spec.motif === 'glow')
    return (
      <div
        style={{
          position: 'absolute',
          width: 760,
          height: 760,
          [rtl ? 'left' : 'right']: -180,
          top: -250,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${p.accent}55, transparent 68%)`,
        }}
      />
    );
  if (spec.motif === 'frame')
    return (
      <div
        style={{
          position: 'absolute',
          inset: 42,
          border: `3px solid ${p.border}`,
          borderRadius: spec.layout.radius,
        }}
      />
    );
  if (spec.motif === 'dot')
    return (
      <div
        style={{
          position: 'absolute',
          [rtl ? 'left' : 'right']: spec.layout.padding,
          top: spec.layout.padding,
          width: 74,
          height: 74,
          borderRadius: '50%',
          background: p.accent,
        }}
      />
    );
  if (spec.motif === 'block')
    return (
      <div
        style={{
          position: 'absolute',
          [rtl ? 'left' : 'right']: 0,
          top: 0,
          width: 360,
          height: '100%',
          background: p.surface,
        }}
      />
    );
  return (
    <div
      style={{
        position: 'absolute',
        left: spec.layout.padding,
        right: spec.layout.padding,
        top: spec.layout.padding,
        height: 8,
        background: p.accent,
      }}
    />
  );
}
