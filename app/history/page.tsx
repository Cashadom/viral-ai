'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

// ============ TYPES ============

interface StoryboardFrame {
  step: string
  text: string
  visual: string
  emotion: string
}

interface Generation {
  id: string
  niche: string
  goal: string
  tone: string
  duration: string
  audienceLevel: string
  contentType: string
  cta: string
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
  createdAt: { seconds: number }
}

// ============ COMPOSANT PRINCIPAL ============

export default function HistoryPage() {
  const { user, userPlan, loading } = useAuth()
  const router = useRouter()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [filteredGenerations, setFilteredGenerations] = useState<Generation[]>([])
  const [fetching, setFetching] = useState(true)
  const [selected, setSelected] = useState<Generation | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNiche, setSelectedNiche] = useState<string>('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isPremium = userPlan?.plan === 'premium'
  const FREE_LIMIT = 5
  const displayGenerations = isPremium ? filteredGenerations : filteredGenerations.slice(0, FREE_LIMIT)

  // Récupération des favoris depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('historyFavorites')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed))
        }
      } catch (e) {
        console.error('Failed to parse favorites:', e)
      }
    }
  }, [])

  // Sauvegarde des favoris
  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(id)) {
      newFavorites.delete(id)
      toast.success('Retiré des favoris')
    } else {
      newFavorites.add(id)
      toast.success('Ajouté aux favoris ⭐')
    }
    setFavorites(newFavorites)
    // ✅ CORRIGÉ : Array.from() au lieu de spread operator
    localStorage.setItem('historyFavorites', JSON.stringify(Array.from(newFavorites)))
  }

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    async function load() {
      const q = query(
        collection(db, 'users', user.uid, 'generations'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Generation))
      setGenerations(docs)
      setFilteredGenerations(docs)
      if (docs.length > 0) setSelected(docs[0])
      setFetching(false)
    }
    load()
  }, [user])

  // Filtrage
  useEffect(() => {
    let filtered = [...generations]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (g) =>
          g.niche.toLowerCase().includes(term) ||
          g.ideas?.toLowerCase().includes(term) ||
          g.hooks?.toLowerCase().includes(term)
      )
    }
    if (selectedNiche) {
      filtered = filtered.filter((g) => g.niche === selectedNiche)
    }
    // Favoris en premier
    filtered.sort((a, b) => {
      const aFav = favorites.has(a.id) ? 1 : 0
      const bFav = favorites.has(b.id) ? 1 : 0
      return bFav - aFav
    })
    setFilteredGenerations(filtered)
  }, [searchTerm, selectedNiche, generations, favorites])

  function formatDate(secs: number) {
    return new Date(secs * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Récupérer les niches uniques pour le filtre
  const uniqueNiches = [...new Set(generations.map((g) => g.niche))]

  // Réutiliser une génération (redirige vers dashboard avec préremplissage)
  const handleReuse = (gen: Generation) => {
    localStorage.setItem('reuseGeneration', JSON.stringify({
      niche: gen.niche,
      goal: gen.goal,
      tone: gen.tone,
      duration: gen.duration,
      audienceLevel: gen.audienceLevel,
      contentType: gen.contentType,
      cta: gen.cta,
    }))
    router.push('/dashboard?reuse=true')
    toast.success('Brief prérempli !')
  }

  // Améliorer un ancien script
  const handleImprove = (gen: Generation) => {
    localStorage.setItem('improveScript', gen.script)
    router.push('/dashboard?improve=true')
    toast.success('Script chargé pour amélioration')
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copié !')
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-dark-400 border-t-brand-red animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      <header className="bg-dark-600 border-b border-dark-500 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-dark-300 hover:text-dark-100 transition text-sm"
        >
          ← Dashboard
        </button>
        <span className="font-syne font-bold text-lg gradient-text">Historique</span>
        <div className="flex-1" />
        {!isPremium && (
          <span className="text-xs text-dark-300">
            {displayGenerations.length}/{FREE_LIMIT} affichées
          </span>
        )}
        {isPremium && (
          <span className="text-xs text-brand-red">Premium ∞</span>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Barre de filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Rechercher par niche, idée, hook..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input flex-1 min-w-[200px]"
          />
          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="input w-48 bg-dark-700"
          >
            <option value="">Toutes les niches</option>
            {uniqueNiches.map((niche) => (
              <option key={niche} value={niche}>{niche}</option>
            ))}
          </select>
          {selectedNiche && (
            <button
              onClick={() => setSelectedNiche('')}
              className="text-xs text-dark-300 hover:text-dark-100 px-3 py-2"
            >
              ✕ Effacer
            </button>
          )}
        </div>

        {/* Message limite free */}
        {!isPremium && generations.length > FREE_LIMIT && (
          <div className="card p-4 mb-6 border-brand-red/30 bg-brand-red/5">
            <p className="text-sm text-dark-100 font-medium mb-1">
              📜 {generations.length} générations disponibles
            </p>
            <p className="text-xs text-dark-300 mb-3">
              Seules les {FREE_LIMIT} plus récentes sont affichées en version gratuite.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary text-xs px-4 py-2"
            >
              Passer Premium — 9€/mois
            </button>
          </div>
        )}

        {displayGenerations.length === 0 ? (
          <div className="text-center py-20 text-dark-300">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-sm">Aucune génération trouvée</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)]">
            {/* Liste des générations */}
            <div className="lg:w-80 flex-shrink-0 overflow-y-auto space-y-2">
              {displayGenerations.map((g) => (
                <div
                  key={g.id}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    selected?.id === g.id
                      ? 'bg-dark-500 border-brand-red/50'
                      : 'bg-dark-600 border-dark-500 hover:border-dark-400'
                  }`}
                  onClick={() => setSelected(g)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(g.id)
                        }}
                        className="text-sm"
                      >
                        {favorites.has(g.id) ? '⭐' : '☆'}
                      </button>
                      <p className="text-sm text-dark-100 truncate font-medium">{g.niche}</p>
                    </div>
                    <span className="text-[10px] text-dark-400">{g.viralScore || '—'}</span>
                  </div>
                  <p className="text-xs text-dark-300 mt-1">
                    {g.createdAt ? formatDate(g.createdAt.seconds) : '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Détail de la génération sélectionnée */}
            {selected && (
              <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                  <div>
                    <h2 className="font-syne font-bold text-xl">{selected.niche}</h2>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-500 text-dark-300">
                        {selected.goal}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-500 text-dark-300">
                        {selected.tone}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-500 text-dark-300">
                        {selected.duration}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReuse(selected)}
                      className="text-xs btn-secondary px-3 py-1.5"
                    >
                      🔁 Réutiliser
                    </button>
                    <button
                      onClick={() => handleImprove(selected)}
                      className="text-xs btn-primary px-3 py-1.5"
                    >
                      🔥 Améliorer
                    </button>
                  </div>
                </div>

                {/* Score viral */}
                {selected.viralScore && (
                  <div className="card p-3">
                    <p className="text-[11px] uppercase tracking-widest text-green-400 mb-1">
                      Score viral
                    </p>
                    <p className="text-sm text-dark-200">{selected.viralScore}</p>
                  </div>
                )}

                {/* Storyboard (Premium) */}
                {isPremium && selected.storyboard && selected.storyboard.length > 0 && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] uppercase tracking-widest text-emerald-400">
                        📸 Storyboard
                      </p>
                      <button
                        onClick={() => {
                          const text = selected.storyboard
                            .map((f) => `[${f.step}]\n📝 ${f.text}\n🎬 ${f.visual}\n😐 ${f.emotion}`)
                            .join('\n---\n')
                          copyToClipboard(text, 'storyboard')
                        }}
                        className="text-xs text-dark-300 hover:text-dark-100"
                      >
                        {copiedId === 'storyboard' ? '✅ Copié !' : '📋 Copier'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selected.storyboard.slice(0, 9).map((frame, idx) => (
                        <div key={idx} className="rounded-lg border border-dark-500 bg-dark-700/30 p-2">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                            {frame.step}
                          </span>
                          <p className="text-xs text-dark-100 mt-1 line-clamp-2">{frame.text}</p>
                          <p className="text-[10px] text-dark-400 mt-1">🎬 {frame.visual}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cartes de contenu */}
                <ContentCard
                  label="Idées vidéos"
                  color="text-brand-red"
                  content={selected.ideas}
                  onCopy={() => copyToClipboard(selected.ideas, 'ideas')}
                  copied={copiedId === 'ideas'}
                />
                <ContentCard
                  label="Hooks viraux"
                  color="text-brand-orange"
                  content={selected.hooks}
                  onCopy={() => copyToClipboard(selected.hooks, 'hooks')}
                  copied={copiedId === 'hooks'}
                />
                <ContentCard
                  label="Script"
                  color="text-amber-400"
                  content={selected.script}
                  onCopy={() => copyToClipboard(selected.script, 'script')}
                  copied={copiedId === 'script'}
                />
                <ContentCard
                  label="Caption + hashtags"
                  color="text-purple-400"
                  content={selected.caption}
                  onCopy={() => copyToClipboard(selected.caption, 'caption')}
                  copied={copiedId === 'caption'}
                />

                {/* Premium insights */}
                {isPremium && (
                  <>
                    <ContentCard
                      label="Template utilisé"
                      color="text-cyan-400"
                      content={`${selected.templateUsed || ''}\n\n${selected.templateBreakdown || ''}`}
                      onCopy={() => copyToClipboard(selected.templateUsed + '\n' + selected.templateBreakdown, 'template')}
                      copied={copiedId === 'template'}
                    />
                    <ContentCard
                      label="Market insights"
                      color="text-brand-red"
                      content={selected.marketInsights}
                      onCopy={() => copyToClipboard(selected.marketInsights, 'market')}
                      copied={copiedId === 'market'}
                    />
                    <ContentCard
                      label="Next post plan"
                      color="text-fuchsia-400"
                      content={selected.nextPostPlan}
                      onCopy={() => copyToClipboard(selected.nextPostPlan, 'next')}
                      copied={copiedId === 'next'}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ============ COMPOSANT CARTE ============

function ContentCard({
  label,
  color,
  content,
  onCopy,
  copied,
}: {
  label: string
  color: string
  content: string
  onCopy: () => void
  copied: boolean
}) {
  if (!content) return null

  return (
    <div className="card p-4 group relative">
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[11px] font-medium uppercase tracking-widest ${color}`}>{label}</p>
        <button
          onClick={onCopy}
          className="text-xs border border-dark-400 rounded-lg px-2 py-0.5 text-dark-300 hover:text-dark-100 hover:border-dark-300 transition"
        >
          {copied ? '✅ Copié !' : '📋 Copier'}
        </button>
      </div>
      <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-line">
        {content || '—'}
      </p>
    </div>
  )
}