"use client";

// Page scaffolding shared by every in-app screen: a fixed top bar that
// always says where you are, a width-constrained body, and titled
// sections. Keeps margins and heading rhythm identical across screens.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { useMe } from "@/lib/use-business";
import { useShell } from "@/components/shell/shell-context";
import { previousPath } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

const widths = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
} as const;

export function PageBody({
  width = "md",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: keyof typeof widths }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-10", widths[width], className)} {...props} />;
}

interface PageHeaderProps {
  title: React.ReactNode;
  /** Small line above the title (date, context). */
  eyebrow?: React.ReactNode;
  /** Muted line under a large title. */
  description?: React.ReactNode;
  /**
   * Shows the back button. Back returns to the previous in-app screen when
   * there is one; otherwise it goes to this fallback route (`true` = Today).
   */
  back?: string | true;
  /** Custom back behaviour (multi-step flows). Takes precedence over `back`. */
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  /** `large` for top-level tabs, `compact` for detail/task screens. */
  variant?: "large" | "compact";
  width?: keyof typeof widths;
  /** Extra rows that stay pinned under the title (search, filters, progress). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The app bar. Fixed to the top of the viewport (offset for the desktop
 * sidebar), with a spacer below it that matches its live height, so it
 * behaves like a native top bar on every browser and container.
 * Large titles collapse to a compact size as soon as the page scrolls.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  back,
  onBack,
  backLabel = "Back",
  actions,
  variant = "large",
  width = "md",
  children,
  className,
}: PageHeaderProps) {
  const { hasSidebar } = useShell();
  const goBack = useBack();
  const pathname = usePathname();
  const { role } = useMe();
  const ref = React.useRef<HTMLElement>(null);
  const [height, setHeight] = React.useState(0);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const backButton =
    onBack || back ? (
      <BackButton label={backLabel} onClick={() => (onBack ? onBack() : goBack(back === true ? "/today" : (back as string)))} />
    ) : null;

  const collapsed = variant === "large" && scrolled;

  // Tailors reach Explore from the top bar of the main tabs (desktop has it in the sidebar).
  const exploreLink =
    role === "tailor" && variant === "large" && !back && !onBack && !pathname.startsWith("/explore") ? (
      <Link
        href="/explore"
        aria-label="Explore styles"
        className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-raised text-ink transition-colors hover:border-border-strong lg:hidden"
      >
        <Compass size={20} strokeWidth={1.75} />
      </Link>
    ) : null;

  return (
    <>
      <header
        ref={ref}
        className={cn(
          "fixed inset-x-0 top-0 z-30 pt-safe",
          "bg-canvas/[0.97] backdrop-blur-xl backdrop-saturate-150",
          "border-b transition-[border-color,box-shadow] duration-[var(--duration-normal)]",
          scrolled || variant === "compact" ? "border-border/80" : "border-transparent",
          scrolled && "shadow-[0_6px_20px_-12px_rgba(30,32,25,0.25)]",
          hasSidebar && "lg:left-64",
          className
        )}
      >
        <PageBody width={width}>
          {variant === "compact" ? (
            <div className="flex h-16 items-center gap-3">
              {backButton}
              <div className="min-w-0 flex-1">
                {eyebrow && <p className="truncate text-caption text-text-tertiary">{eyebrow}</p>}
                <h1 className="truncate text-headline text-ink">{title}</h1>
              </div>
              {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center justify-between gap-3 transition-[padding] duration-[var(--duration-normal)] ease-[var(--ease-out)]",
                collapsed ? "py-3" : "pt-5 pb-4 lg:pt-8"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                {backButton}
                <div className="min-w-0">
                  {eyebrow && (
                    <p
                      className={cn(
                        "truncate text-label text-text-tertiary transition-[max-height,opacity,margin] duration-[var(--duration-normal)]",
                        collapsed ? "mb-0 max-h-0 opacity-0" : "mb-1 max-h-6 opacity-100"
                      )}
                    >
                      {eyebrow}
                    </p>
                  )}
                  <h1
                    className={cn(
                      "truncate font-semibold tracking-tight text-ink transition-[font-size,line-height] duration-[var(--duration-normal)] ease-[var(--ease-out)]",
                      collapsed ? "text-[19px] leading-7" : "text-title"
                    )}
                  >
                    {title}
                  </h1>
                  {description && (
                    <p
                      className={cn(
                        "truncate text-label text-text-secondary transition-[max-height,opacity,margin] duration-[var(--duration-normal)]",
                        collapsed ? "mt-0 max-h-0 opacity-0" : "mt-1 max-h-6 opacity-100"
                      )}
                    >
                      {description}
                    </p>
                  )}
                </div>
              </div>
              {(actions || exploreLink) && (
                <div className="flex shrink-0 items-center gap-2">
                  {exploreLink}
                  {actions}
                </div>
              )}
            </div>
          )}
          {children}
        </PageBody>
      </header>
      {/* Reserves the bar's space in the flow; tracks its height live. */}
      <div aria-hidden style={{ height: height || undefined }} className={height ? undefined : "h-[calc(env(safe-area-inset-top)+64px)]"} />
    </>
  );
}

/**
 * Back navigation used everywhere: returns to the previous in-app screen
 * when there is one, otherwise goes to the given parent route.
 */
export function useBack() {
  const router = useRouter();
  return React.useCallback(
    (fallback = "/today") => {
      if (previousPath()) router.back();
      else router.push(fallback);
    },
    [router]
  );
}

/** The single back button style for the whole product. */
export function BackButton({
  onClick,
  label = "Back",
  className,
  tone = "default",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  /** `inverse` for use over photos / dark surfaces. */
  tone?: "default" | "inverse";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        "transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-90",
        tone === "default"
          ? "border border-border bg-surface-raised text-ink shadow-[var(--shadow-xs)] hover:bg-surface"
          : "bg-black/35 text-white backdrop-blur-md hover:bg-black/50",
        className
      )}
    >
      <ChevronLeft size={22} strokeWidth={2} className="-ml-0.5" />
    </button>
  );
}

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned link ("View all"). */
  action?: { label: string; href?: string; onClick?: () => void };
  trailing?: React.ReactNode;
}

export function Section({ title, description, action, trailing, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("mt-8 first:mt-0", className)} {...props}>
      {(title || action || trailing) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-headline text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-label text-text-tertiary">{description}</p>}
          </div>
          {trailing}
          {action &&
            (action.href ? (
              <Link
                href={action.href}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 -mr-2 text-label font-semibold text-olive hover:bg-olive-soft/60"
              >
                {action.label}
                <ChevronRight size={16} strokeWidth={2} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 -mr-2 text-label font-semibold text-olive hover:bg-olive-soft/60"
              >
                {action.label}
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            ))}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small uppercase label for groups (settings, form sections). */
export function Overline({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-overline uppercase text-text-tertiary", className)} {...props} />;
}
