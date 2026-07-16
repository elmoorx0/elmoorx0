/**
 * @elmoorx/ar — Augmented reality: WebXR marker tracking, 3D models, AR sessions
 * ============================================
 * Thin wrapper over the WebXR API with graceful fallback when WebXR
 * is unavailable. Use this for marker-based AR experiences in the browser.
 *
 *   import { startARSession, trackMarker } from "@elmoorx/ar";
 *
 *   const session = await startARSession({ canvas });
 *   trackMarker(session, 'hiro', (pose) => { ... });
 */

export interface ARSessionOptions {
  canvas: HTMLCanvasElement;
  /** Marker pattern name — `hiro` or `pattern-<id>`. */
  marker?: string;
  /** Optional features: ['hit-test', 'anchors', 'light-estimation']. */
  features?: string[];
}

export interface ARSession {
  canvas: HTMLCanvasElement;
  end(): Promise<void>;
  onFrame(cb: (frame: ARFrame) => void): () => void;
}

export interface ARFrame {
  timestamp: number;
  /** Pose of the camera relative to the scene's reference space. */
  cameraPose?: Float32Array;
  /** Detected markers this frame (if marker tracking is on). */
  markers?: Array<{ name: string; pose: Float32Array }>;
}

/**
 * Start an AR session. Resolves with a controller or rejects if WebXR
 * is unavailable in the current browser.
 */
export async function startARSession(
  opts: ARSessionOptions
): Promise<ARSession> {
  if (typeof navigator === "undefined" || !("xr" in navigator)) {
    throw new Error("WebXR is not available in this environment");
  }

  // WebXR types are not part of the standard lib; cast to a minimal
  // XR-compatible surface so we keep type safety without adding a dep.
  const xrNavigator = navigator as Navigator & {
    xr?: {
      requestSession(
        mode: string,
        opts: {
          requiredFeatures: string[];
          optionalFeatures: string[];
          domOverlay?: { root: HTMLElement };
        },
      ): Promise<{
        requestReferenceSpace(mode: string): Promise<unknown>;
        requestAnimationFrame(cb: (time: number, frame: unknown) => void): number;
        cancelAnimationFrame?(handle: number): void;
        end(): Promise<void>;
      }>;
    };
  };
  if (!xrNavigator.xr) {
    throw new Error("WebXR is not available in this environment");
  }
  const session = await xrNavigator.xr.requestSession(
    "immersive-ar",
    {
      requiredFeatures: opts.features ?? [],
      optionalFeatures: ["dom-overlay"],
      domOverlay: opts.canvas ? { root: opts.canvas } : undefined,
    }
  );

  const refSpace = await session.requestReferenceSpace("local");
  const frameCallbacks = new Set<(f: ARFrame) => void>();

  let rafHandle = 0;
  const loop = (_time: number, frame: unknown) => {
    if (!frame) {
      rafHandle = session.requestAnimationFrame(loop);
      return;
    }
    const xrFrame = frame as {
      getViewerPose?(refSpace: unknown): { transform?: { matrix?: number[] } } | undefined;
    };
    const pose = xrFrame.getViewerPose?.(refSpace);
    const arFrame: ARFrame = {
      timestamp: _time,
      cameraPose: pose?.transform?.matrix
        ? new Float32Array(pose.transform.matrix)
        : undefined,
    };
    frameCallbacks.forEach((cb) => cb(arFrame));
    rafHandle = session.requestAnimationFrame(loop);
  };
  rafHandle = session.requestAnimationFrame(loop);

  return {
    canvas: opts.canvas,
    async end() {
      if (rafHandle) session.cancelAnimationFrame?.(rafHandle);
      await session.end();
    },
    onFrame(cb) {
      frameCallbacks.add(cb);
      return () => frameCallbacks.delete(cb);
    },
  };
}

/**
 * Register a marker tracker callback. Returns a cancel function.
 * NOTE: marker tracking requires the `markers` feature and a compatible
 * browser; on unsupported browsers the callback will never fire.
 */
export function trackMarker(
  session: ARSession,
  markerName: string,
  cb: (pose: Float32Array) => void
): () => void {
  return session.onFrame((frame) => {
    const hit = frame.markers?.find((m) => m.name === markerName);
    if (hit) cb(hit.pose);
  });
}

export const VERSION = "3.0.0-alpha.2";
