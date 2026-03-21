import Navbar from "@/components/Navbar";
import HeroPrompt from "@/components/HeroPrompt";
import TrustMarquee from "@/components/TrustMarquee";
import StrategiesSection from "@/components/StrategiesSection";
import FeaturesSection from "@/components/FeaturesSection";
import MarketplaceSection from "@/components/MarketplaceSection";
import LeaderboardTable from "@/components/LeaderboardTable";
import EnterpriseSection from "@/components/EnterpriseSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroPrompt />
        <TrustMarquee />
        <StrategiesSection />
        <FeaturesSection />
        <MarketplaceSection />
        <LeaderboardTable />
        <EnterpriseSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
