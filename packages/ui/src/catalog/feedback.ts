/**
 * @elmoorx/ui — Feedback Components (50 components)
 * 201-250: Feedback, alerts, toasts, modals
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Alert = defineComponent('Alert', { variant: 'info' });
export const AlertTitle = defineComponent('AlertTitle', {});
export const AlertDescription = defineComponent('AlertDescription', {});
export const AlertIcon = defineComponent('AlertIcon', {});
export const Toast = defineComponent('Toast', {});
export const ToastTitle = defineComponent('ToastTitle', {});
export const ToastDescription = defineComponent('ToastDescription', {});
export const ToastAction = defineComponent('ToastAction', {});
export const ToastClose = defineComponent('ToastClose', {});
export const Toaster = defineComponent('Toaster', {});
export const Snackbar = defineComponent('Snackbar', {});
export const SnackbarContent = defineComponent('SnackbarContent', {});
export const SnackbarAction = defineComponent('SnackbarAction', {});
export const Notification = defineComponent('Notification', {});
export const NotificationBadge = defineComponent('NotificationBadge', {});
export const NotificationList = defineComponent('NotificationList', {});
export const NotificationItem = defineComponent('NotificationItem', {});
export const Banner = defineComponent('Banner', {});
export const Callout = defineComponent('Callout', {});
export const CalloutTitle = defineComponent('CalloutTitle', {});
export const CalloutContent = defineComponent('CalloutContent', {});
export const Modal = defineComponent('Modal', { size: 'md' });
export const ModalOverlay = defineComponent('ModalOverlay', {});
export const ModalContent = defineComponent('ModalContent', {});
export const ModalHeader = defineComponent('ModalHeader', {});
export const ModalBody = defineComponent('ModalBody', {});
export const ModalFooter = defineComponent('ModalFooter', {});
export const ModalCloseButton = defineComponent('ModalCloseButton', {});
export const Dialog = defineComponent('Dialog', {});
export const DialogContent = defineComponent('DialogContent', {});
export const DialogHeader = defineComponent('DialogHeader', {});
export const DialogTitle = defineComponent('DialogTitle', {});
export const DialogDescription = defineComponent('DialogDescription', {});
export const DialogFooter = defineComponent('DialogFooter', {});
export const DialogClose = defineComponent('DialogClose', {});
export const ConfirmDialog = defineComponent('ConfirmDialog', {});
export const AlertDialog = defineComponent('AlertDialog', {});
export const Popover = defineComponent('Popover', {});
export const PopoverTrigger = defineComponent('PopoverTrigger', {});
export const PopoverContent = defineComponent('PopoverContent', {});
export const PopoverHeader = defineComponent('PopoverHeader', {});
export const PopoverBody = defineComponent('PopoverBody', {});
export const PopoverFooter = defineComponent('PopoverFooter', {});
export const PopoverArrow = defineComponent('PopoverArrow', {});
export const PopoverClose = defineComponent('PopoverClose', {});
export const Tooltip = defineComponent('Tooltip', { placement: 'top' });
export const TooltipContent = defineComponent('TooltipContent', {});
export const TooltipArrow = defineComponent('TooltipArrow', {});
export const HoverCard = defineComponent('HoverCard', {});
export const HoverCardContent = defineComponent('HoverCardContent', {});
export const Spotlight = defineComponent('Spotlight', {});
export const Coachmark = defineComponent('Coachmark', {});

export const FEEDBACK_COMPONENTS = {
  Alert, AlertTitle, AlertDescription, AlertIcon, Toast, ToastTitle,
  ToastDescription, ToastAction, ToastClose, Toaster, Snackbar, SnackbarContent,
  SnackbarAction, Notification, NotificationBadge, NotificationList,
  NotificationItem, Banner, Callout, CalloutTitle, CalloutContent, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose, ConfirmDialog, AlertDialog,
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody,
  PopoverFooter, PopoverArrow, PopoverClose, Tooltip, TooltipContent,
  TooltipArrow, HoverCard, HoverCardContent, Spotlight, Coachmark,
};
