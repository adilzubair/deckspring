import config from 'virtual:deckspring/config';
import { Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { pad2 } from '@/lib/utils';
import { SystemViewIcon } from '../components/sidebar/folder-item';
import { studioApi, studioError } from '../components/studio/studio-api';
import { ThemeDetail } from '../components/themes/theme-detail';
import { ThemeEditor } from '../components/themes/theme-editor';
import { ThemesGallery } from '../components/themes/themes-gallery';
import { themes as themeRegistry } from '../lib/themes';

export function ThemesGalleryPage() {
  const navigate = useNavigate();
  const t = useLocale();
  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <SystemViewIcon kind="themes" className="text-muted-foreground" />
          <h1 className="font-heading text-[19px] font-semibold leading-none tracking-[-0.015em] md:text-[21px]">
            {t.themes.title}
          </h1>
          <span className="folio ml-0.5">{pad2(themeRegistry.length)}</span>
        </div>
        {config.studio && (
          <Button variant="brand" onClick={() => navigate('/themes/new')}>
            <Plus />
            {t.themes.createTheme}
          </Button>
        )}
      </header>
      <ThemesGallery
        onOpen={(id) => navigate(`/themes/${encodeURIComponent(id)}`)}
        onCreate={config.studio ? () => navigate('/themes/new') : undefined}
      />
    </>
  );
}

export function ThemeDetailPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const t = useLocale();
  if (!themeId) return null;
  const theme = themeRegistry.find((candidate) => candidate.id === themeId);

  const repair = async () => {
    try {
      await studioApi('POST', `/themes/${encodeURIComponent(themeId)}/repair`, {});
      toast.success(t.themes.repairComplete);
      window.location.reload();
    } catch (caught) {
      toast.error(studioError(caught));
    }
  };

  const remove = async () => {
    const response = await studioApi<{ usedBy: string[] }>(
      'GET',
      `/themes/${encodeURIComponent(themeId)}`,
    ).catch(() => ({ usedBy: [] }));
    if (
      !window.confirm(t.themes.deleteConfirm.replace('{count}', String(response.usedBy.length)))
    ) {
      return;
    }
    try {
      await studioApi('DELETE', `/themes/${encodeURIComponent(themeId)}`);
      toast.success(t.themes.deleteComplete);
      navigate('/themes');
    } catch (caught) {
      toast.error(studioError(caught));
    }
  };

  return (
    <ThemeDetail
      themeId={themeId}
      onBack={() => navigate('/themes')}
      studioActions={
        config.studio
          ? {
              editLabel: theme?.studioReady ? t.themes.editTheme : t.themes.importIntoStudio,
              onEdit: () => navigate(`/themes/${encodeURIComponent(themeId)}/edit`),
              onDuplicate: theme?.studioReady
                ? () => navigate(`/themes/new?duplicate=${encodeURIComponent(themeId)}`)
                : undefined,
              onRepair: theme?.studioReady ? repair : undefined,
              onDelete: remove,
            }
          : undefined
      }
    />
  );
}

export function ThemeCreatePage() {
  return <ThemeEditor />;
}

export function ThemeEditPage() {
  const { themeId } = useParams<{ themeId: string }>();
  return themeId ? <ThemeEditor themeId={themeId} /> : null;
}
