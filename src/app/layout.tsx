import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PasswordProtectedLayout from '@/components/PasswordProtectedLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Competitor Ads Dashboard',
  description: 'Monitor and analyze Facebook ads from your competitors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PasswordProtectedLayout>
          {children}
        </PasswordProtectedLayout>
      </body>
    </html>
  )
} 