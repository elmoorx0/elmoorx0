/**
 * @elmoorx/native — Mobile Native (v2.0)
 * ============================================
 * Compile Elmoorx components to native iOS/Android apps via Skia.
 * One codebase → Web, iOS, Android — truly native rendering.
 *
 *   import { View, Text, Button, StyleSheet } from "@elmoorx/native";
 *
 *   export default function App() {
 *     return h(View, { style: styles.container },
 *       h(Text, null, "Hello from native!"),
 *       h(Button, { title: "Tap me", onPress: () => alert("Hi!") })
 *     );
 *   }
 *
 * Build:
 *   elmoorx build --platform=ios     → Xcode project
 *   elmoorx build --platform=android → Android Studio project
 *
 * The Elmoorx compiler transpiles JSX to Skia draw calls instead of HTML.
 * No WebView — pure native rendering at 60fps.
 */

// ============ NATIVE PRIMITIVES ============

export interface NativeNode {
  type: string;
  props: Record<string, unknown>;
  children: NativeNode[];
  // Internal — Skia draw call ID
  __skiaId?: number;
}

/**
 * Native <View> — equivalent of <div> for native apps.
 * Renders as a UIView (iOS) or android.view.View (Android).
 */
export function View(props: {
  style?: NativeStyle;
  children?: NativeNode[];
  testID?: string;
  accessibilityLabel?: string;
}): NativeNode {
  return {
    type: "View",
    props,
    children: (props.children as NativeNode[]) || [],
  };
}

/**
 * Native <Text> — renders as UILabel (iOS) or TextView (Android).
 */
export function Text(props: {
  style?: NativeStyle;
  children?: string | NativeNode[];
  numberOfLines?: number;
  accessibilityRole?: "none" | "button" | "header" | "link" | "text";
}): NativeNode {
  return {
    type: "Text",
    props,
    children: Array.isArray(props.children) ? props.children : [{ type: "RawText", props: { text: props.children || "" }, children: [] }],
  };
}

/**
 * Native <Button> — renders as UIButton (iOS) or Button (Android).
 */
export function Button(props: {
  title: string;
  onPress: () => void;
  style?: NativeStyle;
  disabled?: boolean;
  color?: string;
}): NativeNode {
  return {
    type: "Button",
    props,
    children: [],
  };
}

/**
 * Native <Image> — renders as UIImageView (iOS) or ImageView (Android).
 */
export function NativeImage(props: {
  source: { uri: string } | number;
  style?: NativeStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
  accessibilityLabel?: string;
}): NativeNode {
  return {
    type: "Image",
    props,
    children: [],
  };
}

/**
 * Native <TextInput> — renders as UITextField (iOS) or EditText (Android).
 */
export function TextInput(props: {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: NativeStyle;
  keyboardType?: "default" | "numeric" | "email" | "phone";
  secureTextEntry?: boolean;
  multiline?: boolean;
}): NativeNode {
  return {
    type: "TextInput",
    props,
    children: [],
  };
}

/**
 * Native <ScrollView> — scrolling container.
 */
export function ScrollView(props: {
  children?: NativeNode[];
  style?: NativeStyle;
  horizontal?: boolean;
  showsScrollIndicator?: boolean;
  onScroll?: (event: NativeScrollEvent) => void;
}): NativeNode {
  return {
    type: "ScrollView",
    props,
    children: (props.children as NativeNode[]) || [],
  };
}

/**
 * Native <FlatList> — virtualized list (uses VirtualList under the hood).
 */
export function FlatList<T>(props: {
  data: T[];
  renderItem: (item: T, index: number) => NativeNode;
  keyExtractor: (item: T, index: number) => string;
  style?: NativeStyle;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}): NativeNode {
  return {
    type: "FlatList",
    props,
    children: [],
  };
}

// ============ STYLES ============

export interface NativeStyle {
  // Layout
  flex?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  flexWrap?: "wrap" | "nowrap";
  // Sizing
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  // Spacing
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  // Border
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  // Background
  backgroundColor?: string;
  // Text
  color?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  fontStyle?: "normal" | "italic";
  textAlign?: "auto" | "left" | "right" | "center" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  // Position
  position?: "absolute" | "relative";
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  // Shadow
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number; // Android
  // Opacity
  opacity?: number;
  // Overflow
  overflow?: "visible" | "hidden" | "scroll";
  // Z-index
  zIndex?: number;
}

/**
 * Create a stylesheet — styles are compiled to native objects at build time.
 *
 *   const styles = StyleSheet.create({
 *     container: { flex: 1, backgroundColor: '#fff' },
 *     text: { fontSize: 16, color: '#333' },
 *   });
 */
export const StyleSheet = {
  create<T extends Record<string, NativeStyle>>(styles: T): T {
    // In a real impl, this would compile to native UIAppearanceProxy (iOS)
    // or XML resources (Android) at build time.
    return styles;
  },

  flatten(style: NativeStyle | NativeStyle[]): NativeStyle {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style);
    }
    return style;
  },
};

// ============ NAVIGATION ============

export interface NativeNavigation {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  setParams: (params: Record<string, unknown>) => void;
  push: (screen: string, params?: Record<string, unknown>) => void;
  pop: () => void;
}

/**
 * useNavigation — access navigation from any screen.
 */
export function useNavigation(): NativeNavigation {
  return {
    navigate: (screen, params) => nativeBridge.navigate(screen, params),
    goBack: () => nativeBridge.goBack(),
    setParams: (params) => nativeBridge.setParams(params),
    push: (screen, params) => nativeBridge.push(screen, params),
    pop: () => nativeBridge.pop(),
  };
}

/**
 * NavigationContainer — wraps the app, manages screen stack.
 */
export function NavigationContainer(props: {
  children: NativeNode;
  initialRouteName?: string;
}): NativeNode {
  return props.children as unknown as NativeNode;
}

/**
 * Stack.Navigator — push/pop navigation.
 */
export function Stack(props: {
  screens: Record<string, (props: { route: { params: Record<string, unknown> } }) => NativeNode>;
  initialRouteName: string;
}): NativeNode {
  return {
    type: "Stack",
    props,
    children: [],
  };
}

// ============ PLATFORM APIs ============

export interface PlatformInfo {
  OS: "ios" | "android" | "web";
  Version: string | number;
  isTV?: boolean;
  isTesting?: boolean;
  select: <T>(specifics: { ios?: T; android?: T; web?: T; default: T }) => T;
}

export const Platform: PlatformInfo = {
  OS: detectPlatform(),
  Version: detectVersion(),
  isTV: false,
  isTesting: false,
  select: (specifics) => {
    const platform = detectPlatform();
    return specifics[platform] ?? specifics.default;
  },
};

function detectPlatform(): "ios" | "android" | "web" {
  if (typeof navigator !== "undefined") {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return "ios";
    if (/Android/.test(navigator.userAgent)) return "android";
    return "web";
  }
  return "web";
}

function detectVersion(): string | number {
  if (typeof navigator === "undefined") return "1";
  const match = navigator.userAgent.match(/OS (\d+)_|Android (\d+)/);
  return match ? parseInt(match[1] || match[2]) : "1";
}

// ============ DEVICE APIs ============

export interface NativeBridge {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  setParams: (params: Record<string, unknown>) => void;
  push: (screen: string, params?: Record<string, unknown>) => void;
  pop: () => void;
  // Device features
  vibrate: (duration?: number) => void;
  share: (content: { title?: string; message?: string; url?: string }) => Promise<void>;
  openURL: (url: string) => Promise<boolean>;
  // Storage
  getStorage: (key: string) => Promise<string | null>;
  setStorage: (key: string, value: string) => Promise<void>;
  // Permissions
  requestPermission: (permission: "camera" | "photos" | "location" | "notifications") => Promise<"granted" | "denied">;
}

const nativeBridge: NativeBridge =
  (globalThis as unknown as { __ELMOORX_NATIVE_BRIDGE__?: NativeBridge }).__ELMOORX_NATIVE_BRIDGE__ || {
    navigate: () => {},
    goBack: () => {},
    setParams: () => {},
    push: () => {},
    pop: () => {},
    vibrate: () => {},
    share: async () => {},
    openURL: async () => false,
    getStorage: async () => null,
    setStorage: async () => {},
    requestPermission: async () => "denied",
  };


// ============ ANIMATION ============

export interface AnimatedValue {
  value: number;
  setValue: (v: number) => void;
  animate: (to: number, opts: { duration?: number; easing?: (t: number) => number }) => Promise<void>;
  interpolate: (inputRange: number[], outputRange: number[]) => number;
}

/**
 * useAnimation — create an animated value.
 *
 *   const opacity = useAnimation(0);
 *   opacity.animate(1, { duration: 500 });
 *   <View style={{ opacity: opacity.value }} />
 */
export function useAnimation(initial: number): AnimatedValue {
  let value = initial;
  let _frameId: number | null = null;

  return {
    get value() { return value; },
    setValue: (v) => { value = v; },
    animate: async (to, opts) => {
      const duration = opts.duration || 300;
      const easing = opts.easing || ((t) => t);
      const start = performance.now();
      const from = value;

      return new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const elapsed = now - start;
          const t = Math.min(elapsed / duration, 1);
          value = from + (to - from) * easing(t);
          if (t < 1) {
            _frameId = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        _frameId = requestAnimationFrame(tick);
      });
    },
    interpolate: (inputRange, outputRange) => {
      const t = Math.max(0, Math.min(1, (value - inputRange[0]) / (inputRange[1] - inputRange[0])));
      return outputRange[0] + t * (outputRange[1] - outputRange[0]);
    },
  };
}

// ============ HAPTICS ============

export const Haptics = {
  impact: (style: "light" | "medium" | "heavy" = "medium") => nativeBridge.vibrate(style === "light" ? 10 : style === "medium" ? 20 : 30),
  notification: (type: "success" | "warning" | "error") => nativeBridge.vibrate(type === "error" ? 50 : 20),
  selection: () => nativeBridge.vibrate(5),
};

// ============ NATIVE EVENTS ============

export interface NativeScrollEvent {
  nativeEvent: {
    contentOffset: { x: number; y: number };
    contentSize: { width: number; height: number };
    layoutMeasurement: { width: number; height: number };
  };
}

export interface NativePressEvent {
  nativeEvent: {
    locationX: number;
    locationY: number;
    pageX: number;
    pageY: number;
  };
}

// ============ APP ENTRY ============

/**
 * AppRegistry — register the root component.
 *
 *   AppRegistry.registerComponent('MyApp', () => App);
 */
export const AppRegistry = {
  registerComponent: (appName: string, component: () => NativeNode): void => {
    const bridge = (globalThis as unknown as { __ELMOORX_NATIVE_BRIDGE__?: { registerRoot?(appName: string, component: () => NativeNode): void } }).__ELMOORX_NATIVE_BRIDGE__;
    if (bridge?.registerRoot) {
      bridge.registerRoot(appName, component);
    }
  },
};
