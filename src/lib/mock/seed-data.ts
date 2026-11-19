// ============================================================
// Tayylo - Presentational garment imagery helpers
//
// Everything that used to live here as seed *data* (businesses, customers,
// measurement sets, templates, orders) now lives in Postgres — see
// prisma/schema.prisma + prisma/seed.ts and the API-backed repos in
// src/lib/data/store.ts. What's left here is pure UI presentation: which
// local image to show for a given garment, since that's a static design
// decision, not user data.
// ============================================================

export const garmentImages: Record<string, string> = {
  Shirt: "/garments/shirt.jpg",
  Trousers: "/garments/trousers.jpg",
  Suit: "/garments/suit.jpg",
  Dress: "/garments/dress.jpg",
  Agbada: "/garments/agbada.jpg",
  Kaftan: "/garments/kaftan.jpg",
  "Senator Suit": "/garments/senator.jpg",
  "Blazer / Jacket": "/garments/blazer.jpg",
  Boubou: "/garments/agbada.jpg",
  Kurta: "/garments/kaftan.jpg",
  "Saree Blouse": "/garments/dress.jpg",
  "Waistcoat / Vest": "/garments/suit.jpg",
  Jumpsuit: "/garments/dress.jpg",
  Skirt: "/garments/dress.jpg",
  Dashiki: "/garments/senator.jpg",
};

export function getGarmentImage(key?: string): string {
  if (!key) return "/garments/suit.jpg";
  const lower = key.toLowerCase();
  if (lower.includes("suit") || lower.includes("waistcoat")) return "/garments/suit.jpg";
  if (lower.includes("agbada") || lower.includes("boubou")) return "/garments/agbada.jpg";
  if (lower.includes("senator") || lower.includes("dashiki")) return "/garments/senator.jpg";
  if (lower.includes("kaftan") || lower.includes("kurta")) return "/garments/kaftan.jpg";
  if (lower.includes("shirt") || lower.includes("oxford")) return "/garments/shirt.jpg";
  if (lower.includes("dress") || lower.includes("gown") || lower.includes("skirt") || lower.includes("saree") || lower.includes("jumpsuit") || lower.includes("lehenga") || lower.includes("bridal")) return "/garments/dress.jpg";
  if (lower.includes("blazer") || lower.includes("jacket")) return "/garments/blazer.jpg";
  if (lower.includes("trouser") || lower.includes("pant")) return "/garments/trousers.jpg";
  return garmentImages[key] || "/garments/suit.jpg";
}

export const garmentCategories = [
  { id: "all", name: "All", count: 24, image: "/garments/suit.jpg" },
  { id: "suits", name: "Suits", count: 8, image: "/garments/suit.jpg" },
  { id: "agbada", name: "Agbada", count: 5, image: "/garments/agbada.jpg" },
  { id: "senator", name: "Senator", count: 6, image: "/garments/senator.jpg" },
  { id: "kaftans", name: "Kaftans", count: 7, image: "/garments/kaftan.jpg" },
  { id: "shirts", name: "Shirts", count: 12, image: "/garments/shirt.jpg" },
  { id: "dresses", name: "Dresses", count: 9, image: "/garments/dress.jpg" },
  { id: "blazers", name: "Blazers", count: 4, image: "/garments/blazer.jpg" },
  { id: "trousers", name: "Trousers", count: 11, image: "/garments/trousers.jpg" },
];
