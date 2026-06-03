import { heroSectionData } from "../../assets/assets";

// One straight horizontal row of trust badges. On mobile it scrolls
// side-to-side; on larger screens the four cards share the row.
const Features = () => {
  return (
    <section className="mb-10">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {heroSectionData.hero_features.map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white border border-app-border/80 rounded-xl px-4 py-3 min-w-[200px] sm:min-w-0 sm:flex-1"
          >
            <div className="size-10 rounded-lg bg-app-cream flex-center shrink-0">
              <feature.icon className="size-5 text-app-green" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app-green truncate">
                {feature.title}
              </p>
              <p className="text-xs text-app-text-light truncate">
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
