// Creates two demo accounts (a tailor with sample data, and a customer) plus a
// few Explore posts. Safe to re-run. Run with: npx tsx prisma/seed-demo.ts
//
// DEMO ONLY — these passwords are public. Don't seed them into a real
// production database.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const TAILOR = { email: "demo.tailor@tayylo.app", password: "TayyloTailor1" };
const CUSTOMER = { email: "demo.customer@tayylo.app", password: "TayyloCustomer1" };

async function main() {
  const tailor = await prisma.user.upsert({
    where: { email: TAILOR.email },
    update: { role: "tailor", passwordHash: await bcrypt.hash(TAILOR.password, 10) },
    create: { email: TAILOR.email, role: "tailor", passwordHash: await bcrypt.hash(TAILOR.password, 10) },
  });
  await prisma.user.upsert({
    where: { email: CUSTOMER.email },
    update: { role: "customer", passwordHash: await bcrypt.hash(CUSTOMER.password, 10) },
    create: { email: CUSTOMER.email, role: "customer", passwordHash: await bcrypt.hash(CUSTOMER.password, 10) },
  });

  const business = await prisma.business.upsert({
    where: { ownerId: tailor.id },
    update: {},
    create: {
      ownerId: tailor.id,
      name: "Adire House Tailoring",
      ownerName: "Demo Tailor",
      country: "Nigeria",
      currency: "NGN",
      unitSystem: "metric",
      garmentTypes: ["Agbada", "Senator", "Suit", "Gown"],
    },
  });

  if ((await prisma.customer.count({ where: { businessId: business.id } })) === 0) {
    const ada = await prisma.customer.create({
      data: { businessId: business.id, fullName: "Ada Okafor", phones: ["08031234567"], email: "ada@example.com", tags: ["VIP"] },
    });
    await prisma.customer.create({
      data: { businessId: business.id, fullName: "Tunde Bello", phones: ["08029876543"], tags: [] },
    });
    const due = new Date(Date.now() + 6 * 86_400_000);
    await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: ada.id,
        customerName: ada.fullName,
        number: "1001",
        statusName: "sewing",
        dueAt: due,
        priceMinor: 12_000_000,
        currency: "NGN",
        items: { create: [{ garmentType: "Gown", styleNotes: "Mermaid cut, lace sleeves" }] },
        payments: { create: [{ amountMinor: 6_000_000, method: "Transfer" }] },
      },
    });
  }

  // Demo feed built from the garment, fabric and style photos already in /public.
  // Re-running replaces the demo tailor's posts.
  type Demo = [img: string, w: number, h: number, studio: string, country: string, category: string, caption: string, tags: string[]];
  const demo: Demo[] = [
    ["/explore/indian-embroidered-lehenga.jpg", 821, 1100, "Jaipur Threads", "India", "Wedding & Bridal", "Embroidered maroon and gold bridal lehenga", ["lehenga", "bridal", "embroidery"]],
    ["/explore/tweed-three-piece-suit.jpg", 821, 1100, "Savile & Co.", "United Kingdom", "Formal", "Herringbone tweed three-piece suit", ["tweed", "suit", "bespoke"]],
    ["/explore/japanese-indigo-kimono.jpg", 821, 1100, "Kyoto Indigo", "Japan", "Outerwear", "Shibori indigo kimono jacket with sashiko stitching", ["indigo", "kimono", "shibori"]],
    ["/explore/silk-scarf-collection.jpg", 1100, 821, "Mumbai Silk Works", "India", "Accessories", "Silk scarves and ties in jewel-toned prints", ["silk", "scarf", "accessories"]],
    ["/explore/denim-tailored-jacket.jpg", 1100, 1100, "Brooklyn Denim Lab", "United States", "Casual", "Tailored raw denim jacket with contrast topstitching", ["denim", "jacket"]],
    ["/garments/agbada.jpg", 896, 1200, "Adire House Tailoring", "Nigeria", "Traditional", "Three-piece agbada with hand embroidery", ["agbada", "embroidery"]],
    ["/pictures/bridegown.jpeg", 480, 640, "Lagos Bridal Atelier", "Nigeria", "Wedding & Bridal", "Beaded bridal gown with a long train", ["bridal", "gown"]],
    ["/garments/dress.jpg", 896, 1200, "Maison Accra", "Ghana", "Womenswear", "Structured day dress, clean lines", ["dress"]],
    ["/fabrics/kente.jpg", 800, 800, "Kumasi Weaves", "Ghana", "Traditional", "Kente weave for a ceremonial stole", ["kente", "fabric"]],
    ["/garments/suit.jpg", 896, 1200, "Savile & Co.", "United Kingdom", "Formal", "Two-piece suit, half-canvas construction", ["suit", "bespoke"]],
    ["/pictures/kurtapic.jpg", 613, 1136, "Jaipur Threads", "India", "Traditional", "Embroidered kurta set", ["kurta", "embroidery"]],
    ["/fabrics/ankara.jpg", 620, 620, "Ankara Studio", "Nigeria", "Casual", "Bold ankara print for a statement set", ["ankara", "print"]],
    ["/garments/kaftan.jpg", 896, 1200, "Nairobi Kaftans", "Kenya", "Menswear", "Relaxed kaftan in breathable cotton", ["kaftan"]],
    ["/fabrics/lace.jpg", 340, 340, "Dakar Couture", "Senegal", "Wedding & Bridal", "Lace overlay detail for a wedding dress", ["lace", "bridal"]],
    ["/garments/senator.jpg", 896, 1200, "Abuja Senator Wear", "Nigeria", "Menswear", "Senator set with contrast piping", ["senator"]],
    ["/fabrics/aso-oke.jpg", 500, 500, "Ibadan Aso-Oke", "Nigeria", "Traditional", "Hand-woven aso-oke in magenta", ["aso-oke", "fabric"]],
    ["/garments/blazer.jpg", 896, 1200, "Cape Town Tailors", "South Africa", "Formal", "Soft-shoulder blazer in wool", ["blazer"]],
    ["/fabrics/brocade.jpg", 681, 681, "Istanbul Silk House", "Turkey", "Womenswear", "Metallic brocade for evening wear", ["brocade", "evening"]],
    ["/pictures/skirt.webp", 376, 431, "Studio Lisboa", "Portugal", "Womenswear", "Flared midi skirt", ["skirt"]],
    ["/garments/shirt.jpg", 896, 1200, "Milano Camicie", "Italy", "Menswear", "Tailored shirt with a spread collar", ["shirt"]],
    ["/fabrics/indigo-print.jpg", 768, 768, "Kyoto Indigo", "Japan", "Casual", "Hand-dyed indigo print", ["indigo", "print"]],
    ["/garments/trousers.jpg", 896, 1200, "Savile & Co.", "United Kingdom", "Formal", "High-rise pleated trousers", ["trousers"]],
    ["/fabrics/adire.jpg", 800, 800, "Abeokuta Adire", "Nigeria", "Traditional", "Adire tie-dye pattern study", ["adire", "fabric"]],
    ["/fabrics/velvet.jpg", 800, 800, "Paris Atelier Nord", "France", "Outerwear", "Deep velvet for an evening coat", ["velvet"]],
    ["/fabrics/silk.jpg", 800, 800, "Mumbai Silk Works", "India", "Accessories", "Silk for scarves and ties", ["silk", "accessories"]],
    ["/fabrics/denim.jpg", 687, 687, "Brooklyn Denim Lab", "United States", "Casual", "Raw denim for a tailored jacket", ["denim"]],
    ["/fabrics/satin.jpg", 768, 768, "Maison Accra", "Ghana", "Womenswear", "Satin drape for a slip dress", ["satin"]],
    ["/fabrics/tartan-wool.jpg", 383, 383, "Edinburgh Cloth", "United Kingdom", "Outerwear", "Tartan wool for a winter coat", ["tartan", "wool"]],
  ];
  await prisma.stylePost.deleteMany({ where: { authorId: tailor.id } });
  const now = Date.now();
  for (const [i, [img, w, h, studio, country, category, caption, tags]] of demo.entries()) {
    await prisma.stylePost.create({
      data: {
        authorId: tailor.id,
        authorName: studio,
        country,
        category,
        caption,
        tags,
        imageUrl: img,
        width: w,
        height: h,
        createdAt: new Date(now - i * 3_600_000),
      },
    });
  }

  console.log("Demo accounts ready.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
