// ============================================================
// Tayylo — Core TypeScript Types
// ============================================================

export type UnitSystem = "metric" | "imperial";

export interface Business {
  id: string;
  name: string;
  country: string;
  currency: string;
  unitSystem: UnitSystem;
  timezone: string;
  ownerName: string;
  garmentTypes: string[];
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  fullName: string;
  phones: string[];
  email?: string;
  tags: string[];
  notes?: string;
  photoUrl?: string;
  media?: Media[];
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementTemplate {
  id: string;
  businessId: string | null; // null = system template
  name: string;
  category: string;
  fields: TemplateField[];
  version: number;
  imageUrl?: string;
  archivedAt?: string;
}

export interface TemplateField {
  id: string;
  templateId: string;
  key: string;
  label: string;
  group: string;
  minMm?: number;
  maxMm?: number;
  sortOrder: number;
  diagramRef?: string;
}

export interface MeasurementSet {
  id: string;
  businessId: string;
  customerId: string;
  templateId: string;
  templateName: string;
  takenAt: string;
  takenBy?: string;
  source: "manual" | "import" | "restored";
  supersedesId?: string;
  note?: string;
  status: "draft" | "final";
  values: MeasurementValue[];
}

export interface MeasurementValue {
  fieldKey: string;
  labelSnapshot: string;
  valueMm: number;
  rawInput: string;
}

export type OrderStatusName =
  | "pending"
  | "cutting"
  | "sewing"
  | "fitting"
  | "alterations"
  | "ready"
  | "delivered"
  | "cancelled";

export interface OrderStatus {
  id: string;
  businessId: string;
  name: OrderStatusName;
  sort: number;
  isTerminal: boolean;
}

export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  number: string;
  statusName: OrderStatusName;
  items: OrderItem[];
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
  priceMinor: number;
  currency: string;
  payments: Payment[];
  fittings: Fitting[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  garmentType: string;
  measurementSetId: string;
  styleNotes?: string;
  photos: string[];
  imageUrl?: string;
}

export interface Fitting {
  id: string;
  orderId: string;
  number: number;
  fittedAt: string;
  notes?: string;
  outcome: "adjustments_needed" | "approved" | "skipped";
  adjustments: FittingAdjustment[];
  resultingSetId?: string;
}

export interface FittingAdjustment {
  fieldKey: string;
  label: string;
  deltaMm: number;
  rawDelta: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amountMinor: number;
  paidAt: string;
  method: string;
  reference?: string;
}

export interface Media {
  id: string;
  ownerType: "customer" | "order" | "fitting";
  ownerId: string;
  url: string;
  caption?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  ownerType: "customer" | "order" | "fitting";
  ownerId: string;
  content: string;
  createdAt: string;
  author?: string;
}

export interface ScheduleItem {
  id: string;
  time: string; // e.g. "10:00"
  type: "fitting" | "measure" | "pickup";
  title: string;
  clientName: string;
  clientId: string;
  garment: string;
  completed?: boolean;
}
