import type { Metadata } from 'next'
import Link from 'next/link'
import HomeRedirect from './page-client'

export const metadata: Metadata = {
  title: 'ViralAI — Générateur de scripts TikTok, hooks viraux et idées vidéos',
  description:
    'Génère des idées vidéos TikTok, hooks viraux, scripts prêts à poster, captions et storyboard avec ViralAI. Outil IA pour créateurs de contenu, freelances et marques.',
  keywords: [
    'générateur TikTok',
    'script TikTok',
    'hook viral',
    'idée vidéo TikTok',
    'contenu viral',
    'outil IA créateur',
    'storyboard TikTok',
    'caption TikTok',
    'ViralAI',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ViralAI — Générateur de contenus viraux TikTok',
    description:
      'Idées vidéos, hooks, scripts, captions et storyboard prêts à poster pour TikTok.',
    url: '/',
    siteName: 'ViralAI',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViralAI — Générateur de contenus viraux TikTok',
    description:
      'Crée plus vite des vidéos TikTok avec des hooks, scripts et storyboards prêts à poster.',
  },
}

const features = [
  'Idées vidéos',
  'Hooks viraux',
  'Scripts TikTok',
  'Captions + hashtags',
  'Storyboard prêt à filmer',
  'Historique',
]

const steps = [
  {
    title: 'Entre ta niche',
    text: 'Décris ton univers : fitness, finance, beauté, food, voyage, business, IA…',
  },
  {
    title: 'Choisis ton angle',
    text: 'Objectif, ton, durée, type de contenu et call-to-action.',
  },
  {
    title: 'Publie plus vite',
    text: 'ViralAI te propose le sujet, le hook, le script et le plan de tournage.',
  },
]

const benefits = [
  {
    title: 'Tu sais quoi poster',
    text: 'Plus de page blanche : l’outil te donne une prochaine publication concrète.',
  },
  {
    title: 'Tu gagnes du temps',
    text: 'Idées, hooks, script, caption et angle en quelques secondes.',
  },
  {
    title: 'Tu crées plus malin',
    text: 'Les formats et structures sont pensés d’abord pour TikTok.',
  },
]

const faqs = [
  {
    q: 'À qui sert ViralAI ?',
    a: 'Aux créateurs, freelances, coachs, e-commerçants, agences et marques qui veulent publier plus régulièrement sur TikTok.',
  },
  {
    q: 'Est-ce que ViralAI fonctionne aussi pour Reels et Shorts ?',
    a: 'Oui. Les scripts et hooks sont pensés pour TikTok, mais beaucoup de structures se réutilisent facilement sur Instagram Reels et YouTube Shorts.',
  },
  {
    q: 'Que contient la version Premium ?',
    a: 'Le storyboard complet, l’analyse avancée, plus de détails stratégiques et les générations illimitées.',
  },
]

export default function Home() {
  return (
    <>
      <HomeRedirect />

      <main className="min-h-screen bg-dark-800 text-white">
        <nav className="sticky top-0 z-30 border-b border-white/10 bg-black/50 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-syne text-2xl font-bold gradient-text">
              ViralAI
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/login" className="btn-outline">
                Se connecter
              </Link>
              <Link href="/login" className="btn-primary">
                Essai gratuit
              </Link>
            </div>
          </div>
        </nav>

        <section
          className="relative overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.72), rgba(0,0,0,0.84)), url('/images/back.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red animate-pulse" />
              <span className="text-xs text-dark-200">
                Pensé pour TikTok, réutilisable sur Reels et Shorts
              </span>
            </div>

            <h1 className="max-w-5xl font-syne text-5xl font-bold leading-tight md:text-7xl">
              Générateur de <span className="gradient-text">contenus viraux</span> pour TikTok
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-dark-200 md:text-xl">
              ViralAI génère tes idées vidéos, hooks, scripts, captions et storyboards prêts à
              poster. Gagne du temps, publie plus souvent et explose ta visibilité.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="btn-primary px-8 py-4 text-base">
                Explose ta visibilité — Essai gratuit
              </Link>
              <Link href="/login" className="btn-outline px-8 py-4 text-base">
                Se connecter
              </Link>
            </div>

            <p className="mt-4 text-sm text-dark-300">3 générations offertes par jour</p>

            <div className="mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-dark-200"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-dark-800 px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {benefits.map((item) => (
              <article key={item.title} className="card p-6">
                <h2 className="mb-3 font-syne text-2xl font-bold text-dark-100">{item.title}</h2>
                <p className="text-dark-300">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center font-syne text-3xl font-bold text-dark-100 md:text-4xl">
              Comment fonctionne ViralAI
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title} className="card p-6">
                  <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-red/15 text-sm font-semibold text-brand-red">
                    {index + 1}
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-dark-100">{step.title}</h3>
                  <p className="text-dark-300">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="card p-8 text-center">
              <h2 className="font-syne text-3xl font-bold text-dark-100 md:text-4xl">
                Passe au niveau supérieur avec Premium
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-dark-300">
                Débloque le storyboard complet, l’analyse avancée, les angles gagnants et les
                générations illimitées pour publier plus vite et plus intelligemment.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  'Storyboard 6–9 vignettes',
                  'Analyse tendances',
                  'Analyse commentaires',
                  'Générations illimitées',
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-dark-700 px-3 py-1 text-xs text-dark-200"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/login" className="btn-primary px-8 py-4 text-base">
                  Commencer gratuitement
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-syne text-3xl font-bold text-dark-100">
              Questions fréquentes
            </h2>

            <div className="space-y-4">
              {faqs.map((item) => (
                <article key={item.q} className="card p-6">
                  <h3 className="mb-2 text-lg font-semibold text-dark-100">{item.q}</h3>
                  <p className="text-dark-300">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-dark-300">
          © 2026 ViralAI — Générateur de scripts TikTok, hooks viraux et idées vidéos.
        </footer>
      </main>
    </>
  )
}