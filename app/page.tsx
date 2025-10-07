import { MainLayout } from "@/features/shared/components/layout/main-layout";
import { Hero } from "@/features/shared/components/layout/hero";
import { ProductsSection } from "@/features/shared/components/sections/products-section";
import { AboutSection } from "@/features/shared/components/sections/about-section";
import { PricingSection } from "@/features/shared/components/sections/pricing-section";
import { ContactSection } from "@/features/shared/components/sections/contact-section";
import { FooterSection } from "@/features/shared/components/sections/footer-section";

export default function Home() {
  return (
    <MainLayout>
      <Hero />
      <AboutSection />
      <ProductsSection />
      <PricingSection />
      <ContactSection />

      {/* Separator before footer */}
      <div className="py-8 bg-transparent">
        <div className="section-separator"></div>
      </div>

      <FooterSection />
    </MainLayout>
  );
}
