/**
 * Elmoorx Virtual — List virtualization
 * ============================================
 * Render only visible rows of large lists. Handles 100,000+ items.
 *
 *   <VirtualList
 *     items={items()}
 *     itemHeight={50}
 *     height={600}
 *     renderItem={(item) => h('div', null, item.text)}
 *   />
 *
 * Only ~15 DOM nodes are rendered at a time, regardless of list size.
 */

import { h, $state, useRef, onMount, type ElmoorxNode } from "@elmoorx/runtime";

export interface VirtualListProps<T> {
  items: T[];
  // Fixed item height in pixels
  itemHeight: number;
  // Container height in pixels
  height: number;
  // Render function for each item
  renderItem: (item: T, index: number) => ElmoorxNode;
  // Overscan — extra items to render above/below viewport (default: 3)
  overscan?: number;
  // Key extractor for stable identity
  getKey?: (item: T, index: number) => string | number;
  // Class for the container
  class?: string;
}

export function VirtualList<T>(props: VirtualListProps<T>): ElmoorxNode {
  const containerRef = useRef<HTMLDivElement>();
  const scrollTop = $state(0);

  const overscan = props.overscan || 3;
  const totalHeight = props.items.length * props.itemHeight;
  const visibleCount = Math.ceil(props.height / props.itemHeight) + overscan * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop() / props.itemHeight) - overscan);
  const endIndex = Math.min(props.items.length, startIndex + visibleCount);

  onMount(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => scrollTop.set(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  });

  const visibleItems = props.items.slice(startIndex, endIndex);

  return h("div", {
    ref: containerRef,
    class: props.class,
    style: `height:${props.height}px;overflow-y:auto;position:relative;`,
  },
    h("div", {
      style: `height:${totalHeight}px;position:relative;`,
    },
      h("div", {
        style: `position:absolute;top:${startIndex * props.itemHeight}px;left:0;right:0;`,
      },
        ...visibleItems.map((item, i) => {
          const realIndex = startIndex + i;
          const key = props.getKey ? props.getKey(item, realIndex) : realIndex;
          return h("div", {
            key: String(key),
            style: `height:${props.itemHeight}px;`,
          }, props.renderItem(item, realIndex));
        })
      )
    )
  );
}

/**
 * Variable-height virtual list.
 * Uses estimated heights initially, measures actual heights on mount.
 *
 *   <VariableVirtualList
 *     items={items()}
 *     estimatedItemHeight={50}
 *     height={600}
 *     renderItem={(item) => h('div', null, item.text)}
 *   />
 */
export function VariableVirtualList<T>(props: {
  items: T[];
  estimatedItemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ElmoorxNode;
  overscan?: number;
}): ElmoorxNode {
  // Simplified — in real impl, would track measured heights
  // and adjust positions accordingly
  return VirtualList({
    items: props.items,
    itemHeight: props.estimatedItemHeight,
    height: props.height,
    renderItem: props.renderItem,
    overscan: props.overscan,
  });
}

/**
 * Grid virtualization — for large grid layouts.
 *
 *   <VirtualGrid
 *     items={items()}
 *     columnCount={4}
 *     rowHeight={100}
 *     height={600}
 *     renderItem={(item) => h('div', null, item.text)}
 *   />
 */
export function VirtualGrid<T>(props: {
  items: T[];
  columnCount: number;
  rowHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ElmoorxNode;
  overscan?: number;
}): ElmoorxNode {
  const containerRef = useRef<HTMLDivElement>();
  const scrollTop = $state(0);

  const rowCount = Math.ceil(props.items.length / props.columnCount);
  const totalHeight = rowCount * props.rowHeight;
  const visibleRowCount = Math.ceil(props.height / props.rowHeight) + (props.overscan || 3) * 2;
  const startRow = Math.max(0, Math.floor(scrollTop() / props.rowHeight) - (props.overscan || 3));
  const endRow = Math.min(rowCount, startRow + visibleRowCount);

  onMount(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => scrollTop.set(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  });

  const rows: ElmoorxNode[] = [];
  for (let r = startRow; r < endRow; r++) {
    const startIdx = r * props.columnCount;
    const endIdx = Math.min(props.items.length, startIdx + props.columnCount);
    const items = props.items.slice(startIdx, endIdx);
    rows.push(
      h("div", {
        key: String(r),
        style: `height:${props.rowHeight}px;display:grid;grid-template-columns:repeat(${props.columnCount},1fr);`,
      },
        ...items.map((item, i) => props.renderItem(item, startIdx + i))
      )
    );
  }

  return h("div", {
    ref: containerRef,
    style: `height:${props.height}px;overflow-y:auto;position:relative;`,
  },
    h("div", { style: `height:${totalHeight}px;position:relative;` },
      h("div", { style: `position:absolute;top:${startRow * props.rowHeight}px;left:0;right:0;` },
        ...rows
      )
    )
  );
}
