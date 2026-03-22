'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Navbar from '@/components/landing/navbar'
import HeroPrompt from '@/components/landing/hero-prompt'
import TrustMarquee from '@/components/landing/trust-marquee'
import StrategiesSection from '@/components/landing/strategies-section'
import FeaturesSection from '@/components/landing/features-section'
import MarketplaceSection from '@/components/landing/marketplace-section'
import LeaderboardTable from '@/components/landing/leaderboard-table'
import PricingSection from '@/components/landing/pricing-section'
import EnterpriseSection from '@/components/landing/enterprise-section'
import CTASection from '@/components/landing/cta-section'
import FAQSection from '@/components/landing/faq-section'
import Footer from '@/components/landing/footer'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/ai-builder')
    }
  }, [user, loading, router])

  if (loading || user) return null

  return (
    <div className="dark" style={{ colorScheme: 'dark' }}>
      <div className="bg-background text-foreground">
        <Navbar />
        <main className="flex-1">
          <HeroPrompt />
          <TrustMarquee />
          <StrategiesSection />
          <FeaturesSection />
          <MarketplaceSection />
          <LeaderboardTable />
          <PricingSection />
          <EnterpriseSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </div>
  )
}
