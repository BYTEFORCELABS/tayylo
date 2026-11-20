// Seeds the 15 global starter measurement templates (businessId: null =
// visible to every tailor, editable by none from the app). Run via
// `npx prisma db seed`. Safe to re-run — each template is skipped if a
// global template of that name already exists.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface FieldInput {
  key: string;
  label: string;
  group: string;
  minMm: number;
  maxMm: number;
}

interface TemplateInput {
  name: string;
  category: string;
  fields: FieldInput[];
}

const templates: TemplateInput[] = [
  {
    name: "Shirt",
    category: "Western",
    fields: [
      { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder", group: "Torso", minMm: 350, maxMm: 600 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Torso", minMm: 300, maxMm: 550 },
      { key: "bicep", label: "Bicep", group: "Arms", minMm: 250, maxMm: 500 },
      { key: "wrist", label: "Wrist", group: "Arms", minMm: 140, maxMm: 250 },
      { key: "shirt_length", label: "Shirt length", group: "Torso", minMm: 600, maxMm: 900 },
    ],
  },
  {
    name: "Trousers",
    category: "Western",
    fields: [
      { key: "trouser_waist", label: "Waist", group: "Waist", minMm: 600, maxMm: 1400 },
      { key: "hips", label: "Hips", group: "Hips", minMm: 750, maxMm: 1500 },
      { key: "thigh", label: "Thigh", group: "Legs", minMm: 400, maxMm: 800 },
      { key: "knee", label: "Knee", group: "Legs", minMm: 300, maxMm: 600 },
      { key: "calf", label: "Calf", group: "Legs", minMm: 280, maxMm: 550 },
      { key: "ankle", label: "Ankle", group: "Legs", minMm: 200, maxMm: 400 },
      { key: "trouser_length", label: "Trouser length", group: "Legs", minMm: 800, maxMm: 1200 },
      { key: "inseam", label: "Inseam", group: "Legs", minMm: 650, maxMm: 1000 },
      { key: "rise", label: "Rise", group: "Waist", minMm: 200, maxMm: 400 },
    ],
  },
  {
    name: "Suit",
    category: "Western",
    fields: [
      { key: "chest", label: "Chest", group: "Jacket", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Jacket", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder", group: "Jacket", minMm: 350, maxMm: 600 },
      { key: "sleeve", label: "Sleeve length", group: "Jacket", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Jacket", minMm: 300, maxMm: 550 },
      { key: "bicep", label: "Bicep", group: "Jacket", minMm: 250, maxMm: 500 },
      { key: "jacket_length", label: "Jacket length", group: "Jacket", minMm: 650, maxMm: 900 },
      { key: "back_width", label: "Back width", group: "Jacket", minMm: 350, maxMm: 550 },
      { key: "trouser_waist", label: "Trouser waist", group: "Trousers", minMm: 600, maxMm: 1400 },
      { key: "hips", label: "Hips", group: "Trousers", minMm: 750, maxMm: 1500 },
      { key: "thigh", label: "Thigh", group: "Trousers", minMm: 400, maxMm: 800 },
      { key: "knee", label: "Knee", group: "Trousers", minMm: 300, maxMm: 600 },
      { key: "trouser_length", label: "Trouser length", group: "Trousers", minMm: 800, maxMm: 1200 },
      { key: "inseam", label: "Inseam", group: "Trousers", minMm: 650, maxMm: 1000 },
      { key: "calf", label: "Calf", group: "Trousers", minMm: 280, maxMm: 550 },
      { key: "ankle", label: "Ankle", group: "Trousers", minMm: 200, maxMm: 400 },
      { key: "rise", label: "Rise", group: "Trousers", minMm: 200, maxMm: 400 },
      { key: "wrist", label: "Wrist", group: "Jacket", minMm: 140, maxMm: 250 },
    ],
  },
  {
    name: "Dress",
    category: "Western",
    fields: [
      { key: "bust", label: "Bust", group: "Bodice", minMm: 700, maxMm: 1400 },
      { key: "under_bust", label: "Under bust", group: "Bodice", minMm: 600, maxMm: 1200 },
      { key: "waist", label: "Waist", group: "Bodice", minMm: 550, maxMm: 1200 },
      { key: "hips", label: "Hips", group: "Skirt", minMm: 750, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 200, maxMm: 700 },
      { key: "dress_length", label: "Dress length", group: "Skirt", minMm: 800, maxMm: 1600 },
      { key: "bodice_length", label: "Bodice length", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "skirt_length", label: "Skirt length", group: "Skirt", minMm: 400, maxMm: 1200 },
      { key: "neck", label: "Neck", group: "Bodice", minMm: 300, maxMm: 480 },
    ],
  },
  {
    name: "Agbada",
    category: "Traditional",
    fields: [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 400, maxMm: 700 },
      { key: "agbada_length", label: "Agbada length", group: "Body", minMm: 1200, maxMm: 1800 },
      { key: "sleeve_width", label: "Sleeve width", group: "Arms", minMm: 600, maxMm: 1200 },
      { key: "neck", label: "Neck", group: "Body", minMm: 300, maxMm: 550 },
      { key: "trouser_waist", label: "Trouser waist", group: "Trousers", minMm: 600, maxMm: 1400 },
      { key: "trouser_length", label: "Trouser length", group: "Trousers", minMm: 800, maxMm: 1200 },
    ],
  },
  {
    name: "Kaftan",
    category: "Traditional",
    fields: [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 350, maxMm: 600 },
      { key: "kaftan_length", label: "Kaftan length", group: "Body", minMm: 900, maxMm: 1500 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Body", minMm: 300, maxMm: 550 },
      { key: "waist", label: "Waist", group: "Body", minMm: 600, maxMm: 1400 },
    ],
  },
  {
    name: "Senator Suit",
    category: "Traditional",
    fields: [
      { key: "chest", label: "Chest", group: "Top", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Top", minMm: 350, maxMm: 600 },
      { key: "top_length", label: "Top length", group: "Top", minMm: 800, maxMm: 1100 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Top", minMm: 300, maxMm: 550 },
      { key: "trouser_waist", label: "Waist", group: "Trousers", minMm: 600, maxMm: 1400 },
      { key: "trouser_length", label: "Trouser length", group: "Trousers", minMm: 800, maxMm: 1200 },
      { key: "thigh", label: "Thigh", group: "Trousers", minMm: 400, maxMm: 800 },
    ],
  },
  {
    name: "Boubou",
    category: "Traditional",
    fields: [
      { key: "bust_chest", label: "Bust / Chest", group: "Body", minMm: 800, maxMm: 1600 },
      { key: "shoulder_to_shoulder", label: "Shoulder span", group: "Body", minMm: 400, maxMm: 750 },
      { key: "boubou_length", label: "Length", group: "Body", minMm: 1200, maxMm: 1700 },
      { key: "sleeve_opening", label: "Sleeve opening", group: "Arms", minMm: 300, maxMm: 700 },
      { key: "neck_width", label: "Neckline width", group: "Body", minMm: 200, maxMm: 400 },
    ],
  },
  {
    name: "Kurta",
    category: "Traditional",
    fields: [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 350, maxMm: 600 },
      { key: "kurta_length", label: "Kurta length", group: "Body", minMm: 900, maxMm: 1300 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Collar neck", group: "Body", minMm: 300, maxMm: 500 },
      { key: "hip_slit", label: "Hip slit position", group: "Body", minMm: 500, maxMm: 800 },
    ],
  },
  {
    name: "Saree Blouse",
    category: "Traditional",
    fields: [
      { key: "bust", label: "Bust", group: "Bodice", minMm: 700, maxMm: 1400 },
      { key: "under_bust", label: "Under bust band", group: "Bodice", minMm: 600, maxMm: 1200 },
      { key: "shoulder", label: "Shoulder", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "front_neck_depth", label: "Front neck depth", group: "Bodice", minMm: 100, maxMm: 250 },
      { key: "back_neck_depth", label: "Back neck depth", group: "Bodice", minMm: 100, maxMm: 350 },
      { key: "blouse_length", label: "Blouse length", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 100, maxMm: 600 },
      { key: "armhole", label: "Armhole", group: "Arms", minMm: 300, maxMm: 550 },
    ],
  },
  {
    name: "Blazer / Jacket",
    category: "Western",
    fields: [
      { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder", group: "Torso", minMm: 350, maxMm: 600 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 450, maxMm: 800 },
      { key: "jacket_length", label: "Jacket length", group: "Torso", minMm: 600, maxMm: 900 },
      { key: "bicep", label: "Bicep", group: "Arms", minMm: 250, maxMm: 500 },
      { key: "back_width", label: "Across back", group: "Torso", minMm: 350, maxMm: 550 },
    ],
  },
  {
    name: "Waistcoat / Vest",
    category: "Western",
    fields: [
      { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder width", group: "Torso", minMm: 280, maxMm: 450 },
      { key: "front_length", label: "Front length", group: "Torso", minMm: 500, maxMm: 750 },
      { key: "back_length", label: "Back length", group: "Torso", minMm: 450, maxMm: 700 },
    ],
  },
  {
    name: "Jumpsuit",
    category: "Western",
    fields: [
      { key: "bust", label: "Bust", group: "Bodice", minMm: 700, maxMm: 1400 },
      { key: "waist", label: "Waist", group: "Bodice", minMm: 550, maxMm: 1200 },
      { key: "hips", label: "Hips", group: "Lower", minMm: 750, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "torso_length", label: "Shoulder to crotch", group: "Bodice", minMm: 650, maxMm: 950 },
      { key: "inseam", label: "Inseam", group: "Lower", minMm: 650, maxMm: 1000 },
      { key: "total_length", label: "Total length", group: "Overall", minMm: 1200, maxMm: 1700 },
    ],
  },
  {
    name: "Skirt",
    category: "Western",
    fields: [
      { key: "waist", label: "Waist", group: "Waist", minMm: 550, maxMm: 1300 },
      { key: "hips", label: "Hips", group: "Hips", minMm: 750, maxMm: 1500 },
      { key: "skirt_length", label: "Skirt length", group: "Length", minMm: 350, maxMm: 1100 },
      { key: "hem_circumference", label: "Hem width", group: "Length", minMm: 800, maxMm: 2000 },
    ],
  },
  {
    name: "Dashiki",
    category: "Traditional",
    fields: [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 350, maxMm: 650 },
      { key: "dashiki_length", label: "Length", group: "Body", minMm: 700, maxMm: 1000 },
      { key: "sleeve_length", label: "Sleeve length", group: "Arms", minMm: 200, maxMm: 500 },
      { key: "neck_opening", label: "V-neck depth", group: "Body", minMm: 150, maxMm: 300 },
    ],
  },
];

async function main() {
  for (const t of templates) {
    const existing = await prisma.measurementTemplate.findFirst({
      where: { businessId: null, name: t.name },
    });
    if (existing) {
      console.log(`Skipping "${t.name}" — already seeded`);
      continue;
    }

    await prisma.measurementTemplate.create({
      data: {
        businessId: null,
        name: t.name,
        category: t.category,
        version: 1,
        fields: {
          create: t.fields.map((f, i) => ({
            key: f.key,
            label: f.label,
            group: f.group,
            minMm: f.minMm,
            maxMm: f.maxMm,
            sortOrder: i,
          })),
        },
      },
    });
    console.log(`Seeded "${t.name}" (${t.fields.length} fields)`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
