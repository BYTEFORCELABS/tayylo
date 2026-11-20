// Example: a tailor taps a measurement field and the body map highlights it.
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MeasurementBodyMap } from "./MeasurementBodyMap";
import { MeasurementIcon } from "./MeasurementIcon";
import { MEASUREMENTS, getMeasurementViews, type BodySex, type BodyView, type MeasurementId } from "./measurementRegistry";

const FIELDS: MeasurementId[] = ["neck", "shoulder-width", "bust", "waist", "hip", "sleeve-length", "thigh", "inseam"];

export function ExampleMeasurementScreen({ sex = "female" as BodySex }) {
  const [selected, setSelected] = useState<MeasurementId>("bust");
  const [view, setView] = useState<BodyView>("front");
  const [values, setValues] = useState<Record<string, string>>({});
  const m = MEASUREMENTS[selected];
  const fields = FIELDS.filter((id) => MEASUREMENTS[id].sexes.includes(sex));

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#FBF8F2" }}>
      <View style={{ alignItems: "center", padding: 16 }}>
        <MeasurementBodyMap sex={sex} view={view} selected={selected} height={440} onViewResolved={setView} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {getMeasurementViews(selected, sex).map((v) => (
            <Pressable key={v} onPress={() => setView(v)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: v === view ? "#3B3631" : "#EFEAE1" }}>
              <Text style={{ color: v === view ? "#FBF8F2" : "#3B3631" }}>{v}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ maxWidth: 240, marginTop: 12, color: "#6E665D" }}>{m.method}</Text>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {fields.map((id) => (
          <Pressable key={id} onPress={() => setSelected(id)}
            style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 12,
                     backgroundColor: id === selected ? "#EFEAE1" : "transparent", borderRadius: 16 }}>
            <MeasurementIcon measurement={id} size={44} />
            <Text style={{ flex: 1, color: "#3B3631" }}>{MEASUREMENTS[id].name}</Text>
            <TextInput keyboardType="decimal-pad" placeholder="cm" value={values[id] ?? ""}
              onFocus={() => setSelected(id)} onChangeText={(t) => setValues((s) => ({ ...s, [id]: t }))}
              style={{ width: 72, padding: 8, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
