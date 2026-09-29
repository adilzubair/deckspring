import config from 'virtual:deckspring/config';
import { Palette, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { format, useLocale } from '@/lib/use-locale';
import { SlidePageProvider } from '../../lib/page-context';
import { loadThemeDemo, type Theme, type ThemeDemoModule, themes } from '../../lib/themes';
import { SlideCanvas } from '../slide-canvas';

export function ThemesGallery({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void;
  onCreate?: () => void;
}) {
  const t = useLocale();

  if (themes.length === 0) {
    return <ThemesEmptyState onCreate={onCreate} />;
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-9 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
      {themes.map((theme, i) => (
        <li
          key={theme.id}
          className="rise-in"
          style={{ animationDelay: `${Math.min(i, 11) * 30}ms` }}
        >
          <ThemeCard
            theme={theme}
            onOpen={() => onOpen(theme.id)}
            ariaLabel={format(t.themes.openThemeAria, { name: theme.name })}
          />
        </li>
      ))}
    </ul>
  );
}

function ThemeCard({
  theme,
  onOpen,
  ariaLabel,
}: {
  theme: Theme;
  onOpen: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group block w-full rounded-[6px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-video overflow-hidden rounded-[6px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04] group-hover:shadow-floating group-hover:ring-foreground/20 group-active:scale-[0.99] motion-safe:transition-[box-shadow,--tw-ring-color,scale] motion-safe:duration-200">
        <ThemePreview theme={theme} />
      </div>
      <div className="mt-3">
        <h3 className="min-w-0 truncate font-heading text-[16px] font-medium tracking-tight">
          {theme.name}
        </h3>
      </div>
      {theme.description ? (
        <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-muted-foreground">
          {theme.description}
        </p>
      ) : null}
    </button>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  const t = useLocale();
  const demo = useThemeDemo(theme);

  if (!theme.hasDemo) {
    return <NoDemoState />;
  }
  if (!demo) {
    return (
      <div className="grid h-full w-full place-items-center text-[12px] tracking-[0.08em] uppercase text-muted-foreground/60">
        {t.common.loading}
      </div>
    );
  }
  const FirstPage = demo.default[0];
  if (!FirstPage) return <NoDemoState />;

  return (
    <div className="h-full w-full">
      <SlideCanvas flat freezeMotion design={demo.design}>
        <SlidePageProvider index={0} total={demo.default.length}>
          <FirstPage />
        </SlidePageProvider>
      </SlideCanvas>
    </div>
  );
}

function NoDemoState() {
  const t = useLocale();
  return (
    <div className="grid h-full w-full place-items-center bg-muted/40 px-6 text-center">
      <div>
        <p className="font-heading text-[14px] font-semibold tracking-tight text-foreground/80">
          {t.themes.noDemoYet}
        </p>
        {config.studio ? (
          <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
            {t.themes.studioNoDemoHint}
          </p>
        ) : (
          <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
            {t.themes.noDemoHintPrefix}
            <code className="rounded-[3px] bg-card px-1 py-0.5 font-mono text-[12px] text-foreground">
              /create-theme
            </code>
            {t.themes.noDemoHintSuffix}
          </p>
        )}
      </div>
    </div>
  );
}

function ThemesEmptyState({ onCreate }: { onCreate?: () => void }) {
  const t = useLocale();
  return (
    <div className="rounded-[8px] border border-dashed border-border px-8 py-20">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Palette className="size-5 text-muted-foreground/60" aria-hidden />
        <p className="mt-4 font-heading text-[16px] font-semibold tracking-tight">
          {t.themes.noThemesTitle}
        </p>
        {config.studio ? (
          <>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t.themes.studioEmptyHint}
            </p>
            {onCreate && (
              <Button variant="brand" className="mt-5" onClick={onCreate}>
                <Plus />
                {t.themes.createTheme}
              </Button>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {t.themes.noThemesHintPrefix}
            <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              /create-theme
            </code>
            {t.themes.noThemesHintSuffix}
          </p>
        )}
      </div>
    </div>
  );
}

function useThemeDemo(theme: Theme): ThemeDemoModule | null {
  const [demo, setDemo] = useState<ThemeDemoModule | null>(null);
  useEffect(() => {
    if (!theme.hasDemo) {
      setDemo(null);
      return;
    }
    let cancelled = false;
    loadThemeDemo(theme.id)
      .then((mod) => {
        if (!cancelled) setDemo(mod);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [theme.id, theme.hasDemo]);
  return demo;
}
