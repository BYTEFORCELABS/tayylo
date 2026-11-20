import React, { useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { getBodyMapSvg, pickView, type BodySex, type BodyView, type MeasurementId } from "./measurementRegistry";

type Props = {
  sex: BodySex;
  /** Preferred view. If the selected measurement isn't drawn on it, the best available view is used. */
  view?: BodyView;
  selected?: MeasurementId;
  /** Fade in every other measurement on the same view for context. */
  showOthers?: boolean;
  height?: number;
  color?: string;
  accent?: string;
  onViewResolved?: (view: BodyView) => void;
};

export function MeasurementBodyMap({
  sex, view = "front", selected, showOthers = false, height = 420, color = "#3B3631", accent, onViewResolved,
}: Props) {
  const resolvedView = (selected && pickView(selected, sex, view)) || view;
  const xml = useMemo(
    () => getBodyMapSvg({ sex, view: resolvedView, highlight: selected, showOthers, accent }),
    [sex, resolvedView, selected, showOthers, accent]
  );
  React.useEffect(() => onViewResolved?.(resolvedView), [resolvedView]);
  // viewBox is 240 x 520
  return <SvgXml xml={xml} height={height} width={(height * 240) / 520} color={color} />;
}
