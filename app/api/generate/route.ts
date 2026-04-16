import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserQuota, adminAuth, adminDb } from '@/lib/firebase-admin'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const maxDuration = 60

type GenerateMode = 'generate' | 'improve'

type GeneratePayload = {
  niche?: string
  mode?: GenerateMode
  script?: string
  goal?: string
  platform?: string
  tone?: string
  duration?: string
  audienceLevel?: string
  contentType?: string
  cta?: string
  includeAdvancedAnalysis?: boolean
}

type ImproveResponse = {
  improvedScript?: string
  improvementNotes?: string
}

type StoryboardFrame = {
  step: string
  text: string
  visual: string
  emotion: string
}

type GenerateResponse = {
  ideas?: string
  hooks?: string
  script?: string
  caption?: string
  viralScore?: string
  templateUsed?: string
  templateBreakdown?: string
  recommendedFormat?: string
  winningPatterns?: string
  marketInsights?: string
  contentAngles?: string
  nextPostPlan?: string | object
  storyboard?: StoryboardFrame[]
  videosAnalyzed?: Array<{
    title?: string
    creator?: string
    views?: string
    hook?: string
    format?: string
    whyItWorks?: string
  }>
  commentsAnalysis?: {
    sentiment?: string
    recurringQuestions?: string
    objections?: string
    emotionalTriggers?: string
    vocabulary?: string
  }
  scoreBreakdown?: {
    hook?: string
    retention?: string
    cta?: string
    trendFit?: string
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function safeJsonParse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

function formatNextPostPlan(nextPostPlan: unknown): string {
  if (!nextPostPlan) return ''
  if (typeof nextPostPlan === 'string') return nextPostPlan
  if (typeof nextPostPlan === 'object' && nextPostPlan !== null) {
    const plan = nextPostPlan as {
      sujet?: string
      angle?: string
      hook?: string
      promesse?: string
      structure?: string
      texteEcran?: string
      CTAfinal?: string
      pourquoiMarche?: string
    }
    const lines = [
      plan.sujet && `📌 Sujet : ${plan.sujet}`,
      plan.angle && `🎯 Angle : ${plan.angle}`,
      plan.hook && `🪝 Hook : ${plan.hook}`,
      plan.promesse && `💎 Promesse : ${plan.promesse}`,
      plan.structure && `📐 Structure : ${plan.structure}`,
      plan.texteEcran && `📱 Texte écran : ${plan.texteEcran}`,
      plan.CTAfinal && `⚡ CTA final : ${plan.CTAfinal}`,
      plan.pourquoiMarche && `🔍 Pourquoi ça marche : ${plan.pourquoiMarche}`,
    ].filter(Boolean)
    return lines.join('\n\n')
  }
  try {
    return JSON.stringify(nextPostPlan, null, 2)
  } catch {
    return ''
  }
}

function sanitizeGenerateResponse(
  parsed: GenerateResponse | null,
  includeAdvancedAnalysis: boolean
) {
  return {
    ideas: parsed?.ideas || '',
    hooks: parsed?.hooks || '',
    script: parsed?.script || '',
    caption: parsed?.caption || '',
    viralScore: parsed?.viralScore || '',
    templateUsed: parsed?.templateUsed || '',
    templateBreakdown: parsed?.templateBreakdown || '',
    recommendedFormat: parsed?.recommendedFormat || '',
    winningPatterns: parsed?.winningPatterns || '',
    marketInsights: parsed?.marketInsights || '',
    contentAngles: parsed?.contentAngles || '',
    nextPostPlan: formatNextPostPlan(parsed?.nextPostPlan),
    storyboard: includeAdvancedAnalysis && Array.isArray(parsed?.storyboard)
      ? parsed.storyboard.slice(0, 9).map((frame) => ({
          step: frame?.step || '',
          text: frame?.text || '',
          visual: frame?.visual || '',
          emotion: frame?.emotion || '',
        }))
      : [],
    videosAnalyzed: includeAdvancedAnalysis && Array.isArray(parsed?.videosAnalyzed)
      ? parsed.videosAnalyzed.slice(0, 3).map((video) => ({
          title: video?.title || '',
          creator: video?.creator || '',
          views: video?.views || '',
          hook: video?.hook || '',
          format: video?.format || '',
          whyItWorks: video?.whyItWorks || '',
        }))
      : [],
    commentsAnalysis: includeAdvancedAnalysis
      ? {
          sentiment: parsed?.commentsAnalysis?.sentiment || '',
          recurringQuestions: parsed?.commentsAnalysis?.recurringQuestions || '',
          objections: parsed?.commentsAnalysis?.objections || '',
          emotionalTriggers: parsed?.commentsAnalysis?.emotionalTriggers || '',
          vocabulary: parsed?.commentsAnalysis?.vocabulary || '',
        }
      : {
          sentiment: '',
          recurringQuestions: '',
          objections: '',
          emotionalTriggers: '',
          vocabulary: '',
        },
    scoreBreakdown: {
      hook: parsed?.scoreBreakdown?.hook || '',
      retention: parsed?.scoreBreakdown?.retention || '',
      cta: parsed?.scoreBreakdown?.cta || '',
      trendFit: parsed?.scoreBreakdown?.trendFit || '',
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    // ============ 1. Vérifications de base ============
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY manquante')
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500 }
      )
    }

    // ============ 2. Lecture du body (pour récupérer le mode) ============
    let body: GeneratePayload
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Body JSON invalide' },
        { status: 400 }
      )
    }

    const mode = body?.mode || 'generate'
    const niche = body?.niche?.trim()
    const script = body?.script?.trim()

    // ============ 3. Récupération et vérification du token Firebase ============
    const authHeader = (await headers()).get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch {
      return NextResponse.json(
        { error: 'Token Firebase invalide' },
        { status: 401 }
      )
    }

    const uid = decodedToken.uid

    // ============ 4. Vérification des quotas (UNIQUEMENT pour le mode GENERATE) ============
    if (mode === 'generate') {
      const quota = await getUserQuota(uid)
      
      if (!quota.allowed) {
        const message = quota.plan === 'premium' 
          ? 'Erreur technique' 
          : `Limite atteinte (${quota.remaining} génération(s) restante aujourd'hui). Passe en Premium.`
        return NextResponse.json(
          { error: message },
          { status: 429 }
        )
      }
    }

    const goal = body?.goal?.trim() || 'Faire des vues'
    const platform = 'TikTok'
    const tone = body?.tone?.trim() || 'Éducatif'
    const duration = body?.duration?.trim() || '30s'
    const audienceLevel = body?.audienceLevel?.trim() || 'Débutant'
    const contentType = body?.contentType?.trim() || 'Face cam'
    const cta = body?.cta?.trim() || 'Suivre le compte'
    const includeAdvancedAnalysis = Boolean(body?.includeAdvancedAnalysis)

    // ============ MODE IMPROVE (pas de quota, illimité) ============
    if (mode === 'improve') {
      if (!script) {
        return NextResponse.json(
          { error: 'Script manquant pour le mode improve' },
          { status: 400 }
        )
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `Tu es un expert TikTok.

Améliore ce script pour le rendre :
- plus viral
- plus rythmé
- plus émotionnel
- plus naturel à l'oral
- plus engageant dans les 3 premières secondes
- plus clair et plus concret

Contexte :
- Niche : ${niche || 'non précisée'}
- Objectif : ${goal}
- Ton : ${tone}

Réponds UNIQUEMENT en JSON valide avec exactement cette structure :
{
  "improvedScript": "script amélioré",
  "improvementNotes": "3 améliorations expliquées brièvement"
}

Script à améliorer :
${script}`,
          },
        ],
      })

      const text = completion.choices[0]?.message?.content || '{}'
      const parsed = safeJsonParse<ImproveResponse>(text)

      if (!parsed) {
        return NextResponse.json(
          {
            error: 'OpenAI a renvoyé un mauvais format JSON',
            raw: text,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        improvedScript: parsed.improvedScript || '',
        improvementNotes: parsed.improvementNotes || '',
      })
    }

    // ============ MODE GENERATE ============
    if (!niche) {
      return NextResponse.json(
        { error: 'Niche manquante pour le mode generate' },
        { status: 400 }
      )
    }

    const advancedBlock = includeAdvancedAnalysis
      ? `
Ajoute aussi une analyse premium avancée.

Tu dois remplir ces champs premium :
- "storyboard": 6 à 9 vignettes MAXIMUM (NE JAMAIS DEPASSER 9) qui détaillent EXACTEMENT quoi filmer
- "videosAnalyzed": 3 vidéos tendances plausibles et cohérentes avec la niche
- "commentsAnalysis": synthèse des commentaires typiques de l'audience
- "marketInsights": ce que le marché veut vraiment maintenant
- "contentAngles": 3 angles de contenu qui ont le plus de potentiel
- "nextPostPlan": plan ultra précis de la prochaine publication
- "recommendedFormat": le format vidéo recommandé
- "winningPatterns": les patterns viraux détectés
- "scoreBreakdown": détail des scores
`
      : `
⚠️ MODE GRATUIT : l'utilisateur n'a PAS accès à l'analyse avancée.
- laisse "storyboard" vide (tableau vide)
- laisse "videosAnalyzed" vide (tableau vide)
- laisse "commentsAnalysis" avec des chaînes vides
- remplis quand même "marketInsights", "contentAngles", "nextPostPlan", "recommendedFormat", "winningPatterns", "scoreBreakdown"
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Tu es un expert TikTok et un réalisateur spécialisé dans les contenus viraux.

Ta mission : créer une réponse ultra concrète, actionnable et non générique pour un créateur.

Contexte utilisateur :
- Niche : ${niche}
- Objectif : ${goal}
- Plateforme : ${platform}
- Ton : ${tone}
- Durée : ${duration}
- Niveau audience : ${audienceLevel}
- Type de contenu : ${contentType}
- CTA : ${cta}

Réponds UNIQUEMENT en JSON valide avec exactement cette structure :
{
  "ideas": "3 idées de vidéos virales, chacune sur une nouvelle ligne",
  "hooks": "3 hooks viraux, chacun sur une nouvelle ligne",
  "script": "1 script TikTok ${duration}",
  "caption": "1 caption TikTok avec hashtags",
  "viralScore": "Une note sur 10 + explication en 2 lignes max",
  "templateUsed": "Nom court du template viral utilisé",
  "templateBreakdown": "Décompose le template en 3 étapes simples",
  "recommendedFormat": "Format recommandé pour performer",
  "winningPatterns": "Les patterns gagnants détectés",
  "marketInsights": "Ce que cette audience veut, ressent ou cherche en ce moment",
  "contentAngles": "3 angles de contenu recommandés, chacun sur une nouvelle ligne",
  "nextPostPlan": "Sujet exact de la prochaine publication, angle exact, hook exact, promesse exacte, structure exacte en 5 étapes, texte écran, CTA final, et pourquoi ce contenu a une chance de marcher maintenant",
  "storyboard": [
    {
      "step": "Hook",
      "text": "Texte à dire ou à afficher",
      "visual": "Description de ce qui se passe à l'écran (caméra, angle, mouvement)",
      "emotion": "Émotion à exprimer"
    },
    {
      "step": "Setup",
      "text": "...",
      "visual": "...",
      "emotion": "..."
    }
  ],
  "videosAnalyzed": [
    {
      "title": "titre vidéo 1",
      "creator": "nom créateur",
      "views": "nombre de vues",
      "hook": "hook utilisé",
      "format": "format de la vidéo",
      "whyItWorks": "pourquoi cette vidéo marche"
    }
  ],
  "commentsAnalysis": {
    "sentiment": "sentiment dominant",
    "recurringQuestions": "questions qui reviennent souvent",
    "objections": "freins ou objections fréquentes",
    "emotionalTriggers": "émotions ou déclencheurs récurrents",
    "vocabulary": "mots et expressions utilisés par l'audience"
  },
  "scoreBreakdown": {
    "hook": "note /10 + mini explication",
    "retention": "note /10 + mini explication",
    "cta": "note /10 + mini explication",
    "trendFit": "note /10 + mini explication"
  }
}

📸 RÈGLES POUR LE STORYBOARD (TRÈS IMPORTANT) :
- Crée ENTRE 6 ET 9 VIGNETTES MAXIMUM (ne dépasse JAMAIS 9)
- Chaque vignette doit répondre à : "Que filmer EXACTEMENT ?"
- Le champ "visual" doit être très concret : "Face cam, regard caméra, silence 0.5s", "Zoom lent sur les mains", "Cut sur écran d'ordinateur"
- Le champ "emotion" : "Sérieux / intrigue", "Frustration", "Surprise", "Urgence", "Complicité"
- Le champ "text" : ce que le créateur dit à l'écran (ou texte à l'écran)
- Structure recommandée : Hook → Setup → Développement → Twist → Moment fort → Réaction → Punchline → CTA → Outro
- Adapte-toi au type de contenu choisi par l'utilisateur

Contraintes :
- écris en français
- sois concret, jamais générique
- donne le contenu précis de la prochaine publication
- donne les mots à employer
- explique pourquoi ça marche
- pense TikTok uniquement
- évite les conseils vagues

${advancedBlock}`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const parsed = safeJsonParse<GenerateResponse>(text)

    if (!parsed) {
      return NextResponse.json(
        {
          error: 'OpenAI a renvoyé un mauvais format JSON',
          raw: text,
        },
        { status: 500 }
      )
    }

    // ✅ INC RÉMENTATION DU COMPTEUR (après génération réussie)
    // Seulement pour le mode generate (pas pour improve)
    if (mode === 'generate') {
      const FieldValue = require('firebase-admin').firestore.FieldValue
      await adminDb.collection('users').doc(uid).update({
        generationsToday: FieldValue.increment(1),
        lastGenerationDate: new Date().toDateString(),
      })
      console.log(`✅ Compteur incrémenté pour ${uid}`)
    }

    return NextResponse.json(
      sanitizeGenerateResponse(parsed, includeAdvancedAnalysis)
    )
  } catch (err: unknown) {
    console.error('GENERATE ERROR:', err)

    const message = err instanceof Error ? err.message : 'Erreur serveur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}