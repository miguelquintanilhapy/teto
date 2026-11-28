import { About } from "@/components/about";
import { AiExplainer } from "@/components/ai-explainer";
import { Audience } from "@/components/audience";
import { Features } from "@/components/features";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { OpeningYear } from "@/components/opening-year";
import { Problem } from "@/components/problem";

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <Features />
        <Problem />
        <OpeningYear />
        <AiExplainer />
        <HowItWorks />
        <Audience />
        <About />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
