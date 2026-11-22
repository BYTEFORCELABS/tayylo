import { describe, expect, it } from "vitest";
import type { MeasurementSet, MeasurementTemplate } from "@/types";
import { buildRows, fieldInfoFor, shareText } from "@/lib/measurements";

const template = {
  id: "t1",
  name: "Shirt",
  fields: [
    { key: "waist", label: "Waist", group: "Torso", sortOrder: 1 },
    { key: "chest", label: "Chest", group: "Torso", sortOrder: 0 },
    { key: "sleeve", label: "Sleeve", group: "Arms", sortOrder: 2 },
  ],
} as unknown as MeasurementTemplate;

function set(values: [string, string, number][], templateName = "Shirt"): MeasurementSet {
  return {
    id: "s",
    templateId: "t1",
    templateName,
    values: values.map(([fieldKey, labelSnapshot, valueMm]) => ({ fieldKey, labelSnapshot, valueMm, rawInput: "" })),
  } as unknown as MeasurementSet;
}

describe("fieldInfoFor", () => {
  it("maps field keys to group and sort order", () => {
    expect(fieldInfoFor([template], "t1")).toEqual({
      waist: { group: "Torso", sortOrder: 1 },
      chest: { group: "Torso", sortOrder: 0 },
      sleeve: { group: "Arms", sortOrder: 2 },
    });
  });
  it("is empty for an unknown template", () => {
    expect(fieldInfoFor([template], "nope")).toEqual({});
    expect(fieldInfoFor([], "t1")).toEqual({});
  });
});

describe("buildRows", () => {
  const info = fieldInfoFor([template], "t1");

  it("sorts by template order, unknown fields last, with group and unit", () => {
    const rows = buildRows(set([["custom", "Custom", 500], ["sleeve", "Sleeve", 600], ["chest", "Chest", 1000]]), "metric", info);
    expect(rows.map(r => r.key)).toEqual(["chest", "sleeve", "custom"]);
    expect(rows[0]).toEqual({ key: "chest", label: "Chest", group: "Torso", value: "100.0", unit: "cm", delta: undefined });
    expect(rows[2].group).toBeUndefined();
  });

  it("does not mutate the input values order", () => {
    const s = set([["sleeve", "Sleeve", 600], ["chest", "Chest", 1000]]);
    buildRows(s, "metric", info);
    expect(s.values.map(v => v.fieldKey)).toEqual(["sleeve", "chest"]);
  });

  it("adds deltas against the previous set only where they changed", () => {
    const prev = set([["chest", "Chest", 1000], ["waist", "Waist", 900]]);
    const cur = set([["chest", "Chest", 1010], ["waist", "Waist", 900], ["sleeve", "Sleeve", 600]]);
    const rows = buildRows(cur, "metric", info, prev);
    expect(rows.find(r => r.key === "chest")!.delta).toEqual({ label: "+1.0 cm", direction: "up" });
    expect(rows.find(r => r.key === "waist")!.delta).toBeUndefined();
    expect(rows.find(r => r.key === "sleeve")!.delta).toBeUndefined();
  });

  it("imperial values and downward deltas", () => {
    const prev = set([["chest", "Chest", 1029]]);
    const rows = buildRows(set([["chest", "Chest", 1016]]), "imperial", info, prev);
    expect(rows[0]).toMatchObject({ value: "40", unit: "in", delta: { label: "−½ in", direction: "down" } });
  });

  it("handles an empty set and a null previous", () => {
    expect(buildRows(set([]), "metric", info, null)).toEqual([]);
  });
});

describe("shareText", () => {
  it("builds the WhatsApp card", () => {
    const text = shareText({
      businessName: "  Lagos Atelier ",
      clientName: "Ada",
      set: set([["chest", "Chest", 1000], ["waist", "Waist", 905]]),
      unit: "metric",
      dateLabel: "5 Mar 2026",
    });
    expect(text).toBe(
      [
        "*Ada — Shirt measurements*",
        "Taken by Lagos Atelier on 5 Mar 2026",
        "",
        "Chest: 100.0 cm",
        "Waist: 90.5 cm",
        "",
        "_Measured and recorded with Tayylo_",
      ].join("\n"),
    );
  });

  it("falls back to 'your tailor' when there's no business name", () => {
    const text = shareText({ businessName: "   ", clientName: "Ada", set: set([]), unit: "imperial", dateLabel: "today" });
    expect(text.split("\n")[1]).toBe("Taken by your tailor on today");
  });
});
