import config from 'virtual:deckspring/config';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { StudioModelsProvider } from './components/studio/studio-models';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { useLocale } from './lib/use-locale';
import { AssetsPage } from './routes/assets';
import { Home } from './routes/home';
import { HomeShell } from './routes/home-shell';
import { Presenter } from './routes/presenter';
import { Slide } from './routes/slide';
import {
  ThemeCreatePage,
  ThemeDetailPage,
  ThemeEditPage,
  ThemesGalleryPage,
} from './routes/themes';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {config.build.showSlideBrowser && (
        <Route element={<HomeShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/themes" element={<ThemesGalleryPage />} />
          {config.studio && <Route path="/themes/new" element={<ThemeCreatePage />} />}
          {config.studio && <Route path="/themes/:themeId/edit" element={<ThemeEditPage />} />}
          <Route path="/themes/:themeId" element={<ThemeDetailPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          {config.studio && <Route path="/studio/*" element={<Navigate to="/" replace />} />}
        </Route>
      )}
      <Route path="/s/:slideId" element={<Slide />} />
      <Route path="/s/:slideId/presenter" element={<Presenter />} />
      <Route path="*" element={<NotFound />} />
    </>,
  ),
  { basename: import.meta.env.BASE_URL },
);

export function App() {
  return (
    <StudioModelsProvider enabled={Boolean(config.studio)}>
      <TooltipProvider delay={200}>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster />
    </StudioModelsProvider>
  );
}

function NotFound() {
  const t = useLocale();
  return (
    <div className="grid h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <p className="folio">{t.notFound.eyebrow}</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          {t.notFound.title}
        </h1>
      </div>
    </div>
  );
}
