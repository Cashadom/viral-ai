import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700'],
})

const dm = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'ViralAI — Génère du contenu viral en secondes',
  description:
    'Idées vidéos, hooks, scripts et hashtags générés par IA pour TikTok et Instagram. Pour les créateurs qui veulent scaler.',
  keywords: ['contenu viral', 'TikTok', 'Instagram', 'IA', 'créateur', 'hooks', 'scripts'],
  openGraph: {
    title: 'ViralAI',
    description: 'Génère du contenu viral en secondes avec l\'IA',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${syne.variable} ${dm.variable}`}>
      <body className="bg-dark-800 text-dark-100 font-dm antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#f0f0f0',
                border: '0.5px solid #333',
                borderRadius: '10px',
                fontSize: '13px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
