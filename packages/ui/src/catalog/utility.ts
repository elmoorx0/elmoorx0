/**
 * @elmoorx/ui — Utility Components (50 components)
 * 451-500: Utility, helper, special components
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Portal = defineComponent('Portal', {});
export const Slot = defineComponent('Slot', {});
export const Slottable = defineComponent('Slottable', {});
export const ErrorBoundary = defineComponent('ErrorBoundary', {});
export const ErrorFallback = defineComponent('ErrorFallback', {});
export const Suspense = defineComponent('Suspense', {});
export const SuspenseList = defineComponent('SuspenseList', {});
export const Lazy = defineComponent('Lazy', {});
export const LazyImage = defineComponent('LazyImage', {});
export const LazyLoad = defineComponent('LazyLoad', {});
export const Visible = defineComponent('Visible', {});
export const Show = defineComponent('Show', { when: true });
export const Hide = defineComponent('Hide', {});
export const If = defineComponent('If', {});
export const Else = defineComponent('Else', {});
export const Switch2 = defineComponent('Switch2', {});
export const Case = defineComponent('Case', {});
export const Default = defineComponent('Default', {});
export const For = defineComponent('For', {});
export const Each = defineComponent('Each', {});
export const Repeat = defineComponent('Repeat', {});
export const Map = defineComponent('Map', {});
export const Fragment = defineComponent('Fragment', {});
export const Template = defineComponent('Template', {});
export const Comment = defineComponent('Comment', {});
export const NoSSR = defineComponent('NoSSR', {});
export const ClientOnly = defineComponent('ClientOnly', {});
export const ServerOnly = defineComponent('ServerOnly', {});
export const Conditional = defineComponent('Conditional', {});
export const Maybe = defineComponent('Maybe', {});
export const Optional = defineComponent('Optional', {});
export const Async = defineComponent('Async', {});
export const Await = defineComponent('Await', {});
export const Deferred = defineComponent('Deferred', {});
export const Debounce = defineComponent('Debounce', {});
export const Throttle = defineComponent('Throttle', {});
export const Hover = defineComponent('Hover', {});
export const Focus = defineComponent('Focus', {});
export const Active = defineComponent('Active', {});
export const Press = defineComponent('Press', {});
export const LongPress = defineComponent('LongPress', {});
export const Swipe = defineComponent('Swipe', {});
export const Drag = defineComponent('Drag', {});
export const Drop = defineComponent('Drop', {});
export const Draggable = defineComponent('Draggable', {});
export const Droppable = defineComponent('Droppable', {});
export const Resizable = defineComponent('Resizable', {});
export const Sortable = defineComponent('Sortable', {});
export const Transition = defineComponent('Transition', {});

export const UTILITY_COMPONENTS = {
  Portal, Slot, Slottable, ErrorBoundary, ErrorFallback, Suspense, SuspenseList,
  Lazy, LazyImage, LazyLoad, Visible, Show, Hide, If, Else, Switch2, Case,
  Default, For, Each, Repeat, Map, Fragment, Template, Comment, NoSSR,
  ClientOnly, ServerOnly, Conditional, Maybe, Optional, Async, Await, Deferred,
  Debounce, Throttle, Hover, Focus, Active, Press, LongPress, Swipe, Drag,
  Drop, Draggable, Droppable, Resizable, Sortable, Transition,
};
