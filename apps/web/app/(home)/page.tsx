import { FAQ, faqs } from '@/components/landing/faq';
import { Features } from '@/components/landing/features';
import { Footer } from '@/components/landing/footer';
import { GetStarted } from '@/components/landing/get-started';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Nav } from '@/components/landing/nav';
import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { UsedBy } from '@/components/landing/used-by';
import { fetchGitHubStars, formatStarCount } from '@/lib/github';
import { appName, gitConfig, siteUrl } from '@/lib/shared';

const repoUrl = `https://github.com/${gitConfig.owner}/${gitConfig.repo}`;
const description =
  'Create presentations with your own AI model, edit them on a visual canvas, and keep every deck as React source on your machine.';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appName,
    url: siteUrl,
    description,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: appName,
    url: siteUrl,
    logo: `${siteUrl}/deckspring.png`,
    sameAs: [repoUrl],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: appName,
    description,
    codeRepository: repoUrl,
    programmingLanguage: 'TypeScript',
    url: siteUrl,
    license: `${repoUrl}/blob/${gitConfig.branch}/LICENSE`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: appName,
    description,
    url: siteUrl,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web, macOS, Linux, Windows',
    softwareRequirements: 'Node.js, React',
    license: `${repoUrl}/blob/${gitConfig.branch}/LICENSE`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Create a slide deck with Deckspring',
    description:
      'Clone Deckspring, connect an OpenAI-compatible model, generate a deck, then refine it in the browser.',
    supply: [
      { '@type': 'HowToSupply', name: 'Node.js 20.19+ and pnpm 10' },
      { '@type': 'HowToSupply', name: 'An OpenAI-compatible model endpoint' },
    ],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Start Studio',
        text: 'Clone the repository, run pnpm install and pnpm dev:studio, then open the local address.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Connect your model',
        text: 'Add an OpenAI-compatible model connection and describe the deck you want to create.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Edit, comment, apply',
        text: 'Edit slides visually, review AI-proposed changes, then present or export the finished deck.',
      },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  },
];

export default async function HomePage() {
  const stars = await fetchGitHubStars();
  const githubStars = stars !== null ? formatStarCount(stars) : null;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload is built from static, server-only constants
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav githubStars={githubStars} />
      <ScrollReveal />
      <main className="relative flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <UsedBy />
        <FAQ />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}
