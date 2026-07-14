/**
 * @elmoorx/ui — Overlays Components (50 components)
 * 351-400: Modals, popovers, menus, overlays
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Overlay = defineComponent('Overlay', {});
export const Backdrop = defineComponent('Backdrop', {});
export const Modal2 = defineComponent('Modal2', {});
export const ModalDialog = defineComponent('ModalDialog', {});
export const BasicModal = defineComponent('BasicModal', {});
export const FullScreenModal = defineComponent('FullScreenModal', {});
export const CenteredModal = defineComponent('CenteredModal', {});
export const SideModal = defineComponent('SideModal', {});
export const BottomModal = defineComponent('BottomModal', {});
export const TopModal = defineComponent('TopModal', {});
export const ModalManager = defineComponent('ModalManager', {});
export const Drawer2 = defineComponent('Drawer2', {});
export const LeftDrawer = defineComponent('LeftDrawer', {});
export const RightDrawer = defineComponent('RightDrawer', {});
export const TopDrawer = defineComponent('TopDrawer', {});
export const BottomDrawer = defineComponent('BottomDrawer', {});
export const DrawerManager = defineComponent('DrawerManager', {});
export const Popover2 = defineComponent('Popover2', {});
export const PopoverContent2 = defineComponent('PopoverContent2', {});
export const HoverPopover = defineComponent('HoverPopover', {});
export const ClickPopover = defineComponent('ClickPopover', {});
export const FocusPopover = defineComponent('FocusPopover', {});
export const Tooltip2 = defineComponent('Tooltip2', {});
export const TopTooltip = defineComponent('TopTooltip', {});
export const BottomTooltip = defineComponent('BottomTooltip', {});
export const LeftTooltip = defineComponent('LeftTooltip', {});
export const RightTooltip = defineComponent('RightTooltip', {});
export const RichTooltip = defineComponent('RichTooltip', {});
export const TooltipManager = defineComponent('TooltipManager', {});
export const Menu2 = defineComponent('Menu2', {});
export const MenuList2 = defineComponent('MenuList2', {});
export const MenuItem2 = defineComponent('MenuItem2', {});
export const MenuButton2 = defineComponent('MenuButton2', {});
export const MenuTrigger = defineComponent('MenuTrigger', {});
export const MenuContent = defineComponent('MenuContent', {});
export const ContextMenu2 = defineComponent('ContextMenu2', {});
export const ContextMenuTrigger = defineComponent('ContextMenuTrigger', {});
export const ContextMenuContent = defineComponent('ContextMenuContent', {});
export const ContextMenuItem2 = defineComponent('ContextMenuItem2', {});
export const Dropdown2 = defineComponent('Dropdown2', {});
export const DropdownMenu2 = defineComponent('DropdownMenu2', {});
export const DropdownTrigger2 = defineComponent('DropdownTrigger2', {});
export const DropdownContent = defineComponent('DropdownContent', {});
export const DropdownItem2 = defineComponent('DropdownItem2', {});
export const SelectMenu = defineComponent('SelectMenu', {});
export const CommandMenu = defineComponent('CommandMenu', {});
export const CommandInput = defineComponent('CommandInput', {});
export const CommandList = defineComponent('CommandList', {});
export const CommandEmpty = defineComponent('CommandEmpty', {});
export const CommandGroup = defineComponent('CommandGroup', {});

export const OVERLAY_COMPONENTS = {
  Overlay, Backdrop, Modal2, ModalDialog, BasicModal, FullScreenModal,
  CenteredModal, SideModal, BottomModal, TopModal, ModalManager, Drawer2,
  LeftDrawer, RightDrawer, TopDrawer, BottomDrawer, DrawerManager, Popover2,
  PopoverContent2, HoverPopover, ClickPopover, FocusPopover, Tooltip2,
  TopTooltip, BottomTooltip, LeftTooltip, RightTooltip, RichTooltip,
  TooltipManager, Menu2, MenuList2, MenuItem2, MenuButton2, MenuTrigger,
  MenuContent, ContextMenu2, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem2, Dropdown2, DropdownMenu2, DropdownTrigger2,
  DropdownContent, DropdownItem2, SelectMenu, CommandMenu, CommandInput,
  CommandList, CommandEmpty, CommandGroup,
};
