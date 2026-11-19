# Tayylo Logo Motion Assets

This pack contains vector SVG masters and Lottie JSON animations traced from the supplied Tayylo logo artwork.

## Files
- `tayylo-lockup-olive.json` / `.svg` — full symbol + wordmark in brand olive (#454F2C)
- `tayylo-lockup-cream.json` / `.svg` — full symbol + wordmark in cream (#F5F1E8)
- `tayylo-symbol-olive.json` / `.svg` — standalone emblem in brand olive
- `tayylo-symbol-cream.json` / `.svg` — standalone emblem in cream

## Animation behavior
The logo reveals in a restrained stagger: the emblem appears first, followed by the wordmark elements. Each element settles upward slightly and scales from 97% to 100%. The animation is 60 fps and 2.1 seconds long. It is designed to play once; trigger it again when the relevant screen or loading state starts.

## Recommended usage
- Use the **olive** assets on cream, beige, or white surfaces.
- Use the **cream** assets on the brand olive background (#454F2C) or other dark surfaces.
- Use the full lockup for onboarding, splash/loading screens, and branded empty states.
- Use the standalone symbol for compact loading indicators, app icon contexts, and tight spaces.
- Preserve aspect ratio. Do not stretch the artwork.

## Web (lottie-web)
Install `lottie-web`, then:
```ts
import lottie from "lottie-web";
import animationData from "@/assets/brand/tayylo-lockup-olive.json";

const animation = lottie.loadAnimation({
  container: document.getElementById("tayylo-logo")!,
  renderer: "svg",
  loop: false,
  autoplay: true,
  animationData,
});
```

## React (lottie-react)
```tsx
import Lottie from "lottie-react";
import animationData from "@/assets/brand/tayylo-lockup-olive.json";

<Lottie animationData={animationData} loop={false} autoplay />;
```

## React Native (lottie-react-native)
```tsx
import LottieView from "lottie-react-native";
import animationData from "./assets/brand/tayylo-symbol-olive.json";

<LottieView source={animationData} autoPlay loop={false} />;
```

## Important
These files are vector-shape Lottie animations, not video/GIF wrappers. Keep the original uploaded PNGs as source references. Before shipping, test the JSON in the exact Lottie renderer/version used by your app, since Lottie renderers can differ slightly in support for shape winding and animation interpolation.
