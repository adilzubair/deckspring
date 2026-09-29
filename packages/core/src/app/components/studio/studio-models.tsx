import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
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
import { isLocalModel, type StudioModel, studioApi, studioError } from './studio-api';
import { studioCopy } from './studio-copy';

type ModelForm = { name: string; baseUrl: string; model: string; apiKey: string };
const EMPTY_FORM: ModelForm = { name: '', baseUrl: '', model: '', apiKey: '' };
const inputClass =
  'h-10 w-full rounded-[6px] border border-input bg-card px-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-foreground/30 focus:ring-2 focus:ring-ring/20';

type StudioModelsValue = {
  models: StudioModel[];
  loading: boolean;
  error: string;
  selectedId: string;
  selected: StudioModel | undefined;
  choose: (id: string) => void;
  openManager: (model?: StudioModel) => void;
  refresh: (preferredId?: string) => Promise<void>;
};

const StudioModelsContext = createContext<StudioModelsValue | null>(null);

export function StudioModelsProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const locale = useLocale();
  const copy = studioCopy[locale.id];
  const [models, setModels] = useState<StudioModel[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('studio:model') ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY_FORM);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogStatus, setDialogStatus] = useState('');

  const choose = (id: string) => {
    setSelectedId(id);
    if (id) localStorage.setItem('studio:model', id);
  };

  const refresh = async (preferredId?: string) => {
    const { models: loaded } = await studioApi<{ models: StudioModel[] }>('GET', '/models');
    setModels(loaded);
    setSelectedId((current) => {
      const next =
        preferredId && loaded.some((model) => model.id === preferredId)
          ? preferredId
          : loaded.some((model) => model.id === current)
            ? current
            : (loaded[0]?.id ?? '');
      if (next) localStorage.setItem('studio:model', next);
      return next;
    });
  };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    studioApi<{ models: StudioModel[] }>('GET', '/models')
      .then(({ models: loaded }) => {
        if (cancelled) return;
        setModels(loaded);
        setSelectedId((current) =>
          loaded.some((model) => model.id === current) ? current : (loaded[0]?.id ?? ''),
        );
      })
      .catch((caught) => {
        if (!cancelled) setError(`${copy.loadModelsError}: ${studioError(caught)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, copy.loadModelsError]);

  const openManager = (profile?: StudioModel) => {
    setEditingId(profile?.id ?? null);
    setForm({
      name: profile?.name ?? '',
      baseUrl: profile?.baseUrl ?? '',
      model: profile?.model ?? '',
      apiKey: '',
    });
    setDialogStatus('');
    setDialogOpen(true);
  };

  async function saveModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDialogBusy(true);
    setDialogStatus('');
    try {
      const { model } = await studioApi<{ model: StudioModel }>(
        editingId ? 'PUT' : 'POST',
        editingId ? `/models/${editingId}` : '/models',
        form,
      );
      await refresh(model.id);
      setDialogOpen(false);
    } catch (caught) {
      setDialogStatus(studioError(caught));
    } finally {
      setDialogBusy(false);
    }
  }

  async function deleteModel() {
    if (!editingId || !window.confirm(copy.deleteConfirm)) return;
    setDialogBusy(true);
    try {
      await studioApi('DELETE', `/models/${editingId}`);
      await refresh();
      setDialogOpen(false);
    } catch (caught) {
      setDialogStatus(studioError(caught));
    } finally {
      setDialogBusy(false);
    }
  }

  async function testModel() {
    if (!editingId) return;
    setDialogBusy(true);
    setDialogStatus(copy.contacting);
    try {
      await studioApi(
        'POST',
        `/models/${editingId}/test`,
        form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {},
      );
      setDialogStatus(copy.connectionWorks);
    } catch (caught) {
      setDialogStatus(studioError(caught));
    } finally {
      setDialogBusy(false);
    }
  }

  const value: StudioModelsValue = {
    models,
    loading,
    error,
    selectedId,
    selected: models.find((model) => model.id === selectedId),
    choose,
    openManager,
    refresh,
  };

  return (
    <StudioModelsContext.Provider value={value}>
      {children}
      {enabled && (
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
                  <label key={key} className="grid gap-1.5 text-[14px] font-medium">
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
              <p className="mt-3 text-[12.5px] leading-5 text-muted-foreground">
                {copy.localDetails}
              </p>
              {dialogStatus && (
                <p role="status" className="mt-3 text-[13.5px] text-muted-foreground">
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
      )}
    </StudioModelsContext.Provider>
  );
}

export function useStudioModels() {
  const value = useContext(StudioModelsContext);
  if (!value) throw new Error('useStudioModels must be used inside StudioModelsProvider.');
  return value;
}

export function modelIsReady(model: StudioModel | undefined) {
  return Boolean(model && (model.hasKey || isLocalModel(model)));
}
