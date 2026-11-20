// Built-in fabric swatches a tailor can attach to an order when they don't
// have a photo of the client's actual material. Images live in
// public/fabrics (licences and credits in public/fabrics/CREDITS.md).

export interface FabricSwatch {
  slug: string;
  name: string;
  src: string;
  family: "African" | "Luxury" | "Everyday";
  /** Photographer / source and licence, shown in the picker. */
  credit: string;
}

export const FABRIC_LIBRARY: FabricSwatch[] = [
  { slug: "ankara", name: "Ankara wax print", src: "/fabrics/ankara.jpg", family: "African", credit: "M_nunoo · CC BY-SA 3.0" },
  { slug: "aso-oke", name: "Aso-oke", src: "/fabrics/aso-oke.jpg", family: "African", credit: "The Met · CC0" },
  { slug: "kente", name: "Kente", src: "/fabrics/kente.jpg", family: "African", credit: "Brooklyn Museum · CC BY 3.0" },
  { slug: "adire", name: "Adire", src: "/fabrics/adire.jpg", family: "African", credit: "Olaniyan Olushola · CC BY-SA 4.0" },
  { slug: "lace", name: "Lace", src: "/fabrics/lace.jpg", family: "Luxury", credit: "Art Institute of Chicago · CC0" },
  { slug: "brocade", name: "Brocade", src: "/fabrics/brocade.jpg", family: "Luxury", credit: "Wonderlane · CC BY 2.0" },
  { slug: "silk", name: "Silk dupion", src: "/fabrics/silk.jpg", family: "Luxury", credit: "Smriti Tripathi · CC BY 3.0" },
  { slug: "satin", name: "Satin", src: "/fabrics/satin.jpg", family: "Luxury", credit: "shaire productions · CC BY 2.0" },
  { slug: "velvet", name: "Velvet", src: "/fabrics/velvet.jpg", family: "Luxury", credit: "sure2talk · CC BY 2.0" },
  { slug: "linen", name: "Linen", src: "/fabrics/linen.jpg", family: "Everyday", credit: "Annie Spratt / Unsplash" },
  { slug: "charcoal-linen", name: "Charcoal linen", src: "/fabrics/charcoal-linen.jpg", family: "Everyday", credit: "Seacoast Sage · CC0" },
  { slug: "tartan-wool", name: "Tartan wool", src: "/fabrics/tartan-wool.jpg", family: "Everyday", credit: "rawpixel · CC0" },
  { slug: "denim", name: "Denim", src: "/fabrics/denim.jpg", family: "Everyday", credit: "SixRevisions · CC BY 2.0" },
  { slug: "indigo-print", name: "Indigo print", src: "/fabrics/indigo-print.jpg", family: "Everyday", credit: "J. Hutchison-King · CC0" },
];

/** Media captions use "<Kind> · <detail>" so photos can be grouped and labelled. */
export type MaterialKind = "Fabric" | "Style" | "Fitting";
export const MATERIAL_KINDS: { value: MaterialKind; label: string; hint: string }[] = [
  { value: "Fabric", label: "Fabric", hint: "The client's material" },
  { value: "Style", label: "Style", hint: "Design or inspiration" },
  { value: "Fitting", label: "Fitting", hint: "Progress or fit photo" },
];

export function makeCaption(kind: MaterialKind, detail?: string) {
  return detail?.trim() ? `${kind} · ${detail.trim()}` : kind;
}

export function parseCaption(caption?: string | null): { kind: MaterialKind; detail?: string } {
  const [head, ...rest] = (caption ?? "").split(" · ");
  const kind = (MATERIAL_KINDS.find(k => k.value === head)?.value ?? "Fabric") as MaterialKind;
  return { kind, detail: rest.join(" · ") || undefined };
}
