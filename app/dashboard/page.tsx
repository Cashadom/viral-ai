'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore' // ✅ increment supprimé
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const NICHES = [
  'Fitness & sport',
  'Finance personnelle',
  'Cuisine healthy',
  'Entrepreneuriat',
  'Développement perso',
  'Mode & style',
  'Tech & IA',
  'Voyage',
  'Bien-être',
  'Parentalité',
]

const GOALS = ['Faire des vues', 'Gagner des abonnés', 'Vendre un produit', 'Créer de l’autorité']
const PLATFORM = 'TikTok'
const TONES = ['Éducatif', 'Storytelling', 'Drôle', 'Agressif', 'Polémique', 'Motivant']
const DURATIONS = ['15s', '30s', '45s', '60s']
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']
const CONTENT_TYPES = ['Face cam', 'B-roll + voix off', 'Liste', 'Storytime', 'Tutoriel', 'Opinion']
const CTAS = ['Suivre le compte', 'Commenter', 'DM', 'Télécharger', 'Acheter', 'Aucun CTA fort']

// ============ TYPES ============

interface TrendingVideo {
  title: string
  creator: string
  views: string
  hook: string
  format: string
  whyItWorks: string
}

interface CommentInsight {
  sentiment: string
  recurringQuestions: string
  objections: string
  emotionalTriggers: string
  vocabulary: string
}

interface ScoreBreakdown {
  hook: string
  retention: string
  cta: string
  trendFit: string
}

interface StoryboardFrame {
  step: string
  text: string
  visual: string
  emotion: string
}

interface GenerationResult {
  ideas: string
  hooks: string
  script: string
  caption: string
  viralScore: string
  templateUsed: string
  templateBreakdown: string
  recommendedFormat: string
  winningPatterns: string
  marketInsights: string
  contentAngles: string
  nextPostPlan: string
  storyboard: StoryboardFrame[]
  videosAnalyzed: TrendingVideo[]
  commentsAnalysis: CommentInsight
  scoreBreakdown: ScoreBreakdown
}

// ============ COMPOSANT PRINCIPAL ============

export default function Dashboard() {
  const { user, userPlan, loading, signOut, refreshUserPlan } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const [niche, setNiche] = useState('')
  const [goal, setGoal] = useState(GOALS[0])
  const [tone, setTone] = useState(TONES[0])
  const [duration, setDuration] = useState(DURATIONS[1])
  const [audienceLevel, setAudienceLevel] = useState(LEVELS[0])
  const [contentType, setContentType] = useState(CONTENT_TYPES[0])
  const [cta, setCta] = useState(CTAS[0])

  const [result, setResult] = useState<GenerationResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [improvingScript, setImprovingScript] = useState(false)
  const [improvementNotes, setImprovementNotes] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalDismissed, setUpgradeModalDismissed] = useState(false)

  const FREE_LIMIT = 3
  const generationsToday = userPlan?.generationsToday || 0
  const isPremium = userPlan?.plan === 'premium'
  const canGenerate = isPremium || generationsToday < FREE_LIMIT
  const remaining = isPremium ? '∞' : Math.max(0, FREE_LIMIT - generationsToday)

  const missingMainInput = useMemo(() => !niche.trim(), [niche])

  // ✅ Récupérer la fermeture du modal depuis sessionStorage
  useEffect(() => {
    const dismissed = sessionStorage.getItem('upgrade_modal_dismissed')
    if (dismissed === 'true') {
      setUpgradeModalDismissed(true)
    }
  }, [])

  // ✅ MODAL UPGRADE À LA 2ÈME GÉNÉRATION (corrigé)
  useEffect(() => {
    if (!isPremium && generationsToday === 2 && !upgradeModalDismissed) {
      setShowUpgradeModal(true)
    }
  }, [isPremium, generationsToday, upgradeModalDismissed])

  // ✅ RESET QUOTIDIEN DU COMPTEUR (avec reset du modal si nouveau jour)
  useEffect(() => {
    if (!user || !userPlan) return

    const today = new Date().toDateString()
    const lastDate = userPlan.lastGenerationDate

    if (lastDate !== today) {
      const resetCounter = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            generationsToday: 0,
            lastGenerationDate: today,
          })
          await refreshUserPlan()
          // Reset de la fermeture du modal pour le nouveau jour
          sessionStorage.removeItem('upgrade_modal_dismissed')
          setUpgradeModalDismissed(false)
        } catch (error) {
          console.error('Reset failed:', error)
        }
      }
      resetCounter()
    }
  }, [user, userPlan, refreshUserPlan])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // ✅ SUCCESS MESSAGE (Firestore gère le premium)
  useEffect(() => {
    if (params.get('upgraded') === 'true') {
      toast.success('🎉 Bienvenue en Premium !')
      refreshUserPlan()
    }
  }, [params, refreshUserPlan])

  // Téléchargement .txt
  const downloadTxt = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generate() {
    if (missingMainInput || generating) return

    if (!user) {
      toast.error('Tu dois être connecté')
      router.push('/login')
      return
    }

    if (!canGenerate) {
      toast.error('Limite atteinte — passe en Premium pour continuer')
      return
    }

    setGenerating(true)
    setResult(null)
    setImprovementNotes('')

    try {
      const idToken = await user.getIdToken()

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'generate',
          niche: niche.trim(),
          goal,
          platform: PLATFORM,
          tone,
          duration,
          audienceLevel,
          contentType,
          cta,
          includeAdvancedAnalysis: isPremium,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la génération')
        return
      }

      const nextResult: GenerationResult = {
        ideas: data.ideas || '',
        hooks: data.hooks || '',
        script: data.script || '',
        caption: data.caption || '',
        viralScore: data.viralScore || '',
        templateUsed: data.templateUsed || '',
        templateBreakdown: data.templateBreakdown || '',
        recommendedFormat: data.recommendedFormat || '',
        winningPatterns: data.winningPatterns || '',
        marketInsights: data.marketInsights || '',
        contentAngles: data.contentAngles || '',
        nextPostPlan: data.nextPostPlan || '',
        storyboard: Array.isArray(data.storyboard) ? data.storyboard : [],
        videosAnalyzed: Array.isArray(data.videosAnalyzed) ? data.videosAnalyzed : [],
        commentsAnalysis: {
          sentiment: data.commentsAnalysis?.sentiment || '',
          recurringQuestions: data.commentsAnalysis?.recurringQuestions || '',
          objections: data.commentsAnalysis?.objections || '',
          emotionalTriggers: data.commentsAnalysis?.emotionalTriggers || '',
          vocabulary: data.commentsAnalysis?.vocabulary || '',
        },
        scoreBreakdown: {
          hook: data.scoreBreakdown?.hook || '',
          retention: data.scoreBreakdown?.retention || '',
          cta: data.scoreBreakdown?.cta || '',
          trendFit: data.scoreBreakdown?.trendFit || '',
        },
      }

      setResult(nextResult)

      // ✅ Sauvegarde dans l'historique (pas d'incrément ici)
      await addDoc(collection(db, 'users', user.uid, 'generations'), {
        niche: niche.trim(),
        goal,
        platform: PLATFORM,
        tone,
        duration,
        audienceLevel,
        contentType,
        cta,
        ...nextResult,
        createdAt: serverTimestamp(),
      })

      // ❌ SUPPRIMÉ : l'incrément est maintenant géré côté backend (dans /api/generate)
      // await updateDoc(doc(db, 'users', user.uid), {
      //   generationsToday: increment(1),
      //   lastGenerationDate: new Date().toDateString(),
      // })

      // ✅ On rafraîchit juste le plan utilisateur pour mettre à jour l'UI
      await refreshUserPlan()

      toast.success('Stratégie générée avec succès !')

    } catch (err) {
      console.error(err)
      toast.error('Erreur réseau — réessaie')
    } finally {
      setGenerating(false)
    }
  }

  async function improveScript() {
    if (!result?.script || improvingScript) return

    if (!user) {
      toast.error('Tu dois être connecté')
      return
    }

    setImprovingScript(true)
    setImprovementNotes('')

    try {
      const idToken = await user.getIdToken()

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'improve',
          script: result.script,
          niche: niche.trim(),
          goal,
          platform: PLATFORM,
          tone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l’amélioration')
        return
      }

      setResult((prev) =>
        prev
          ? {
              ...prev,
              script: data.improvedScript || prev.script,
            }
          : prev
      )

      setImprovementNotes(data.improvementNotes || '')
      toast.success('🔥 Script boosté')
    } catch (err) {
      console.error(err)
      toast.error('Erreur réseau — réessaie')
    } finally {
      setImprovingScript(false)
    }
  }

  // ✅ FONCTION UPGRADE AVEC STRIPE LINK DIRECT
  function handleUpgrade() {
    const stripeLink = process.env.NEXT_PUBLIC_STRIPE_LINK

    if (!stripeLink) {
      toast.error('Lien de paiement manquant')
      return
    }

    window.location.href = stripeLink
  }

  async function handlePortal() {
    try {
      if (!user) {
        toast.error('Tu dois être connecté')
        return
      }

      const idToken = await user.getIdToken()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      })

      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      toast.error('Erreur portail')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-dark-400 border-t-brand-red animate-spin" />
      </div>
    )
  }

  const initial =
    user?.displayName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-600 border-b border-dark-500 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-syne font-bold text-lg gradient-text">ViralAI</span>

        <div className="flex items-center gap-3">
          {isPremium ? (
            <span className="text-xs bg-gradient-to-r from-brand-red/20 to-brand-orange/20 border border-brand-red/30 text-brand-red rounded-full px-3 py-1">
              Premium
            </span>
          ) : (
            <span className="text-xs text-dark-300">
              <span className="text-dark-100">{remaining}</span>/{FREE_LIMIT} restantes
            </span>
          )}

          <button
            onClick={() => router.push('/history')}
            className="text-dark-300 hover:text-dark-100 text-sm transition"
          >
            Historique
          </button>

          <div className="relative group">
            <button className="w-8 h-8 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-xs font-medium text-brand-red">
              {initial}
            </button>

            <div className="absolute right-0 top-10 bg-dark-600 border border-dark-500 rounded-xl py-1 w-48 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
              <div className="px-3 py-2 border-b border-dark-500">
                <p className="text-xs text-dark-100 truncate">{user?.email}</p>
                <p className="text-xs text-dark-300">{isPremium ? 'Premium' : 'Plan gratuit'}</p>
              </div>

              {isPremium ? (
                <button
                  onClick={handlePortal}
                  className="w-full text-left px-3 py-2 text-xs text-dark-200 hover:text-dark-100 transition"
                >
                  Gérer l&apos;abonnement
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  className="w-full text-left px-3 py-2 text-xs text-brand-red hover:opacity-80 transition"
                >
                  Passer en Premium
                </button>
              )}

              <button
                onClick={signOut}
                className="w-full text-left px-3 py-2 text-xs text-dark-300 hover:text-dark-100 transition"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MODAL UPGRADE À LA 2ÈME GÉNÉRATION */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="card p-6 max-w-md mx-4 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="text-xl font-bold text-dark-100 mb-2">
              Débloque la version qui te dit quoi filmer exactement
            </h3>
            <p className="text-sm text-dark-300 mb-4">
              Arrête de réfléchir à quoi poster. ViralAI Premium te donne le sujet, le script et le storyboard prêt à tourner.
            </p>
            <ul className="text-left text-sm text-dark-200 space-y-2 mb-6">
              <li>✅ Storyboard prêt à filmer, plan par plan</li>
              <li>✅ Les hooks et formats qui performent déjà</li>
              <li>✅ Ce que ton audience veut vraiment entendre</li>
              <li>✅ Générations illimitées pour trouver l'angle parfait</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeModal(false)
                  setUpgradeModalDismissed(true)
                  sessionStorage.setItem('upgrade_modal_dismissed', 'true')
                }}
                className="btn-secondary flex-1"
              >
                Plus tard
              </button>
              <button
                onClick={handleUpgrade}
                className="btn-primary flex-1"
              >
                Débloquer mon storyboard complet — 9€
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Note TikTok only */}
        <div className="mb-6 text-center">
          <p className="text-xs text-dark-300">
            🎯 Stratégies optimisées pour <span className="text-brand-red font-medium">TikTok</span>
            <br />
            <span className="text-[11px] text-dark-400">
              (les insights fonctionnent aussi très bien sur Instagram Reels et YouTube Shorts)
            </span>
          </p>
        </div>

        {!isPremium && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-dark-300 mb-1.5">
              <span>Générations aujourd&apos;hui</span>
              <span>{generationsToday}/{FREE_LIMIT}</span>
            </div>
            <div className="bg-dark-500 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-red to-brand-orange rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (generationsToday / FREE_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {!isPremium && !canGenerate && (
          <div className="card p-4 mb-6 border-brand-red/30 bg-brand-red/5">
            <p className="text-sm text-dark-100 font-medium mb-1">
              Limite atteinte pour aujourd&apos;hui
            </p>
            <p className="text-xs text-dark-300 mb-3">
              Passe en Premium pour des générations illimitées + analyses tendances + commentaires +
              boost de scripts.
            </p>
            <button onClick={handleUpgrade} className="btn-primary text-xs px-4 py-2">
              Passer Premium — 9€/mois
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
          {/* COLONNE GAUCHE : FORMULAIRE */}
          <section className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-dark-300">Brief stratégique</p>
                  <h2 className="text-lg font-semibold text-dark-100 mt-1">Prépare ta génération TikTok</h2>
                </div>
                {!isPremium && (
                  <span className="text-[11px] px-2 py-1 rounded-full border border-dark-400 text-dark-300">
                    Free
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-dark-300 uppercase tracking-widest block mb-2">
                    Ta niche
                  </label>
                  <input
                    ref={inputRef}
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generate()}
                    placeholder="ex: fitness, finance perso, cuisine healthy..."
                    className="input w-full"
                    disabled={generating || !canGenerate}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {NICHES.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setNiche(n)
                        inputRef.current?.focus()
                      }}
                      className="text-xs bg-dark-600 border border-dark-500 hover:border-dark-400 text-dark-300 hover:text-dark-100 rounded-full px-3 py-1 transition"
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectField label="Objectif" value={goal} onChange={setGoal} options={GOALS} />
                  <SelectField label="Ton" value={tone} onChange={setTone} options={TONES} />
                  <SelectField label="Durée" value={duration} onChange={setDuration} options={DURATIONS} />
                  <SelectField
                    label="Niveau audience"
                    value={audienceLevel}
                    onChange={setAudienceLevel}
                    options={LEVELS}
                  />
                  <SelectField
                    label="Type de contenu"
                    value={contentType}
                    onChange={setContentType}
                    options={CONTENT_TYPES}
                  />
                  <SelectField label="Call-to-action" value={cta} onChange={setCta} options={CTAS} />
                </div>

                <button
                  onClick={generate}
                  disabled={generating || missingMainInput || !canGenerate}
                  className="btn-primary w-full py-3"
                >
                  {generating ? 'Analyse en cours...' : 'Générer une stratégie virale'}
                </button>

                <p className="text-xs text-dark-300 leading-relaxed">
                  Génération pensée d’abord pour <span className="text-dark-100 font-medium">TikTok</span>.
                  Les hooks, structures et scripts proposés peuvent aussi très souvent fonctionner sur
                  <span className="text-dark-100 font-medium"> Instagram Reels</span> et
                  <span className="text-dark-100 font-medium"> YouTube Shorts</span>.
                </p>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-widest text-dark-300 mb-3">Valeur Premium</p>
              <div className="space-y-3 text-sm text-dark-200">
                <PremiumFeatureRow
                  enabled={isPremium}
                  text="Storyboard 6-9 vignettes : plan de tournage exact"
                />
                <PremiumFeatureRow
                  enabled={isPremium}
                  text="Analyse de 3 vidéos tendances et de leurs hooks"
                />
                <PremiumFeatureRow
                  enabled={isPremium}
                  text="Lecture des commentaires : objections, émotions, questions"
                />
                <PremiumFeatureRow
                  enabled={isPremium}
                  text="Sujet précis de la prochaine publication"
                />
                <PremiumFeatureRow
                  enabled={isPremium}
                  text="Boost de script plus agressif et orienté conversion"
                />
              </div>

              {!isPremium && (
                <button onClick={handleUpgrade} className="btn-secondary w-full mt-4">
                  Débloquer l’analyse avancée
                </button>
              )}
            </div>
          </section>

          {/* COLONNE DROITE : RÉSULTATS */}
          <section>
            {generating && (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="card p-5">
                    <div className="h-3 w-28 bg-dark-500 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-dark-500 rounded w-[92%]" />
                      <div className="h-3 bg-dark-500 rounded w-[75%]" />
                      <div className="h-3 bg-dark-500 rounded w-[82%]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!result && !generating && (
              <div className="card p-8 text-center">
                <p className="text-4xl mb-4">📸</p>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">
                  Ton storyboard + stratégie virale vont apparaître ici
                </h3>
                <p className="text-sm text-dark-300 max-w-xl mx-auto">
                  Génère une réponse enrichie avec storyboard visuel, score viral, patterns gagnants,
                  analyse marché, prochaine publication recommandée et script prêt à poster.
                </p>
              </div>
            )}

            {result && !generating && (
              <div className="space-y-4 animate-fade-in">
                {/* Métriques */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="Score viral" value={result.viralScore || '—'} accent="text-green-400" />
                  <MetricCard label="Hook" value={result.scoreBreakdown.hook || '—'} accent="text-cyan-400" />
                  <MetricCard
                    label="Rétention"
                    value={result.scoreBreakdown.retention || '—'}
                    accent="text-amber-400"
                  />
                  <MetricCard label="CTA" value={result.scoreBreakdown.cta || '—'} accent="text-purple-400" />
                </div>

                {/* STORYBOARD : TEASER GRATUIT (2 vignettes) + BLOCAGE PREMIUM */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                        📸 Storyboard prêt à filmer
                      </span>
                    </div>
                    {isPremium && result.storyboard.length > 0 && (
                      <button
                        onClick={() => {
                          const storyboardText = result.storyboard
                            .map(
                              (frame) =>
                                `[${frame.step}]\n📝 ${frame.text}\n🎬 ${frame.visual}\n😐 ${frame.emotion}\n`
                            )
                            .join('\n---\n')
                          navigator.clipboard.writeText(storyboardText)
                          toast.success('Storyboard copié !')
                        }}
                        className="text-xs text-dark-300 hover:text-dark-100 transition"
                      >
                        📋 Tout copier
                      </button>
                    )}
                  </div>

                  {isPremium && result.storyboard.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {result.storyboard.slice(0, 9).map((frame, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-dark-500 bg-dark-700/30 p-3 hover:border-emerald-400/30 transition"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                              {frame.step}
                            </span>
                            <span className="text-[10px] text-dark-400">Étape {idx + 1}</span>
                          </div>
                          <p className="text-sm text-dark-100 font-medium mb-2 line-clamp-2">
                            {frame.text}
                          </p>
                          <div className="space-y-1">
                            <p className="text-[11px] text-dark-300">
                              <span className="text-dark-400">🎬</span> {frame.visual}
                            </p>
                            <p className="text-[11px] text-dark-300">
                              <span className="text-dark-400">😐</span> {frame.emotion}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* TEASER GRATUIT : 2 PREMIÈRES VIGNETTES */}
                      {result.storyboard.slice(0, 2).map((frame, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-dark-500 bg-dark-700/30 p-3 mb-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                              {frame.step}
                            </span>
                            <span className="text-[10px] text-dark-400">Étape {idx + 1}</span>
                            {idx === 1 && (
                              <span className="text-[10px] text-brand-red ml-auto">⭐ Teaser Premium</span>
                            )}
                          </div>
                          <p className="text-sm text-dark-100 font-medium mb-2">{frame.text}</p>
                          <div className="space-y-1">
                            <p className="text-[11px] text-dark-300">
                              <span className="text-dark-400">🎬</span> {frame.visual}
                            </p>
                            <p className="text-[11px] text-dark-300">
                              <span className="text-dark-400">😐</span> {frame.emotion}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {/* BLOCAGE PREMIUM POUR LA SUITE */}
                      <div className="text-center py-6 border-t border-dark-500 mt-2">
                        <p className="text-sm text-dark-200 mb-3">
                          🔒 {result.storyboard.length - 2} vignettes supplémentaires verrouillées
                        </p>
                        <button onClick={handleUpgrade} className="btn-primary text-sm">
                          Débloquer le storyboard complet
                        </button>
                      </div>
                    </>
                  )}

                  {isPremium && result.storyboard.length === 0 && (
                    <p className="text-sm text-dark-300 text-center py-4">
                      Aucun storyboard généré pour cette session.
                    </p>
                  )}

                  <p className="text-[11px] text-dark-400 mt-3 text-center">
                    Suis ce plan de tournage dans l’ordre pour maximiser la rétention
                  </p>
                </div>

                {/* Next Post Plan */}
                <ResultCard
                  label="📅 Ta prochaine publication"
                  color="text-fuchsia-400"
                  dotColor="bg-fuchsia-400"
                  content={result.nextPostPlan}
                  onDownload={() => downloadTxt(result.nextPostPlan, 'next-post-plan.txt')}
                />

                {/* Template et Format */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ResultCard
                    label="Template utilisé"
                    color="text-cyan-400"
                    dotColor="bg-cyan-400"
                    content={`${result.templateUsed}\n\n${result.templateBreakdown}`}
                    onDownload={() => downloadTxt(`${result.templateUsed}\n\n${result.templateBreakdown}`, 'template.txt')}
                  />
                  <ResultCard
                    label="Format recommandé"
                    color="text-emerald-400"
                    dotColor="bg-emerald-400"
                    content={`${result.recommendedFormat}\n\n${result.winningPatterns}`}
                    onDownload={() => downloadTxt(`${result.recommendedFormat}\n\n${result.winningPatterns}`, 'format.txt')}
                  />
                </div>

                {/* Market Insights */}
                <ResultCard
                  label="Insights marché"
                  color="text-brand-red"
                  dotColor="bg-brand-red"
                  content={result.marketInsights}
                  onDownload={() => downloadTxt(result.marketInsights, 'market-insights.txt')}
                />

                {/* Content Angles */}
                <ResultCard
                  label="Angles de contenu recommandés"
                  color="text-brand-orange"
                  dotColor="bg-brand-orange"
                  content={result.contentAngles}
                  onDownload={() => downloadTxt(result.contentAngles, 'content-angles.txt')}
                />

                {/* Vidéos analysées (Premium) */}
                {isPremium ? (
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      <span className="text-xs font-medium uppercase tracking-widest text-pink-400">
                        3 vidéos tendances analysées
                      </span>
                    </div>

                    {result.videosAnalyzed.length > 0 ? (
                      <div className="space-y-3">
                        {result.videosAnalyzed.slice(0, 3).map((video, index) => (
                          <div
                            key={`${video.title}-${index}`}
                            className="rounded-2xl border border-dark-500 bg-dark-700/40 p-4"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <p className="text-sm font-medium text-dark-100">{video.title}</p>
                                <p className="text-xs text-dark-300">
                                  {video.creator} • {video.views}
                                </p>
                              </div>
                              <span className="text-[11px] px-2 py-1 rounded-full border border-dark-400 text-dark-300">
                                {video.format}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <MiniInfo label="Hook" value={video.hook} />
                              <MiniInfo label="Pourquoi ça marche" value={video.whyItWorks} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-dark-300">
                        Aucune vidéo analysée renvoyée par l&apos;API pour cette génération.
                      </p>
                    )}
                  </div>
                ) : (
                  <LockedCard
                    title="Analyse de 3 vidéos tendances"
                    description="Débloque les hooks utilisés, les formats dominants et pourquoi ces contenus performent."
                    onUpgrade={handleUpgrade}
                  />
                )}

                {/* Analyse des commentaires (Premium) */}
                {isPremium ? (
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      <span className="text-xs font-medium uppercase tracking-widest text-yellow-400">
                        Analyse des commentaires
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <MiniCard label="Sentiment dominant" value={result.commentsAnalysis.sentiment} />
                      <MiniCard
                        label="Questions récurrentes"
                        value={result.commentsAnalysis.recurringQuestions}
                      />
                      <MiniCard label="Objections" value={result.commentsAnalysis.objections} />
                      <MiniCard
                        label="Déclencheurs émotionnels"
                        value={result.commentsAnalysis.emotionalTriggers}
                      />
                    </div>
                    <div className="mt-3">
                      <MiniCard label="Vocabulaire du marché" value={result.commentsAnalysis.vocabulary} />
                    </div>
                  </div>
                ) : (
                  <LockedCard
                    title="Analyse des commentaires"
                    description="Comprends les frustrations, objections et mots exacts que ton audience utilise."
                    onUpgrade={handleUpgrade}
                  />
                )}

                {/* Idées et Hooks */}
                <ResultCard
                  label="Idées vidéos"
                  color="text-brand-red"
                  dotColor="bg-brand-red"
                  content={result.ideas}
                  onDownload={() => downloadTxt(result.ideas, 'ideas.txt')}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ResultCard
                    label="Hooks viraux"
                    color="text-brand-orange"
                    dotColor="bg-brand-orange"
                    content={result.hooks}
                    onDownload={() => downloadTxt(result.hooks, 'hooks.txt')}
                  />

                  {/* Script + Boost */}
                  <div className="card p-4 group relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs font-medium uppercase tracking-widest text-amber-400">
                          Script {duration}
                        </span>
                      </div>
                      <button
                        onClick={() => downloadTxt(result.script, `script-${duration}.txt`)}
                        className="text-xs text-dark-300 hover:text-dark-100"
                      >
                        📥 Télécharger .txt
                      </button>
                    </div>
                    <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-line">
                      {result.script}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={improveScript}
                        disabled={improvingScript}
                        className="btn-secondary w-full"
                      >
                        {improvingScript ? 'Boost en cours...' : '🔥 Booster ce script'}
                      </button>
                      {improvementNotes && (
                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                          <p className="text-[11px] uppercase tracking-widest text-amber-400 mb-2">
                            Améliorations apportées
                          </p>
                          <p className="text-sm text-dark-200 whitespace-pre-line">
                            {improvementNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <ResultCard
                  label="Caption + hashtags"
                  color="text-purple-400"
                  dotColor="bg-purple-400"
                  content={result.caption}
                  onDownload={() => downloadTxt(result.caption, 'caption.txt')}
                />

                {/* Note support */}
                <div className="rounded-2xl border border-dark-500 bg-dark-700/30 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-dark-300 mb-2">
                    Note support
                  </p>
                  <p className="text-sm text-dark-200">
                    Cette stratégie est pensée d’abord pour TikTok. Dans beaucoup de cas, le hook,
                    le script et la structure peuvent aussi être réutilisés sur Instagram Reels
                    et YouTube Shorts avec de légers ajustements de montage et de légende.
                  </p>
                </div>

                {/* Bouton régénération */}
                <button
                  onClick={generate}
                  disabled={generating || !canGenerate}
                  className="btn-secondary w-full"
                >
                  Régénérer la stratégie
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

// ============ COMPOSANTS RÉUTILISABLES ============

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="text-xs font-medium text-dark-300 uppercase tracking-widest block mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full bg-dark-700"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function PremiumFeatureRow({ enabled, text }: { enabled: boolean; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex w-5 h-5 items-center justify-center rounded-full text-xs ${
          enabled
            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
            : 'bg-dark-500 text-dark-300 border border-dark-400'
        }`}
      >
        {enabled ? '✓' : '🔒'}
      </span>
      <p className="text-sm text-dark-200">{text}</p>
    </div>
  )
}

function LockedCard({
  title,
  description,
  onUpgrade,
}: {
  title: string
  description: string
  onUpgrade: () => void
}) {
  return (
    <div className="card p-5 border-brand-red/20 bg-gradient-to-br from-brand-red/5 to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
        <span className="text-xs font-medium uppercase tracking-widest text-brand-red">
          Premium requis
        </span>
      </div>
      <h3 className="text-sm font-semibold text-dark-100 mb-1">{title}</h3>
      <p className="text-sm text-dark-300 mb-4">{description}</p>
      <button onClick={onUpgrade} className="btn-primary">
        Débloquer
      </button>
    </div>
  )
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-widest text-dark-300 mb-2">{label}</p>
      <p className={`text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-dark-300 mb-1">{label}</p>
      <p className="text-sm text-dark-200 whitespace-pre-line">{value || '—'}</p>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-dark-500 bg-dark-700/40 p-4">
      <p className="text-[11px] uppercase tracking-widest text-dark-300 mb-2">{label}</p>
      <p className="text-sm text-dark-200 whitespace-pre-line">{value || '—'}</p>
    </div>
  )
}

function ResultCard({
  label,
  color,
  dotColor,
  content,
  onDownload,
}: {
  label: string
  color: string
  dotColor: string
  content: string
  onDownload?: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-4 group relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className={`text-xs font-medium uppercase tracking-widest ${color}`}>{label}</span>
        </div>
        <div className="flex gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="text-xs border border-dark-400 rounded-lg px-2 py-0.5 text-dark-300 hover:text-dark-100 hover:border-dark-300 transition"
            >
              📥 .txt
            </button>
          )}
          <button
            onClick={copy}
            className="text-xs border border-dark-400 rounded-lg px-2 py-0.5 text-dark-300 hover:text-dark-100 hover:border-dark-300 transition"
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
      </div>
      <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-line">
        {content || '—'}
      </p>
    </div>
  )
}