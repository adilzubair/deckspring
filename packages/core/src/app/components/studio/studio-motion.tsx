import { ArrowRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { studioCopy } from './studio-copy';
import { StudioSelect } from './studio-select';

export type StudioMotion = {
  entrance: 'theme' | 'static' | 'subtle' | 'rich';
  transition: 'theme' | 'cut' | 'fade' | 'rise' | 'slide';
  revealBullets: boolean;
};

type Props = {
  value: StudioMotion;
  onChange: (value: StudioMotion) => void;
  themeMotion: 'static' | 'subtle' | 'rich';
  copy: (typeof studioCopy)['en'] | (typeof studioCopy)['ar'];
  rtl: boolean;
};

export function StudioMotionControls({ value, onChange, themeMotion, copy, rtl }: Props) {
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const samplePage = page % 2;
  const entrance = value.entrance === 'theme' ? themeMotion : value.entrance;
  const transition =
    value.transition === 'theme'
      ? themeMotion === 'static'
        ? 'cut'
        : themeMotion === 'subtle'
          ? 'fade'
          : 'rise'
      : value.transition;

  const next = () => {
    if (value.revealBullets && revealed < 3) {
      setRevealed((current) => current + 1);
    } else {
      setPage((current) => current + 1);
      setRevealed(0);
    }
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[8px] border border-hairline bg-sidebar/35">
      <style>{`@keyframes studio-preview-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes studio-preview-rise { from { opacity: 0; transform: translateY(13px); } to { opacity: 1; transform: translateY(0); } }
@keyframes studio-preview-slide { from { opacity: 0; transform: translateX(var(--studio-preview-slide-start)); } to { opacity: 1; transform: translateX(0); } }
@keyframes studio-preview-gentle { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes studio-preview-expressive { from { opacity: 0; transform: translateY(17px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .studio-motion-animation { animation: none !important; } }`}</style>
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(200px,240px)]">
        <div className="min-w-0 p-4 md:p-5">
          <h3 className="font-heading text-[15px] font-semibold">{copy.motionTitle}</h3>
          <p className="mt-1 max-w-[54ch] text-[12.5px] leading-relaxed text-muted-foreground">
            {copy.motionDescription}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 text-[13px] font-medium">
              <span>{copy.motionEntrance}</span>
              <StudioSelect
                label={copy.motionEntrance}
                value={value.entrance}
                onValueChange={(entrance) =>
                  onChange({ ...value, entrance: entrance as StudioMotion['entrance'] })
                }
                options={[
                  { value: 'theme', label: copy.motionFollowTheme },
                  { value: 'static', label: copy.themeStatic },
                  { value: 'subtle', label: copy.themeSubtle },
                  { value: 'rich', label: copy.themeRich },
                ]}
              />
            </div>
            <div className="grid gap-1.5 text-[13px] font-medium">
              <span>{copy.motionBetweenPages}</span>
              <StudioSelect
                label={copy.motionBetweenPages}
                value={value.transition}
                onValueChange={(transition) =>
                  onChange({ ...value, transition: transition as StudioMotion['transition'] })
                }
                options={[
                  { value: 'theme', label: copy.motionFollowTheme },
                  { value: 'cut', label: copy.motionCut },
                  { value: 'fade', label: copy.motionFade },
                  { value: 'rise', label: copy.motionRise },
                  { value: 'slide', label: copy.motionSlide },
                ]}
              />
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-5">
            <input
              type="checkbox"
              checked={value.revealBullets}
              onChange={(event) => onChange({ ...value, revealBullets: event.target.checked })}
              className="mt-0.5 size-4 accent-brand"
            />
            <span>
              <span className="font-medium">{copy.motionRevealBullets}</span>
              <span className="block text-muted-foreground">{copy.motionRevealHelp}</span>
            </span>
          </label>
        </div>
        <div className="flex min-w-0 flex-col justify-between border-t border-hairline bg-card/70 p-4 md:border-s md:border-t-0">
          <div className="text-[12px] font-medium text-muted-foreground">{copy.motionPreview}</div>
          <div className="mt-3 aspect-video overflow-hidden rounded-[5px] border border-hairline bg-[#15243c] p-4 text-white">
            <div
              key={page}
              className="studio-motion-animation h-full"
              style={{
                ['--studio-preview-slide-start' as string]: rtl ? '-40px' : '40px',
                animation:
                  page === 0 || transition === 'cut'
                    ? undefined
                    : `studio-preview-${transition === 'slide' ? 'slide' : transition === 'rise' ? 'rise' : 'fade'} ${transition === 'slide' ? 420 : transition === 'rise' ? 360 : 260}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
              }}
            >
              <div className="text-[9px] tracking-wide text-[#A7C4ED]">
                {copy.motionPreviewPage} {samplePage + 1}
              </div>
              <div
                className="studio-motion-animation mt-2 text-[18px] font-semibold leading-tight"
                style={{
                  animation:
                    page === 0 || entrance === 'static'
                      ? undefined
                      : `studio-preview-${entrance === 'rich' ? 'expressive' : 'gentle'} ${entrance === 'rich' ? 780 : 480}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                }}
              >
                {samplePage === 0 ? copy.motionPreviewIdea : copy.motionPreviewNextIdea}
              </div>
              <div className="mt-3 grid gap-1.5">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="h-1.5 rounded-full bg-[#87AEE5]"
                    style={{
                      width: `${85 - index * 18}%`,
                      opacity: !value.revealBullets || index < revealed ? 1 : 0.18,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="xs" onClick={next}>
              {copy.motionPreviewNext} <ArrowRight className={rtl ? 'rotate-180' : undefined} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={copy.motionPreviewRestart}
              onClick={() => {
                setPage(0);
                setRevealed(0);
              }}
            >
              <RotateCcw /> {copy.motionPreviewRestart}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
