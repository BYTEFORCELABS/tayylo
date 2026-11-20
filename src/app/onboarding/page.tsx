"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/auth-layout";
import { BackButton } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/choice";
import { Input, Select } from "@/components/ui/input";
import { BrandLoader } from "@/components/brand/brand-loader";
import { businessRepo } from "@/lib/data/store";
import { setCachedBusiness } from "@/lib/use-business";
import { CURRENCIES, currencySymbol, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const GARMENTS = [
  "Suits", "Shirts", "Trousers", "Jackets", "Agbada", "Senator",
  "Kaftan", "Dresses", "Skirts", "Boubou", "Kurta", "Bridal",
];

const STEPS = [
  { key: "studio", label: "Studio", image: "/pictures/happywomanailorwithtab.jpg" },
  { key: "units", label: "Units", image: "/pictures/tailorpic2.jpg" },
  { key: "garments", label: "Garments", image: "/garments/atelier_banner.jpg" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [businessName, setBusinessName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [currency, setCurrency] = React.useState("NGN");
  const [unit, setUnit] = React.useState<"imperial" | "metric">("imperial");
  const [garments, setGarments] = React.useState<string[]>(["Suits", "Shirts", "Agbada", "Senator"]);
  const [nameError, setNameError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth?mode=signin");
  }, [status, router]);

  if (status !== "authenticated") return <BrandLoader label="Preparing setup" />;

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      const updated = await businessRepo.update({
        name: businessName.trim() || "My Atelier",
        ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
        ...(skip ? {} : { currency, unitSystem: unit, garmentTypes: garments }),
      });
      setCachedBusiness(updated);
      router.push("/today");
    } catch {
      toast.error("Couldn't save your setup. Check your connection and try again.");
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 0 && !businessName.trim()) {
      setNameError("Give your studio a name — you can change it later");
      return;
    }
    if (step < STEPS.length - 1) {
      setDir(1);
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const back = () => {
    setDir(-1);
    setStep(s => Math.max(0, s - 1));
  };

  const progress = (
    <div className="flex w-full items-center gap-4">
      {step > 0 ? <BackButton onClick={back} label="Previous step" /> : <span className="size-10 shrink-0" />}
      <div className="flex-1">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-[var(--duration-slow)]",
                i <= step ? "bg-ink" : "bg-surface-sunken"
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-caption text-text-tertiary">
          Step {step + 1} of {STEPS.length} · {STEPS[step].label}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => finish(true)} disabled={saving}>
        Skip
      </Button>
    </div>
  );

  return (
    <AuthLayout top={progress} image={STEPS[step].image} quote="Set up once. Every measurement, order and fitting follows your studio's way of working.">
      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            {step === 0 && (
              <>
                <h1 className="text-title text-ink">What&apos;s your studio called?</h1>
                <p className="mt-2 text-body text-text-secondary">It appears on measurement cards you share with clients.</p>
                <div className="mt-8 space-y-5">
                  <Input
                    label="Studio or business name"
                    placeholder="e.g. Adire House Tailoring"
                    value={businessName}
                    onChange={e => {
                      setBusinessName(e.target.value);
                      setNameError(undefined);
                    }}
                    onKeyDown={e => e.key === "Enter" && next()}
                    error={nameError}
                    autoFocus
                  />
                  <Input
                    label="Your name"
                    hint="Optional"
                    placeholder="So we can greet you"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && next()}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-title text-ink">How do you work?</h1>
                <p className="mt-2 text-body text-text-secondary">Both can be changed later in Settings.</p>

                <fieldset className="mt-8">
                  <legend className="mb-2 text-label font-semibold text-ink">Tape measure</legend>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup">
                    {(
                      [
                        { value: "imperial", title: "Inches", sub: "With ¼ ½ ¾", sample: "41¾" , u: "in" },
                        { value: "metric", title: "Centimetres", sub: "To 0.5 cm", sample: "106.0", u: "cm" },
                      ] as const
                    ).map(o => {
                      const selected = unit === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setUnit(o.value)}
                          className={cn(
                            "relative flex flex-col items-start rounded-[var(--radius-card)] border p-4 text-left transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)]",
                            selected
                              ? "border-ink bg-surface-raised shadow-[0_0_0_1px_var(--color-ink)]"
                              : "border-border bg-surface hover:border-border-strong"
                          )}
                        >
                          <span className="measurement-value text-[28px] font-semibold leading-none text-ink">
                            {o.sample}
                            <span className="ml-1 text-label font-medium text-text-tertiary">{o.u}</span>
                          </span>
                          <span className="mt-4 text-[15px] font-semibold text-ink">{o.title}</span>
                          <span className="text-caption text-text-tertiary">{o.sub}</span>
                          {selected && (
                            <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-ink text-text-inverse">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <Select
                  containerClassName="mt-6"
                  label="Currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  helperText={`Prices will look like ${formatMoney(4500000, currency)}`}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {currencySymbol(c.code)} · {c.name}
                    </option>
                  ))}
                </Select>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-title text-ink">What do you make?</h1>
                <p className="mt-2 text-body text-text-secondary">Pick all that apply. This tailors your workspace — you can still make anything.</p>
                <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Garments">
                  {GARMENTS.map(g => {
                    const selected = garments.includes(g);
                    return (
                      <Chip
                        key={g}
                        selected={selected}
                        onClick={() => setGarments(prev => (selected ? prev.filter(x => x !== g) : [...prev, g]))}
                        leading={selected ? <Check size={14} strokeWidth={2.5} /> : undefined}
                      >
                        {g}
                      </Chip>
                    );
                  })}
                </div>
                <p className="mt-4 text-caption text-text-tertiary">
                  {garments.length} selected
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pt-10">
          <Button size="lg" block onClick={next} loading={saving} disabled={step === 2 && garments.length === 0}>
            {step === STEPS.length - 1 ? (
              <>
                Open my workspace
                <Check />
              </>
            ) : (
              <>
                Continue
                <ArrowRight />
              </>
            )}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
