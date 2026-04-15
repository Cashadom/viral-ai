# ViralAI

SaaS de génération de contenu viral pour TikTok et Instagram.

---

## Stack

- **Frontend/Backend** : Next.js 14 (App Router)
- **Auth + DB** : Firebase (Authentication + Firestore)
- **IA** : Anthropic Claude ou OpenAI GPT-4o-mini
- **Paiement** : Stripe
- **Deploy** : Vercel

---

## Setup en 10 minutes

### 1. Installe les dépendances

```bash
npm install
```

### 2. Configure les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplis `.env.local` avec tes clés (voir section ci-dessous).

### 3. Firebase

1. Crée un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Active **Authentication** → Email/Password + Google
3. Crée une base **Firestore** (mode production)
4. Dans **Paramètres du projet** → copie la config web (`NEXT_PUBLIC_FIREBASE_*`)
5. Dans **Paramètres** → Comptes de service → Génère une clé privée (`FIREBASE_ADMIN_*`)

**Règles Firestore** — colle ça dans Firestore > Règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /generations/{genId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 4. Stripe

1. Compte sur [stripe.com](https://stripe.com)
2. Crée un produit **ViralAI Premium** → Prix récurrent 9€/mois
3. Copie le `price_id` → `STRIPE_PREMIUM_PRICE_ID`
4. Active le portail client : Stripe Dashboard → Paramètres → Portail client
5. Pour les webhooks en local :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Événements à écouter :
- `checkout.session.completed`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### 5. IA

Choisis **l'un des deux** :

```env
ANTHROPIC_API_KEY=sk-ant-...   # Anthropic Claude (recommandé)
# ou
OPENAI_API_KEY=sk-...          # OpenAI GPT-4o-mini
```

Le code détecte automatiquement quelle clé est présente.

### 6. Lance en local

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

---

## Deploy sur Vercel

```bash
npm install -g vercel
vercel
```

Puis dans Vercel Dashboard → Settings → Environment Variables : copie tout ton `.env.local`.

Pour les webhooks Stripe en production :
1. Stripe Dashboard → Webhooks → Ajouter un endpoint
2. URL : `https://ton-domaine.vercel.app/api/stripe/webhook`
3. Copie le `whsec_...` → `STRIPE_WEBHOOK_SECRET`

---

## Structure du projet

```
viralai/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Auth (email + Google)
│   ├── dashboard/page.tsx    # Générateur principal
│   ├── history/page.tsx      # Historique des générations
│   └── api/
│       ├── generate/         # POST — génération IA + check usage
│       └── stripe/
│           ├── checkout/     # POST — crée session Stripe
│           ├── portal/       # POST — portail abonnement
│           └── webhook/      # POST — événements Stripe
├── lib/
│   ├── firebase.ts           # Client SDK
│   ├── firebase-admin.ts     # Server SDK + helpers Firestore
│   ├── ai.ts                 # Wrapper Anthropic / OpenAI
│   └── stripe.ts             # Helpers Stripe
├── hooks/
│   └── useAuth.tsx           # Context auth + plan utilisateur
└── styles/
    └── globals.css
```

---

## Prochaines étapes pour scaler

- [ ] Analytics : ajouter PostHog (`NEXT_PUBLIC_POSTHOG_KEY`)
- [ ] Templates viraux : collection Firestore `templates` (50 templates premium)
- [ ] Onboarding : wizard 3 étapes après inscription
- [ ] Email : Resend pour welcome email + récap hebdo
- [ ] A/B test : pricing 9€ vs 19€
- [ ] Mobile app : React Native avec même Firebase
