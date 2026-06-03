import { LeafIcon } from "lucide-react";

import { heroSectionData } from "../../assets/assets";

// Compact hero card — intentionally small so it doesn't dominate the first
// screen on mobile. No CTA buttons; just badge, headline, and short subtext.
const Hero = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl mb-8">
      <img
        src={heroSectionData.hero_image}
        alt="Hero"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-r from-app-green via-app-green/70 to-app-green/30" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-orange-300 bg-orange-300/10 rounded-full mb-3">
          <LeafIcon className="size-3" /> Fresh, Local & Trusted · Addis Ababa
        </span>

        <h1 className="font-serif text-2xl sm:text-3xl text-white leading-tight mb-2">
          Shop local stores{" "}
          <span className="text-orange-300">in one place</span>
        </h1>

        <p className="text-sm text-white/75 leading-relaxed max-w-md">
          {heroSectionData.description}
        </p>
      </div>
    </section>
  );
};

export default Hero;
