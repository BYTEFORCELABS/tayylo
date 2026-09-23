// ============================================================
// Tayylo — Seed Data (25 clients, 10 orders, measurement history)
// ============================================================
import { v4 as uuid } from "uuid";
import type {
  Business,
  Customer,
  MeasurementTemplate,
  TemplateField,
  MeasurementSet,
  MeasurementValue,
  Order,
  Payment,
  Fitting,
  OrderStatusName,
  Media,
} from "@/types";

// ---- helpers ----
const BIZ_ID = "biz-001";
const now = new Date();
function daysAgo(d: number) {
  return new Date(now.getTime() - d * 86400000).toISOString();
}
function monthsAgo(m: number) {
  const dt = new Date(now);
  dt.setMonth(dt.getMonth() - m);
  return dt.toISOString();
}
function mmToIn(mm: number) {
  return Math.round(mm / 25.4);
}
function inToMm(inches: number) {
  return Math.round(inches * 25.4);
}
function rawFromMm(mm: number, unit: "in" | "cm" = "in"): string {
  if (unit === "cm") return `${Math.round(mm / 10)}`;
  const inches = mm / 25.4;
  const whole = Math.floor(inches);
  const frac = inches - whole;
  if (frac < 0.125) return `${whole}`;
  if (frac < 0.375) return `${whole}¼`;
  if (frac < 0.625) return `${whole}½`;
  if (frac < 0.875) return `${whole}¾`;
  return `${whole + 1}`;
}

// ---- Business ----
export const seedBusiness: Business = {
  id: BIZ_ID,
  name: "Adaeze's Bespoke Studio",
  country: "NG",
  currency: "NGN",
  unitSystem: "imperial",
  timezone: "Africa/Lagos",
  ownerName: "Adaeze",
  garmentTypes: ["Shirt", "Trousers", "Suit", "Agbada", "Kaftan", "Dress"],
  createdAt: monthsAgo(18),
};

// ---- Templates ----
function makeFields(templateId: string, fields: { key: string; label: string; group: string; minMm: number; maxMm: number }[]): TemplateField[] {
  return fields.map((f, i) => ({
    id: uuid(),
    templateId,
    key: f.key,
    label: f.label,
    group: f.group,
    minMm: f.minMm,
    maxMm: f.maxMm,
    sortOrder: i,
  }));
}

const shirtTemplateId = "tpl-shirt";
const trouserTemplateId = "tpl-trousers";
const suitTemplateId = "tpl-suit";
const dressTemplateId = "tpl-dress";
const agbadaTemplateId = "tpl-agbada";
const kaftanTemplateId = "tpl-kaftan";
const boubouTemplateId = "tpl-boubou";
const kurtaTemplateId = "tpl-kurta";
const sareeBlouseTemplateId = "tpl-saree-blouse";
const senatorTemplateId = "tpl-senator";
const waistcoatTemplateId = "tpl-waistcoat";
const jumpsuitTemplateId = "tpl-jumpsuit";
const blazerTemplateId = "tpl-blazer";
const skirtTemplateId = "tpl-skirt";
const dashikiTemplateId = "tpl-dashiki";

export const seedTemplates: MeasurementTemplate[] = [
  {
    id: shirtTemplateId, businessId: null, name: "Shirt", category: "Western", version: 1,
    fields: makeFields(shirtTemplateId, [
      { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder", group: "Torso", minMm: 350, maxMm: 600 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Torso", minMm: 300, maxMm: 550 },
      { key: "bicep", label: "Bicep", group: "Arms", minMm: 250, maxMm: 500 },
      { key: "wrist", label: "Wrist", group: "Arms", minMm: 140, maxMm: 250 },
      { key: "shirt_length", label: "Shirt length", group: "Torso", minMm: 600, maxMm: 900 },
    ]),
  },
  {
    id: trouserTemplateId, businessId: null, name: "Trousers", category: "Western", version: 1,
    fields: makeFields(trouserTemplateId, [
      { key: "trouser_waist", label: "Waist", group: "Waist", minMm: 600, maxMm: 1400 },
      { key: "hips", label: "Hips", group: "Hips", minMm: 750, maxMm: 1500 },
      { key: "thigh", label: "Thigh", group: "Legs", minMm: 400, maxMm: 800 },
      { key: "knee", label: "Knee", group: "Legs", minMm: 300, maxMm: 600 },
      { key: "calf", label: "Calf", group: "Legs", minMm: 280, maxMm: 550 },
      { key: "ankle", label: "Ankle", group: "Legs", minMm: 200, maxMm: 400 },
      { key: "trouser_length", label: "Trouser length", group: "Legs", minMm: 800, maxMm: 1200 },
      { key: "inseam", label: "Inseam", group: "Legs", minMm: 650, maxMm: 1000 },
      { key: "rise", label: "Rise", group: "Waist", minMm: 200, maxMm: 400 },
    ]),
  },
  {
    id: suitTemplateId, businessId: null, name: "Suit", category: "Western", version: 1,
    fields: makeFields(suitTemplateId, [
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
    ]),
  },
  {
    id: dressTemplateId, businessId: null, name: "Dress", category: "Western", version: 1,
    fields: makeFields(dressTemplateId, [
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
    ]),
  },
  {
    id: agbadaTemplateId, businessId: null, name: "Agbada", category: "Traditional", version: 1,
    fields: makeFields(agbadaTemplateId, [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 400, maxMm: 700 },
      { key: "agbada_length", label: "Agbada length", group: "Body", minMm: 1200, maxMm: 1800 },
      { key: "sleeve_width", label: "Sleeve width", group: "Arms", minMm: 600, maxMm: 1200 },
      { key: "neck", label: "Neck", group: "Body", minMm: 300, maxMm: 550 },
      { key: "trouser_waist", label: "Trouser waist", group: "Trousers", minMm: 600, maxMm: 1400 },
      { key: "trouser_length", label: "Trouser length", group: "Trousers", minMm: 800, maxMm: 1200 },
    ]),
  },
  {
    id: kaftanTemplateId, businessId: null, name: "Kaftan", category: "Traditional", version: 1,
    fields: makeFields(kaftanTemplateId, [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 350, maxMm: 600 },
      { key: "kaftan_length", label: "Kaftan length", group: "Body", minMm: 900, maxMm: 1500 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Body", minMm: 300, maxMm: 550 },
      { key: "waist", label: "Waist", group: "Body", minMm: 600, maxMm: 1400 },
    ]),
  },
  {
    id: senatorTemplateId, businessId: null, name: "Senator Suit", category: "Traditional", version: 1,
    fields: makeFields(senatorTemplateId, [
      { key: "chest", label: "Chest", group: "Top", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Top", minMm: 350, maxMm: 600 },
      { key: "top_length", label: "Top length", group: "Top", minMm: 800, maxMm: 1100 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Neck", group: "Top", minMm: 300, maxMm: 550 },
      { key: "trouser_waist", label: "Waist", group: "Trousers", minMm: 600, maxMm: 1400 },
      { key: "trouser_length", label: "Trouser length", group: "Trousers", minMm: 800, maxMm: 1200 },
      { key: "thigh", label: "Thigh", group: "Trousers", minMm: 400, maxMm: 800 },
    ]),
  },
  {
    id: boubouTemplateId, businessId: null, name: "Boubou", category: "Traditional", version: 1,
    fields: makeFields(boubouTemplateId, [
      { key: "bust_chest", label: "Bust / Chest", group: "Body", minMm: 800, maxMm: 1600 },
      { key: "shoulder_to_shoulder", label: "Shoulder span", group: "Body", minMm: 400, maxMm: 750 },
      { key: "boubou_length", label: "Length", group: "Body", minMm: 1200, maxMm: 1700 },
      { key: "sleeve_opening", label: "Sleeve opening", group: "Arms", minMm: 300, maxMm: 700 },
      { key: "neck_width", label: "Neckline width", group: "Body", minMm: 200, maxMm: 400 },
    ]),
  },
  {
    id: kurtaTemplateId, businessId: null, name: "Kurta", category: "Traditional", version: 1,
    fields: makeFields(kurtaTemplateId, [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 350, maxMm: 600 },
      { key: "kurta_length", label: "Kurta length", group: "Body", minMm: 900, maxMm: 1300 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 400, maxMm: 800 },
      { key: "neck", label: "Collar neck", group: "Body", minMm: 300, maxMm: 500 },
      { key: "hip_slit", label: "Hip slit position", group: "Body", minMm: 500, maxMm: 800 },
    ]),
  },
  {
    id: sareeBlouseTemplateId, businessId: null, name: "Saree Blouse", category: "Traditional", version: 1,
    fields: makeFields(sareeBlouseTemplateId, [
      { key: "bust", label: "Bust", group: "Bodice", minMm: 700, maxMm: 1400 },
      { key: "under_bust", label: "Under bust band", group: "Bodice", minMm: 600, maxMm: 1200 },
      { key: "shoulder", label: "Shoulder", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "front_neck_depth", label: "Front neck depth", group: "Bodice", minMm: 100, maxMm: 250 },
      { key: "back_neck_depth", label: "Back neck depth", group: "Bodice", minMm: 100, maxMm: 350 },
      { key: "blouse_length", label: "Blouse length", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 100, maxMm: 600 },
      { key: "armhole", label: "Armhole", group: "Arms", minMm: 300, maxMm: 550 },
    ]),
  },
  {
    id: blazerTemplateId, businessId: null, name: "Blazer / Jacket", category: "Western", version: 1,
    fields: makeFields(blazerTemplateId, [
      { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder", group: "Torso", minMm: 350, maxMm: 600 },
      { key: "sleeve", label: "Sleeve length", group: "Arms", minMm: 450, maxMm: 800 },
      { key: "jacket_length", label: "Jacket length", group: "Torso", minMm: 600, maxMm: 900 },
      { key: "bicep", label: "Bicep", group: "Arms", minMm: 250, maxMm: 500 },
      { key: "back_width", label: "Across back", group: "Torso", minMm: 350, maxMm: 550 },
    ]),
  },
  {
    id: waistcoatTemplateId, businessId: null, name: "Waistcoat / Vest", category: "Western", version: 1,
    fields: makeFields(waistcoatTemplateId, [
      { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
      { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400 },
      { key: "shoulder", label: "Shoulder width", group: "Torso", minMm: 280, maxMm: 450 },
      { key: "front_length", label: "Front length", group: "Torso", minMm: 500, maxMm: 750 },
      { key: "back_length", label: "Back length", group: "Torso", minMm: 450, maxMm: 700 },
    ]),
  },
  {
    id: jumpsuitTemplateId, businessId: null, name: "Jumpsuit", category: "Western", version: 1,
    fields: makeFields(jumpsuitTemplateId, [
      { key: "bust", label: "Bust", group: "Bodice", minMm: 700, maxMm: 1400 },
      { key: "waist", label: "Waist", group: "Bodice", minMm: 550, maxMm: 1200 },
      { key: "hips", label: "Hips", group: "Lower", minMm: 750, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Bodice", minMm: 300, maxMm: 500 },
      { key: "torso_length", label: "Shoulder to crotch", group: "Bodice", minMm: 650, maxMm: 950 },
      { key: "inseam", label: "Inseam", group: "Lower", minMm: 650, maxMm: 1000 },
      { key: "total_length", label: "Total length", group: "Overall", minMm: 1200, maxMm: 1700 },
    ]),
  },
  {
    id: skirtTemplateId, businessId: null, name: "Skirt", category: "Western", version: 1,
    fields: makeFields(skirtTemplateId, [
      { key: "waist", label: "Waist", group: "Waist", minMm: 550, maxMm: 1300 },
      { key: "hips", label: "Hips", group: "Hips", minMm: 750, maxMm: 1500 },
      { key: "skirt_length", label: "Skirt length", group: "Length", minMm: 350, maxMm: 1100 },
      { key: "hem_circumference", label: "Hem width", group: "Length", minMm: 800, maxMm: 2000 },
    ]),
  },
  {
    id: dashikiTemplateId, businessId: null, name: "Dashiki", category: "Traditional", version: 1,
    fields: makeFields(dashikiTemplateId, [
      { key: "chest", label: "Chest", group: "Body", minMm: 700, maxMm: 1500 },
      { key: "shoulder", label: "Shoulder", group: "Body", minMm: 350, maxMm: 650 },
      { key: "dashiki_length", label: "Length", group: "Body", minMm: 700, maxMm: 1000 },
      { key: "sleeve_length", label: "Sleeve length", group: "Arms", minMm: 200, maxMm: 500 },
      { key: "neck_opening", label: "V-neck depth", group: "Body", minMm: 150, maxMm: 300 },
    ]),
  },
];

export const garmentImages: Record<string, string> = {
  "tpl-shirt": "/garments/shirt.jpg",
  "tpl-trousers": "/garments/trousers.jpg",
  "tpl-suit": "/garments/suit.jpg",
  "tpl-dress": "/garments/dress.jpg",
  "tpl-agbada": "/garments/agbada.jpg",
  "tpl-kaftan": "/garments/kaftan.jpg",
  "tpl-senator": "/garments/senator.jpg",
  "tpl-blazer": "/garments/blazer.jpg",
  "tpl-boubou": "/garments/agbada.jpg",
  "tpl-kurta": "/garments/kaftan.jpg",
  "tpl-saree-blouse": "/garments/dress.jpg",
  "tpl-waistcoat": "/garments/suit.jpg",
  "tpl-jumpsuit": "/garments/dress.jpg",
  "tpl-skirt": "/garments/dress.jpg",
  "tpl-dashiki": "/garments/senator.jpg",
};

export const starterTemplates = seedTemplates.map(t => ({
  id: t.id,
  name: t.name,
  category: t.category,
  imageUrl: garmentImages[t.id] || "/garments/suit.jpg",
}));

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

export const allTemplateNames = seedTemplates.map(t => t.name);

// ---- Today's Schedule ----
export const seedSchedule = [
  {
    id: "sch-001",
    time: "10:00",
    type: "fitting" as const,
    title: "Fitting #2 · Navy suit",
    clientName: "John Smith",
    clientId: "cust-001",
    garment: "Navy suit",
    completed: false,
  },
  {
    id: "sch-002",
    time: "12:30",
    type: "measure" as const,
    title: "Measure · Wedding Lehenga",
    clientName: "Priya Nair",
    clientId: "cust-002",
    garment: "Lehenga",
    completed: false,
  },
  {
    id: "sch-003",
    time: "15:00",
    type: "pickup" as const,
    title: "Pickup · White & Gold Agbada",
    clientName: "Kofi Mensah",
    clientId: "cust-003",
    garment: "Agbada",
    completed: false,
  },
];


// ---- Customers ----
const customerNames = [
  { name: "John Smith", phone: "+1 415 555 0142", country: "US" },
  { name: "Priya Nair", phone: "+91 98765 43210", country: "IN" },
  { name: "Kofi Mensah", phone: "+233 20 123 4567", country: "GH" },
  { name: "Adaeze Okafor", phone: "+234 803 456 7890", country: "NG" },
  { name: "Yuki Tanaka", phone: "+81 90 1234 5678", country: "JP" },
  { name: "Carlos Rodriguez", phone: "+52 55 1234 5678", country: "MX" },
  { name: "Fatima Al-Hassan", phone: "+971 50 123 4567", country: "AE" },
  { name: "James Okonkwo", phone: "+234 812 345 6789", country: "NG" },
  { name: "Amara Diallo", phone: "+221 77 123 4567", country: "SN" },
  { name: "Liu Wei", phone: "+86 138 0013 8000", country: "CN" },
  { name: "Oluwaseun Adekunle", phone: "+234 809 876 5432", country: "NG" },
  { name: "Sophie Laurent", phone: "+33 6 12 34 56 78", country: "FR" },
  { name: "Rashid Khan", phone: "+92 300 1234567", country: "PK" },
  { name: "Isabella Costa", phone: "+55 11 98765 4321", country: "BR" },
  { name: "Mohammed Al-Rashidi", phone: "+966 50 123 4567", country: "SA" },
  { name: "Grace Wanjiku", phone: "+254 712 345 678", country: "KE" },
  { name: "Dmitri Volkov", phone: "+7 916 123 4567", country: "RU" },
  { name: "Ngozi Eze", phone: "+234 805 678 9012", country: "NG" },
  { name: "Aisha Bello", phone: "+234 806 111 2222", country: "NG" },
  { name: "Kwame Asante", phone: "+233 24 567 8901", country: "GH" },
  { name: "Sarah Johnson", phone: "+44 7700 900123", country: "GB" },
  { name: "Chinedu Nwosu", phone: "+234 807 333 4444", country: "NG" },
  { name: "Amina Yusuf", phone: "+234 808 555 6666", country: "NG" },
  { name: "David Kim", phone: "+82 10 1234 5678", country: "KR" },
  { name: "Emeka Obi", phone: "+234 810 777 8888", country: "NG" },
];

const customerAvatars: Record<string, string> = {
  "cust-001": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "cust-002": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "cust-003": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "cust-004": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "cust-005": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "cust-006": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "cust-007": "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=150&auto=format&fit=crop&q=80",
  "cust-008": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80",
  "cust-009": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "cust-010": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
};

const customerInitialMedia: Record<string, Media[]> = {
  "cust-001": [
    { id: "m-001", ownerType: "customer", ownerId: "cust-001", url: "/garments/suit.jpg", caption: "Bespoke Navy Three-Piece Suit", createdAt: daysAgo(5) },
    { id: "m-002", ownerType: "customer", ownerId: "cust-001", url: "/garments/shirt.jpg", caption: "French Cuff Oxford Shirt", createdAt: daysAgo(20) },
  ],
  "cust-002": [
    { id: "m-003", ownerType: "customer", ownerId: "cust-002", url: "/garments/dress.jpg", caption: "Emerald Couture Evening Gown", createdAt: daysAgo(14) },
  ],
  "cust-003": [
    { id: "m-004", ownerType: "customer", ownerId: "cust-003", url: "/garments/agbada.jpg", caption: "Royal Gold Embroidered Agbada", createdAt: daysAgo(30) },
  ],
  "cust-004": [
    { id: "m-005", ownerType: "customer", ownerId: "cust-004", url: "/garments/dress.jpg", caption: "Silk Gala Gown", createdAt: daysAgo(3) },
  ],
  "cust-008": [
    { id: "m-006", ownerType: "customer", ownerId: "cust-008", url: "/garments/kaftan.jpg", caption: "Linen & Silk Two-Tone Kaftan", createdAt: daysAgo(7) },
  ],
};

export const seedCustomers: Customer[] = customerNames.map((c, i) => {
  const id = `cust-${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    businessId: BIZ_ID,
    fullName: c.name,
    phones: [c.phone],
    email: i < 10 ? `${c.name.split(" ")[0].toLowerCase()}@example.com` : undefined,
    photoUrl: customerAvatars[id],
    media: customerInitialMedia[id] || [],
    tags: i % 3 === 0 ? ["VIP"] : i % 5 === 0 ? ["Regular"] : [],
    notes: i === 0 ? "Prefers slim fit. Allergic to wool." : i === 3 ? "Referred by John Smith" : undefined,
    createdAt: monthsAgo(Math.floor(Math.random() * 18) + 1),
    updatedAt: daysAgo(Math.floor(Math.random() * 60)),
  };
});

// ---- Measurement Sets ----
function makeValues(templateId: string, baseMm: Record<string, number>): MeasurementValue[] {
  const template = seedTemplates.find(t => t.id === templateId);
  if (!template) return [];
  return template.fields.map(f => {
    const val = baseMm[f.key] || inToMm(30);
    return {
      fieldKey: f.key,
      labelSnapshot: f.label,
      valueMm: val,
      rawInput: rawFromMm(val),
    };
  });
}

export const seedMeasurementSets: MeasurementSet[] = [
  // John Smith - Suit - 2 versions
  {
    id: "ms-001", businessId: BIZ_ID, customerId: "cust-001", templateId: suitTemplateId, templateName: "Suit",
    takenAt: monthsAgo(6), source: "manual", status: "final", note: "Initial measurements",
    values: makeValues(suitTemplateId, { chest: inToMm(41), waist: inToMm(34), shoulder: inToMm(18), sleeve: inToMm(25), neck: inToMm(16), bicep: inToMm(14), jacket_length: inToMm(30), back_width: inToMm(17), trouser_waist: inToMm(34), hips: inToMm(40), thigh: inToMm(24), knee: inToMm(16), trouser_length: inToMm(41), inseam: inToMm(32), calf: inToMm(15), ankle: inToMm(10), rise: inToMm(11), wrist: inToMm(7) }),
  },
  {
    id: "ms-002", businessId: BIZ_ID, customerId: "cust-001", templateId: suitTemplateId, templateName: "Suit",
    takenAt: daysAgo(5), source: "manual", supersedesId: "ms-001", status: "final", note: "Updated — client gained weight",
    values: makeValues(suitTemplateId, { chest: inToMm(42), waist: inToMm(36), shoulder: inToMm(18), sleeve: inToMm(25), neck: inToMm(16.5), bicep: inToMm(14), jacket_length: inToMm(30), back_width: inToMm(17), trouser_waist: inToMm(36), hips: inToMm(41), thigh: inToMm(25), knee: inToMm(16), trouser_length: inToMm(41), inseam: inToMm(32), calf: inToMm(15), ankle: inToMm(10), rise: inToMm(11), wrist: inToMm(7) }),
  },
  // Priya - Dress
  {
    id: "ms-003", businessId: BIZ_ID, customerId: "cust-002", templateId: dressTemplateId, templateName: "Dress",
    takenAt: daysAgo(14), source: "manual", status: "final",
    values: makeValues(dressTemplateId, { bust: inToMm(36), under_bust: inToMm(32), waist: inToMm(28), hips: inToMm(38), shoulder: inToMm(15), sleeve: inToMm(22), dress_length: inToMm(45), bodice_length: inToMm(16), skirt_length: inToMm(30), neck: inToMm(14) }),
  },
  // Kofi - Agbada
  {
    id: "ms-004", businessId: BIZ_ID, customerId: "cust-003", templateId: agbadaTemplateId, templateName: "Agbada",
    takenAt: monthsAgo(12), source: "manual", status: "final",
    values: makeValues(agbadaTemplateId, { chest: inToMm(44), shoulder: inToMm(20), agbada_length: inToMm(60), sleeve_width: inToMm(36), neck: inToMm(17), trouser_waist: inToMm(38), trouser_length: inToMm(42) }),
  },
  // Adaeze - Dress
  {
    id: "ms-005", businessId: BIZ_ID, customerId: "cust-004", templateId: dressTemplateId, templateName: "Dress",
    takenAt: daysAgo(3), source: "manual", status: "final",
    values: makeValues(dressTemplateId, { bust: inToMm(34), under_bust: inToMm(30), waist: inToMm(26), hips: inToMm(36), shoulder: inToMm(14), sleeve: inToMm(20), dress_length: inToMm(42), bodice_length: inToMm(15), skirt_length: inToMm(28), neck: inToMm(13) }),
  },
  // More customers with shirts
  {
    id: "ms-006", businessId: BIZ_ID, customerId: "cust-005", templateId: shirtTemplateId, templateName: "Shirt",
    takenAt: monthsAgo(3), source: "manual", status: "final",
    values: makeValues(shirtTemplateId, { chest: inToMm(38), waist: inToMm(32), shoulder: inToMm(17), sleeve: inToMm(24), neck: inToMm(15), bicep: inToMm(13), wrist: inToMm(7), shirt_length: inToMm(28) }),
  },
  {
    id: "ms-007", businessId: BIZ_ID, customerId: "cust-006", templateId: shirtTemplateId, templateName: "Shirt",
    takenAt: monthsAgo(8), source: "manual", status: "final",
    values: makeValues(shirtTemplateId, { chest: inToMm(40), waist: inToMm(34), shoulder: inToMm(18), sleeve: inToMm(25), neck: inToMm(16), bicep: inToMm(14), wrist: inToMm(7), shirt_length: inToMm(29) }),
  },
  {
    id: "ms-008", businessId: BIZ_ID, customerId: "cust-008", templateId: kaftanTemplateId, templateName: "Kaftan",
    takenAt: daysAgo(30), source: "manual", status: "final",
    values: makeValues(kaftanTemplateId, { chest: inToMm(42), shoulder: inToMm(19), kaftan_length: inToMm(48), sleeve: inToMm(26), neck: inToMm(16), waist: inToMm(36) }),
  },
];

// ---- Orders ----
const statuses: OrderStatusName[] = ["pending", "cutting", "sewing", "fitting", "ready", "delivered"];

export const seedOrders: Order[] = [
  {
    id: "ord-001", businessId: BIZ_ID, customerId: "cust-001", customerName: "John Smith",
    number: "1001", statusName: "sewing", dueAt: daysAgo(-5), createdAt: daysAgo(20), updatedAt: daysAgo(2),
    items: [{ id: "oi-001", orderId: "ord-001", garmentType: "Suit", measurementSetId: "ms-002", styleNotes: "Navy blue, notch lapel, two-button", photos: [], imageUrl: "/garments/suit.jpg" }],
    priceMinor: 85000, currency: "NGN", note: "Client wants it by Friday",
    payments: [{ id: "pay-001", orderId: "ord-001", amountMinor: 42500, paidAt: daysAgo(20), method: "Transfer", reference: "TRF-001" }],
    fittings: [{ id: "fit-001", orderId: "ord-001", number: 1, fittedAt: daysAgo(7), notes: "Slight adjustment on shoulders", outcome: "adjustments_needed", adjustments: [{ fieldKey: "shoulder", label: "Shoulder", deltaMm: inToMm(0.5), rawDelta: "+½" }] }],
  },
  {
    id: "ord-002", businessId: BIZ_ID, customerId: "cust-002", customerName: "Priya Nair",
    number: "1002", statusName: "cutting", dueAt: daysAgo(-2), createdAt: daysAgo(14), updatedAt: daysAgo(5),
    items: [{ id: "oi-002", orderId: "ord-002", garmentType: "Dress", measurementSetId: "ms-003", styleNotes: "Red silk, V-neck, floor length", photos: [], imageUrl: "/garments/dress.jpg" }],
    priceMinor: 120000, currency: "NGN",
    payments: [{ id: "pay-002", orderId: "ord-002", amountMinor: 60000, paidAt: daysAgo(14), method: "Cash" }],
    fittings: [],
  },
  {
    id: "ord-003", businessId: BIZ_ID, customerId: "cust-003", customerName: "Kofi Mensah",
    number: "1003", statusName: "ready", dueAt: daysAgo(0), createdAt: daysAgo(30), updatedAt: daysAgo(1),
    items: [{ id: "oi-003", orderId: "ord-003", garmentType: "Agbada", measurementSetId: "ms-004", styleNotes: "White with gold embroidery", photos: [], imageUrl: "/garments/agbada.jpg" }],
    priceMinor: 150000, currency: "NGN",
    payments: [
      { id: "pay-003", orderId: "ord-003", amountMinor: 75000, paidAt: daysAgo(30), method: "Transfer" },
      { id: "pay-004", orderId: "ord-003", amountMinor: 75000, paidAt: daysAgo(3), method: "Cash" },
    ],
    fittings: [
      { id: "fit-002", orderId: "ord-003", number: 1, fittedAt: daysAgo(10), outcome: "adjustments_needed", adjustments: [{ fieldKey: "agbada_length", label: "Agbada length", deltaMm: inToMm(1), rawDelta: "+1" }] },
      { id: "fit-003", orderId: "ord-003", number: 2, fittedAt: daysAgo(5), outcome: "approved", adjustments: [] },
    ],
  },
  {
    id: "ord-004", businessId: BIZ_ID, customerId: "cust-004", customerName: "Adaeze Okafor",
    number: "1004", statusName: "fitting", dueAt: daysAgo(-7), createdAt: daysAgo(21), updatedAt: daysAgo(3),
    items: [{ id: "oi-004", orderId: "ord-004", garmentType: "Dress", measurementSetId: "ms-005", styleNotes: "Evening gown, emerald green", photos: [], imageUrl: "/garments/dress.jpg" }],
    priceMinor: 95000, currency: "NGN",
    payments: [{ id: "pay-005", orderId: "ord-004", amountMinor: 50000, paidAt: daysAgo(21), method: "Transfer" }],
    fittings: [{ id: "fit-004", orderId: "ord-004", number: 1, fittedAt: daysAgo(3), outcome: "adjustments_needed", adjustments: [{ fieldKey: "waist", label: "Waist", deltaMm: inToMm(-0.5), rawDelta: "-½" }], notes: "Needs to be taken in slightly at the waist" }],
  },
  {
    id: "ord-005", businessId: BIZ_ID, customerId: "cust-008", customerName: "James Okonkwo",
    number: "1005", statusName: "pending", dueAt: daysAgo(-14), createdAt: daysAgo(7), updatedAt: daysAgo(7),
    items: [{ id: "oi-005", orderId: "ord-005", garmentType: "Kaftan", measurementSetId: "ms-008", photos: [], imageUrl: "/garments/kaftan.jpg" }],
    priceMinor: 45000, currency: "NGN",
    payments: [{ id: "pay-006", orderId: "ord-005", amountMinor: 20000, paidAt: daysAgo(7), method: "Cash" }],
    fittings: [],
  },
  {
    id: "ord-006", businessId: BIZ_ID, customerId: "cust-005", customerName: "Yuki Tanaka",
    number: "1006", statusName: "delivered", dueAt: daysAgo(30), createdAt: daysAgo(60), updatedAt: daysAgo(25),
    items: [{ id: "oi-006", orderId: "ord-006", garmentType: "Shirt", measurementSetId: "ms-006", styleNotes: "White linen, Mandarin collar", photos: [], imageUrl: "/garments/shirt.jpg" }],
    priceMinor: 35000, currency: "NGN",
    payments: [
      { id: "pay-007", orderId: "ord-006", amountMinor: 17500, paidAt: daysAgo(60), method: "Transfer" },
      { id: "pay-008", orderId: "ord-006", amountMinor: 17500, paidAt: daysAgo(25), method: "Cash" },
    ],
    fittings: [{ id: "fit-005", orderId: "ord-006", number: 1, fittedAt: daysAgo(35), outcome: "approved", adjustments: [] }],
  },
  {
    id: "ord-007", businessId: BIZ_ID, customerId: "cust-006", customerName: "Carlos Rodriguez",
    number: "1007", statusName: "sewing", dueAt: daysAgo(-3), createdAt: daysAgo(15), updatedAt: daysAgo(4),
    items: [{ id: "oi-007", orderId: "ord-007", garmentType: "Shirt", measurementSetId: "ms-007", styleNotes: "Blue Oxford, button-down collar", photos: [], imageUrl: "/garments/shirt.jpg" }],
    priceMinor: 28000, currency: "NGN",
    payments: [{ id: "pay-009", orderId: "ord-007", amountMinor: 14000, paidAt: daysAgo(15), method: "Transfer" }],
    fittings: [],
  },
  {
    id: "ord-008", businessId: BIZ_ID, customerId: "cust-009", customerName: "Amara Diallo",
    number: "1008", statusName: "cutting", dueAt: daysAgo(-1), createdAt: daysAgo(10), updatedAt: daysAgo(6),
    items: [{ id: "oi-008", orderId: "ord-008", garmentType: "Dress", measurementSetId: "ms-003", styleNotes: "Traditional Senegalese boubou", photos: [], imageUrl: "/garments/agbada.jpg" }],
    priceMinor: 55000, currency: "NGN",
    payments: [],
    fittings: [],
  },
  {
    id: "ord-009", businessId: BIZ_ID, customerId: "cust-011", customerName: "Oluwaseun Adekunle",
    number: "1009", statusName: "pending", dueAt: daysAgo(-10), createdAt: daysAgo(5), updatedAt: daysAgo(5),
    items: [{ id: "oi-009", orderId: "ord-009", garmentType: "Agbada", measurementSetId: "ms-004", styleNotes: "Royal blue with silver embroidery", photos: [], imageUrl: "/garments/agbada.jpg" }],
    priceMinor: 180000, currency: "NGN",
    payments: [{ id: "pay-010", orderId: "ord-009", amountMinor: 90000, paidAt: daysAgo(5), method: "Transfer" }],
    fittings: [],
  },
  {
    id: "ord-010", businessId: BIZ_ID, customerId: "cust-007", customerName: "Fatima Al-Hassan",
    number: "1010", statusName: "delivered", dueAt: daysAgo(45), createdAt: daysAgo(90), updatedAt: daysAgo(40),
    items: [{ id: "oi-010", orderId: "ord-010", garmentType: "Dress", measurementSetId: "ms-003", styleNotes: "Abaya, black with subtle embroidery", photos: [], imageUrl: "/garments/dress.jpg" }],
    priceMinor: 65000, currency: "NGN",
    payments: [
      { id: "pay-011", orderId: "ord-010", amountMinor: 32500, paidAt: daysAgo(90), method: "Transfer" },
      { id: "pay-012", orderId: "ord-010", amountMinor: 32500, paidAt: daysAgo(40), method: "Cash" },
    ],
    fittings: [{ id: "fit-006", orderId: "ord-010", number: 1, fittedAt: daysAgo(50), outcome: "approved", adjustments: [] }],
  },
];
