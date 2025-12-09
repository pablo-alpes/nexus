import type { Metadata } from 'next'
import './globals.css'
import ViewProviderWrapper from '@/components/ViewProviderWrapper'

export const metadata: Metadata = {
  title: 'Nexus Cloud - DORA Compliance',
  description: 'Digital Operational Resilience Act Compliance Management Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ViewProviderWrapper>
          {children}
        </ViewProviderWrapper>
      </body>
    </html>
  )
}

