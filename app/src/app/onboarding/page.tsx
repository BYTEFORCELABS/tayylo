"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Ruler, Layers, Feather, Gem, Shirt } from "lucide-react";
import { businessRepo } from "@/lib/mock/store";

// Each entry either has a real reference photo (when we have one that's
// actually distinct for that garment) or falls back to an icon tile —
// several categories would otherwise share the exact same stock photo,
// which reads as more confusing than a plain icon.
const garmentChips = [
  { name: "Suits", image: "/garments/suit.jpg" },
  { name: "Shirts", image: "/garments/shirt.jpg" },
  { name: "Trousers", image: "/garments/trousers.jpg" },
  { name: "Jackets", image: "/garments/blazer.jpg" },
  { name: "Agbada", image: "/garments/agbada.jpg" },
  { name: "Senator", image: "/garments/senator.jpg" },
  { name: "Kaftan", image: "/garments/kaftan.jpg" },
  { name: "Dresses", image: "/garments/dress.jpg" },
  { name: "Skirts", icon: Layers },
  { name: "Boubou", icon: Feather },
  { name: "Kurta", icon: Shirt },
  { name: "Bridal", icon: Gem },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [businessName, setBusinessName] = React.useState("");
  const [unit, setUnit] = React.useState<"imperial" | "metric">("imperial");
  const [selectedGarments, setSelectedGarments] = React.useState<string[]>([
    "Suits", "Shirts", "Agbada", "Senator",
  ]);

  const totalSteps = 3;

  const handleFinish = async () => {
    await businessRepo.update({
      name: businessName.trim() || "Adaeze's Bespoke Studio",
      unitSystem: unit,
      garmentTypes: selectedGarments,
    });
    await businessRepo.setOnboarded(true);
    router.push("/today");
  };

  const toggleGarment = (g: string) => {
    setSelectedGarments(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const canNext =
    step === 0 ? businessName.trim().length > 0 :
    step === 1 ? true :
    selectedGarments.length > 0;

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleFinish();
  };

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col justify-between p-4 sm:p-6 w-full max-w-md mx-auto">
      {/* Header with Back, Step Dots & Skip */}
      <div className="flex items-center justify-between w-full pt-safe">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : router.back())}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors text-text-primary"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>

        {/* Step Indicator Dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === i
                  ? "w-7 bg-olive"
                  : step > i
                  ? "w-2.5 bg-olive/50"
                  : "w-2.5 bg-border"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleFinish}
          className="text-xs font-semibold text-text-tertiary hover:text-text-primary px-3 py-1.5 rounded-full hover:bg-beige-light transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Center-Aligned Onboarding Content Box */}
      <div className="my-auto py-6 w-full flex flex-col items-center justify-center">
        <div className="w-full bg-[var(--color-card-bg,#FFFDF8)] p-6 sm:p-7 rounded-[22px] border border-border shadow-card">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-olive/10 text-olive flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={22} strokeWidth={1.75} />
                </div>

                <h1 className="font-serif text-2xl font-bold text-text-primary mb-2">
                  What is your atelier called?
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">
                  This will appear on your measurement cards, fittings, and client receipts.
                </p>

                <div className="text-left">
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Studio or Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Adaeze's Bespoke Studio"
                    className="w-full h-12 px-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm sm:text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:border-olive shadow-xs"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-olive/10 text-olive flex items-center justify-center mx-auto mb-4">
                  <Ruler size={22} strokeWidth={1.75} />
                </div>

                <h1 className="font-serif text-2xl font-bold text-text-primary mb-2">
                  How do you take measurements?
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">
                  Choose your preferred tape system. You can switch anytime in settings.
                </p>

                <div className="space-y-2.5 text-left mb-4">
                  <button
                    type="button"
                    onClick={() => setUnit("imperial")}
                    className={`flex items-center justify-between w-full p-3.5 rounded-[var(--radius-card)] border transition-all ${
                      unit === "imperial"
                        ? "border-olive bg-olive/5 ring-1 ring-olive shadow-xs"
                        : "border-border bg-white-warm hover:bg-beige-light/40"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-text-primary">Inches (Imperial)</p>
                      <p className="text-xs text-text-secondary">With tailor fractions: ¼ ½ ¾</p>
                    </div>
                    {unit === "imperial" && (
                      <div className="w-6 h-6 rounded-full bg-olive flex items-center justify-center text-white-warm">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnit("metric")}
                    className={`flex items-center justify-between w-full p-3.5 rounded-[var(--radius-card)] border transition-all ${
                      unit === "metric"
                        ? "border-olive bg-olive/5 ring-1 ring-olive shadow-xs"
                        : "border-border bg-white-warm hover:bg-beige-light/40"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-text-primary">Centimetres (Metric)</p>
                      <p className="text-xs text-text-secondary">With decimal precision: 0.5 cm</p>
                    </div>
                    {unit === "metric" && (
                      <div className="w-6 h-6 rounded-full bg-olive flex items-center justify-center text-white-warm">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                </div>

                {/* Live tape preview */}
                <div className="p-3 bg-beige-light/35 border border-border/80 rounded-[var(--radius-card)] text-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                    Display Preview
                  </p>
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {unit === "imperial" ? "41 ¾ in" : "106.0 cm"}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <h1 className="font-serif text-2xl font-bold text-text-primary mb-2">
                  What garments do you tailor?
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mb-6 leading-relaxed">
                  We will configure your measurement templates and garment studio.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-2">
                  {garmentChips.map(({ name, image, icon: Icon }) => {
                    const isSelected = selectedGarments.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleGarment(name)}
                        className="flex flex-col items-center gap-1.5 active:scale-[0.96] transition-transform"
                      >
                        <div
                          className={`relative w-full aspect-square rounded-2xl overflow-hidden transition-all ${
                            isSelected ? "ring-2 ring-olive" : "ring-1 ring-border"
                          } ${image ? "" : "bg-beige-light flex items-center justify-center"}`}
                        >
                          {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            Icon && <Icon size={26} strokeWidth={1.5} className="text-olive" />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-olive/25 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-olive flex items-center justify-center text-white-warm">
                                <Check size={14} strokeWidth={2.5} />
                              </div>
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isSelected ? "text-olive font-semibold" : "text-text-primary"
                          }`}
                        >
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="w-full pb-safe pt-2">
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-button)] bg-olive text-white-warm font-semibold text-sm sm:text-base hover:bg-olive-deep transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {step === totalSteps - 1 ? (
            <>
              Launch Atelier Studio
              <Check size={18} strokeWidth={2} />
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={18} strokeWidth={1.75} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
