import { SiteHeader } from "@/components/guideforge/site-header"
import { LandingHero } from "@/components/guideforge/landing/hero"
import { WhatItBuilds } from "@/components/guideforge/landing/what-it-builds"
import { HowItWorks } from "@/components/guideforge/landing/how-it-works"
import { ExampleNetworks } from "@/components/guideforge/landing/example-networks"
import { TrustSection } from "@/components/guideforge/landing/trust"
import { CtaFooter } from "@/components/guideforge/landing/cta-footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <LandingHero />
      <WhatItBuilds />
      <HowItWorks />
      <ExampleNetworks />
      <TrustSection />
      <CtaFooter />
    </main>
  )
}
