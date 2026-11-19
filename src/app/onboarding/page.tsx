"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Layers, Feather, Gem, Shirt } from "lucide-react";
import { businessRepo } from "@/lib/data/store";

// Each entry either has a real reference photo (when we have one that's
// actually distinct for that garment) or falls back to an icon tile -
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

const steps = [
  { image: "/pictures/happywomanailorwithtab.jpg", label: "Atelier" },
  { image: "/pictures/tailorpic2.jpg", label: "Measurements" },
  { image: "/garments/atelier_banner.jpg", label: "Garments" },
];

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36, transition: { duration: 0.18 } }),
};

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 10, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [businessName, setBusinessName] = React.useState("");
  const [unit, setUnit] = React.useState<"imperial" | "metric">("imperial");
  const [selectedGarments, setSelectedGarments] = React.useState<string[]>([
    "Suits", "Shirts", "Agbada", "Senator",
  ]);

  const totalSteps = steps.length;
  const current = steps[step];

  const handleFinish = async () => {
    await businessRepo.update({
      name: businessName.trim() || "Ijeoma's Bespoke Studio",
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

  const goNext = () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col">
      {/* Hero */}
      <div className="relative h-[30dvh] min-h-[190px] shrink-0 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.img
            key={current.image}
            src={current.image}
            alt=""
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full object-cover object-[center_22%]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-olive-deep/55 via-olive-deep/35 to-white-warm" />

        {/* Top nav overlaid on hero */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe pt-4">
          <button
            onClick={goBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm hover:bg-black/35 transition-colors text-white-warm"
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>

          <button
            onClick={handleFinish}
            className="text-xs font-semibold text-white-warm/90 hover:text-white-warm px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-sm hover:bg-black/35 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Sheet */}
      <div className="flex-1 bg-white-warm rounded-t-[32px] -mt-6 relative z-10 shadow-[0_-12px_28px_rgba(0,0,0,0.07)] flex flex-col">
        <div className="max-w-sm mx-auto w-full px-6 pt-5 flex-1">
          {/* Numbered stepper - persists across steps, only its state changes */}
          <div className="flex items-start w-full mb-6">
            {steps.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                      i <= step
                        ? "bg-olive text-white-warm"
                        : "bg-beige-light text-text-tertiary border border-border"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide text-center leading-tight transition-colors duration-300 ${
                      i <= step ? "text-olive" : "text-text-tertiary"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i === step && (
                    <motion.span layoutId="onboarding-step-underline" className="block h-[2px] w-5 bg-olive rounded-full" />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mt-3.5 rounded-full transition-colors duration-300 ${
                      i < step ? "bg-olive" : "bg-border"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 0 && (
                <>
                  <h1 className="font-serif text-3xl font-bold text-text-primary mb-2.5">
                    What is your atelier called?
                  </h1>
                  <p className="text-sm sm:text-base text-text-secondary mb-7 leading-relaxed">
                    This will appear on your measurement cards, fittings, and client receipts.
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">
                      Studio or Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="e.g. Ijeoma's Bespoke Studio"
                      className="w-full h-12 px-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm sm:text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:border-olive shadow-xs"
                      autoFocus
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h1 className="font-serif text-3xl font-bold text-text-primary mb-2.5">
                    How do you take measurements?
                  </h1>
                  <p className="text-sm sm:text-base text-text-secondary mb-7 leading-relaxed">
                    Choose your preferred tape system. You can switch anytime in settings.
                  </p>

                  <div className="space-y-2.5 mb-4">
                    <button
                      type="button"
                      onClick={() => setUnit("imperial")}
                      className={`flex items-center justify-between w-full p-3.5 rounded-[var(--radius-card)] border transition-all ${
                        unit === "imperial"
                          ? "border-olive bg-olive/5 ring-1 ring-olive shadow-xs"
                          : "border-border bg-white-warm hover:bg-beige-light/40"
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-base text-text-primary">Inches (Imperial)</p>
                        <p className="text-sm text-text-secondary">With tailor fractions: ¼ ½ ¾</p>
                      </div>
                      {unit === "imperial" && (
                        <div className="w-6 h-6 rounded-full bg-olive flex items-center justify-center text-white-warm shrink-0">
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
                      <div className="text-left">
                        <p className="font-semibold text-base text-text-primary">Centimetres (Metric)</p>
                        <p className="text-sm text-text-secondary">With decimal precision: 0.5 cm</p>
                      </div>
                      {unit === "metric" && (
                        <div className="w-6 h-6 rounded-full bg-olive flex items-center justify-center text-white-warm shrink-0">
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
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="font-serif text-3xl font-bold text-text-primary mb-2.5">
                    What garments do you tailor?
                  </h1>
                  <p className="text-sm sm:text-base text-text-secondary mb-6 leading-relaxed">
                    We will configure your measurement templates and garment studio.
                  </p>

                  <motion.div
                    variants={gridContainer}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-3 gap-3 mb-2"
                  >
                    {garmentChips.map(({ name, image, icon: Icon }) => {
                      const isSelected = selectedGarments.includes(name);
                      return (
                        <motion.button
                          key={name}
                          variants={gridItem}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleGarment(name)}
                          className="flex flex-col items-center gap-1.5"
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
                            className={`text-sm font-medium ${
                              isSelected ? "text-olive font-semibold" : "text-text-primary"
                            }`}
                          >
                            {name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Action Area */}
        <div className="max-w-sm mx-auto w-full px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <button
            onClick={goNext}
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
    </div>
  );
}
