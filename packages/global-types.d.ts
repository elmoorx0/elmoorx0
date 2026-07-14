/**
 * Elmoorx Framework — Global Type Declarations
 * Provides types for WebXR, ElmoorxNode, and other shared types
 */

// WebXR types (minimal declarations for ar-vr package)
declare global {
  interface XRSession {
    end(): Promise<void>;
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
    requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  }

  interface XRReferenceSpace {
    getOffsetReferenceSpace(offset: any): XRReferenceSpace;
  }

  interface XRFrame {
    getViewerPose(space: XRReferenceSpace): any;
  }

  interface XRRenderState {
    baseLayer: any;
  }

  interface XRPresentationContext {
    canvas: HTMLCanvasElement;
  }
}

// ElmoorxNode — the universal virtual node type
export type ElmoorxNode =
  | string
  | number
  | null
  | undefined
  | boolean
  | ElmoorxElement
  | ElmoorxNode[]
  | (() => ElmoorxNode);

export interface ElmoorxElement {
  tag: string | Function;
  props: Record<string, any>;
  children: ElmoorxNode[];
  key?: string | number;
}

// h() function — creates ElmoorxElements
export declare function h(
  tag: string | Function,
  props?: Record<string, any> | null,
  ...children: ElmoorxNode[]
): ElmoorxElement;

export {};
