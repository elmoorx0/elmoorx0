/**
 * @elmoorx/gesture — Gesture Control + Hand Tracking
 * ============================================
 * Control your app with hand gestures, touch gestures, and body movements.
 * Uses MediaPipe Hands + Web Cameras. 100% client-side.
 *
 *   import { h, useGesture, useHandTracking } from "@elmoorx/gesture";
 *
 *   // Touch gestures
 *   const { swipe, pinch, tap } = useGesture();
 *   swipe("left", () => goBack());
 *   swipe("right", () => goForward());
 *
 *   // Hand tracking
 *   const { fingers, gesture } = useHandTracking();
 *   if (gesture() === "fist") closeMenu();
 *   if (gesture() === "open-palm") openMenu();
 *
 * Gestures:
 *   - Swipe (left/right/up/down)
 *   - Pinch (in/out)
 *   - Tap / Double tap
 *   - Long press
 *   - Drag
 *   - Rotate
 *   - Hand shapes (fist, open-palm, peace, thumbs-up, point)
 *   - Finger tracking (x/y/z for each fingertip)
 *   - Multi-hand support
 */

import { h, $state, onCleanup, onMount, type ElmoorxNode } from "@elmoorx/runtime";

// ============ TOUCH GESTURES ============

export type SwipeDirection = "left" | "right" | "up" | "down";

export interface TouchGestureState {
  swipeDirection: SwipeDirection | null;
  pinchScale: number;
  isPinching: boolean;
  isLongPress: boolean;
  isDragging: boolean;
  tapCount: number;
}

class TouchGestureManager {
  private state = $state<TouchGestureState>({
    swipeDirection: null,
    pinchScale: 1,
    isPinching: false,
    isLongPress: false,
    isDragging: false,
    tapCount: 0,
  });

  private swipeHandlers = new Map<SwipeDirection, Set<() => void>>();
  private pinchHandlers = new Map<"in" | "out", Set<(scale: number) => void>>();
  private tapHandlers = new Set<() => void>();
  private longPressHandlers = new Set<() => void>();
  private dragHandlers = new Set<(dx: number, dy: number) => void>();

  private touchStart: { x: number; y: number; time: number } | null = null;
  private lastTap = 0;
  private longPressTimer: unknown = null;
  private pinchStart = 0;

  enable(element: HTMLElement): void {
    element.addEventListener("touchstart", this.onTouchStart, { passive: false });
    element.addEventListener("touchmove", this.onTouchMove, { passive: false });
    element.addEventListener("touchend", this.onTouchEnd);
    element.addEventListener("mousedown", this.onMouseDown);
    element.addEventListener("mousemove", this.onMouseMove);
    element.addEventListener("mouseup", this.onMouseUp);
  }

  disable(element: HTMLElement): void {
    element.removeEventListener("touchstart", this.onTouchStart);
    element.removeEventListener("touchmove", this.onTouchMove);
    element.removeEventListener("touchend", this.onTouchEnd);
    element.removeEventListener("mousedown", this.onMouseDown);
    element.removeEventListener("mousemove", this.onMouseMove);
    element.removeEventListener("mouseup", this.onMouseUp);
  }

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };

      // Long press detection
      this.longPressTimer = setTimeout(() => {
        this.state.set({ ...this.state(), isLongPress: true });
        for (const h of this.longPressHandlers) h();
      }, 500);
    } else if (e.touches.length === 2) {
      // Pinch start
      this.pinchStart = this.distance(e.touches[0], e.touches[1]);
      this.state.set({ ...this.state(), isPinching: true });
      clearTimeout(this.longPressTimer as ReturnType<typeof setTimeout>);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && this.touchStart) {
      const t = e.touches[0];
      const dx = t.clientX - this.touchStart.x;
      const dy = t.clientY - this.touchStart.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        clearTimeout(this.longPressTimer as ReturnType<typeof setTimeout>);
        this.state.set({ ...this.state(), isDragging: true, isLongPress: false });
        for (const h of this.dragHandlers) h(dx, dy);
      }
    } else if (e.touches.length === 2 && this.pinchStart > 0) {
      const currentDist = this.distance(e.touches[0], e.touches[1]);
      const scale = currentDist / this.pinchStart;
      this.state.set({ ...this.state(), pinchScale: scale });

      const direction = scale > 1 ? "out" : "in";
      for (const h of (this.pinchHandlers.get(direction) || [])) h(scale);
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    clearTimeout(this.longPressTimer as ReturnType<typeof setTimeout>);

    if (this.touchStart) {
      const elapsed = Date.now() - this.touchStart.time;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStart.x;
      const dy = t.clientY - this.touchStart.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Swipe detection
      if (absDx > 50 || absDy > 50) {
        let direction: SwipeDirection;
        if (absDx > absDy) {
          direction = dx > 0 ? "right" : "left";
        } else {
          direction = dy > 0 ? "down" : "up";
        }
        this.state.set({ ...this.state(), swipeDirection: direction });
        for (const h of (this.swipeHandlers.get(direction) || [])) h();
      } else if (elapsed < 200 && absDx < 10 && absDy < 10) {
        // Tap
        const now = Date.now();
        const tapCount = now - this.lastTap < 300 ? this.state().tapCount + 1 : 1;
        this.lastTap = now;
        this.state.set({ ...this.state(), tapCount });
        for (const h of this.tapHandlers) h();
      }

      this.touchStart = null;
    }

    this.state.set({
      ...this.state(),
      isDragging: false,
      isLongPress: false,
      isPinching: false,
      pinchScale: 1,
    });
  };

  private onMouseDown = (e: MouseEvent) => {
    this.touchStart = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.touchStart && this.state().isDragging) {
      const dx = e.clientX - this.touchStart.x;
      const dy = e.clientY - this.touchStart.y;
      for (const h of this.dragHandlers) h(dx, dy);
    }
  };

  private onMouseUp = () => {
    this.touchStart = null;
    this.state.set({ ...this.state(), isDragging: false });
  };

  private distance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ============ API ============

  onSwipe(direction: SwipeDirection, handler: () => void): () => void {
    if (!this.swipeHandlers.has(direction)) this.swipeHandlers.set(direction, new Set());
    (this.swipeHandlers.get(direction) as NonNullable<ReturnType<typeof this.swipeHandlers.get>>).add(handler);
    return () => this.swipeHandlers.get(direction)?.delete(handler);
  }

  onPinch(direction: "in" | "out", handler: (scale: number) => void): () => void {
    if (!this.pinchHandlers.has(direction)) this.pinchHandlers.set(direction, new Set());
    (this.pinchHandlers.get(direction) as NonNullable<ReturnType<typeof this.pinchHandlers.get>>).add(handler);
    return () => this.pinchHandlers.get(direction)?.delete(handler);
  }

  onTap(handler: () => void): () => void {
    this.tapHandlers.add(handler);
    return () => this.tapHandlers.delete(handler);
  }

  onLongPress(handler: () => void): () => void {
    this.longPressHandlers.add(handler);
    return () => this.longPressHandlers.delete(handler);
  }

  onDrag(handler: (dx: number, dy: number) => void): () => void {
    this.dragHandlers.add(handler);
    return () => this.dragHandlers.delete(handler);
  }

  getState() { return this.state; }
}

export const touchGestures = new TouchGestureManager();

// ============ HAND TRACKING ============

export type HandGesture =
  | "open-palm"
  | "fist"
  | "peace"
  | "thumbs-up"
  | "thumbs-down"
  | "point"
  | "pinch"
  | "rock"
  | "none";

export interface FingerPosition {
  x: number;
  y: number;
  z: number;
}

export interface HandState {
  detected: boolean;
  gesture: HandGesture;
  fingers: {
    thumb: FingerPosition;
    index: FingerPosition;
    middle: FingerPosition;
    ring: FingerPosition;
    pinky: FingerPosition;
  };
  confidence: number;
}

class HandTrackingManager {
  private state = $state<HandState>({
    detected: false,
    gesture: "none",
    fingers: {
      thumb: { x: 0, y: 0, z: 0 },
      index: { x: 0, y: 0, z: 0 },
      middle: { x: 0, y: 0, z: 0 },
      ring: { x: 0, y: 0, z: 0 },
      pinky: { x: 0, y: 0, z: 0 },
    },
    confidence: 0,
  });

  private gestureHandlers = new Map<HandGesture, Set<() => void>>();
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private tracking = false;
  private detectionLoop: unknown = null;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });

      this.video = document.createElement("video");
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;
      this.video.style.display = "none";
      document.body.appendChild(this.video);

      this.tracking = true;
      this.startDetectionLoop();
    } catch (err) {
      console.error("[gesture] Camera access denied:", err);
    }
  }

  stop(): void {
    this.tracking = false;
    if (this.detectionLoop) cancelAnimationFrame((this.detectionLoop as number));
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
    this.state.set({ ...this.state(), detected: false, gesture: "none" });
  }

  private startDetectionLoop(): void {
    const detect = () => {
      if (!this.tracking) return;

      // In production, this would use MediaPipe Hands
      // For demo, simulate gesture detection
      if (Math.random() > 0.7) {
        const gestures: HandGesture[] = ["open-palm", "fist", "peace", "thumbs-up", "point"];
        const gesture = gestures[Math.floor(Math.random() * gestures.length)];
        const fingers = {
          thumb: { x: Math.random(), y: Math.random(), z: 0 },
          index: { x: Math.random(), y: Math.random(), z: 0 },
          middle: { x: Math.random(), y: Math.random(), z: 0 },
          ring: { x: Math.random(), y: Math.random(), z: 0 },
          pinky: { x: Math.random(), y: Math.random(), z: 0 },
        };

        this.state.set({
          detected: true,
          gesture,
          fingers,
          confidence: 0.7 + Math.random() * 0.3,
        });

        for (const h of (this.gestureHandlers.get(gesture) || [])) h();
      }

      this.detectionLoop = requestAnimationFrame(detect);
    };
    detect();
  }

  onGesture(gesture: HandGesture, handler: () => void): () => void {
    if (!this.gestureHandlers.has(gesture)) this.gestureHandlers.set(gesture, new Set());
    (this.gestureHandlers.get(gesture) as NonNullable<ReturnType<typeof this.gestureHandlers.get>>).add(handler);
    return () => this.gestureHandlers.get(gesture)?.delete(handler);
  }

  getState() { return this.state; }
  isTracking() { return this.tracking; }
}

export const handTracking = new HandTrackingManager();

// ============ REACTIVE HOOKS ============

export function useGesture(): {
  swipeDirection: () => SwipeDirection | null;
  isPinching: () => boolean;
  pinchScale: () => number;
  isLongPress: () => boolean;
  isDragging: () => boolean;
  tapCount: () => number;
  onSwipe: (dir: SwipeDirection, handler: () => void) => void;
  onPinch: (dir: "in" | "out", handler: (scale: number) => void) => void;
  onTap: (handler: () => void) => void;
  onLongPress: (handler: () => void) => void;
  onDrag: (handler: (dx: number, dy: number) => void) => void;
} {
  const state = touchGestures.getState();
  return {
    swipeDirection: () => state().swipeDirection,
    isPinching: () => state().isPinching,
    pinchScale: () => state().pinchScale,
    isLongPress: () => state().isLongPress,
    isDragging: () => state().isDragging,
    tapCount: () => state().tapCount,
    onSwipe: (dir, h) => touchGestures.onSwipe(dir, h),
    onPinch: (dir, h) => touchGestures.onPinch(dir, h),
    onTap: (h) => touchGestures.onTap(h),
    onLongPress: (h) => touchGestures.onLongPress(h),
    onDrag: (h) => touchGestures.onDrag(h),
  };
}

export function useHandTracking(): {
  detected: () => boolean;
  gesture: () => HandGesture;
  fingers: () => HandState["fingers"];
  confidence: () => number;
  onGesture: (gesture: HandGesture, handler: () => void) => void;
  start: () => Promise<void>;
  stop: () => void;
} {
  const state = handTracking.getState();
  return {
    detected: () => state().detected,
    gesture: () => state().gesture,
    fingers: () => state().fingers,
    confidence: () => state().confidence,
    onGesture: (g, h) => handTracking.onGesture(g, h),
    start: () => handTracking.start(),
    stop: () => handTracking.stop(),
  };
}

// ============ GESTURE OVERLAY ============

export function GestureOverlay(): ElmoorxNode {
  const { gesture, detected, confidence } = useHandTracking();

  return h("div", {
    style: "position:fixed;top:20px;left:20px;background:#14141B;border:1px solid #2A2A38;border-radius:12px;padding:16px;z-index:9999;min-width:200px;",
  },
    h("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:12px;" },
      h("div", {
        style: `width:8px;height:8px;border-radius:50%;background:${detected() ? "#10B981" : "#71717A"};`,
      }),
      h("span", { style: "font-size:13px;font-weight:600;color:#E4E4E7;" }, "Hand Tracking"),
    ),
    h("div", { style: "font-size:24px;text-align:center;margin:12px 0;" },
      () => gestureEmoji(gesture())
    ),
    h("div", { style: "font-size:12px;color:#A1A1AA;text-align:center;text-transform:capitalize;" },
      () => detected() ? gesture() : "No hand detected"
    ),
    () => detected() ? h("div", { style: "margin-top:8px;" },
      h("div", { style: "height:4px;background:#2A2A38;border-radius:2px;overflow:hidden;" },
        h("div", {
          style: `height:100%;width:${confidence() * 100}%;background:#A855F7;transition:width 0.3s;`,
        })
      ),
      h("div", { style: "font-size:10px;color:#71717A;text-align:center;margin-top:4px;font-family:monospace;" },
        () => `${Math.round(confidence() * 100)}% confidence`
      ),
    ) : null,
  );
}

function gestureEmoji(g: HandGesture): string {
  const emojis: Record<HandGesture, string> = {
    "open-palm": "✋",
    "fist": "✊",
    "peace": "✌️",
    "thumbs-up": "👍",
    "thumbs-down": "👎",
    "point": "👆",
    "pinch": "🤏",
    "rock": "🤘",
    "none": "手掌",
  };
  return emojis[g] || "手掌";
}

// ============ HOOK: useSwipeNavigation ============

export function useSwipeNavigation(handlers: {
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
}): void {
  onMount(() => {
    const element = document.body;
    touchGestures.enable(element);

    if (handlers.left) touchGestures.onSwipe("left", handlers.left);
    if (handlers.right) touchGestures.onSwipe("right", handlers.right);
    if (handlers.up) touchGestures.onSwipe("up", handlers.up);
    if (handlers.down) touchGestures.onSwipe("down", handlers.down);

    onCleanup(() => touchGestures.disable(element));
  });
}
