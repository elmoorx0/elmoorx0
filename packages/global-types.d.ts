/**
 * Elmoorx Framework — Global Type Declarations
 * Provides types for WebXR, ElmoorxNode, and other shared types.
 *
 * NOTE: These are intentionally loose, framework-wide ambient types.
 * Tighter per-package types live under packages/<name>/src/*.ts.
 */

// WebXR types (minimal declarations for ar-vr package).
// Full types are provided by @types/webxr when consumers install it.
declare global {
  interface XRSession {
    end(): Promise<void>;
    addEventListener(type: string, listener: (...args: unknown[]) => void): void;
    removeEventListener(type: string, listener: (...args: unknown[]) => void): void;
    requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  }

  interface XRReferenceSpace {
    getOffsetReferenceSpace(offset: XRReferenceSpace): XRReferenceSpace;
  }

  interface XRViewerPose {
    readonly emulatedPosition: boolean;
    views: ReadonlyArray<XRRigidTransform>;
  }

  interface XRRigidTransform {
    readonly position: DOMPointReadOnly;
    readonly orientation: DOMPointReadOnly;
    matrix: Float32Array;
    inverse: XRRigidTransform;
  }

  interface XRFrame {
    getViewerPose(space: XRReferenceSpace): XRViewerPose | undefined;
  }

  interface XRRenderState {
    baseLayer: XRWebGLLayer | null;
  }

  interface XRWebGLLayer {
    framebuffer: WebGLFramebuffer | null;
    framebufferWidth: number;
    framebufferHeight: number;
  }

  interface XRPresentationContext {
    canvas: HTMLCanvasElement;
  }
}

// ElmoorxNode — the universal virtual node type.
export type ElmoorxNode =
  | string
  | number
  | null
  | undefined
  | boolean
  | ElmoorxElement
  | ElmoorxNode[]
  | (() => ElmoorxNode);

// A component function accepts a props bag and returns a node.
export type ElmoorxComponent<P extends Record<string, unknown> = Record<string, unknown>> = (
  props: P,
) => ElmoorxNode;

export interface ElmoorxElement {
  tag: string | ElmoorxComponent;
  props: Record<string, unknown>;
  children: ElmoorxNode[];
  key?: string | number;
}

// h() function — creates ElmoorxElements.
export declare function h(
  tag: string | ElmoorxComponent,
  props?: Record<string, unknown> | null,
  ...children: ElmoorxNode[]
): ElmoorxElement;

export {};
