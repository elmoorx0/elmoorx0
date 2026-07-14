/**
 * @elmoorx/ui — Navigation Components (50 components)
 * 101-150: Navigation and routing components
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Navbar = defineComponent('Navbar', {});
export const NavBar = defineComponent('NavBar', {});
export const NavItem = defineComponent('NavItem', {});
export const NavLink = defineComponent('NavLink', {});
export const NavList = defineComponent('NavList', {});
export const NavMenu = defineComponent('NavMenu', {});
export const Breadcrumb = defineComponent('Breadcrumb', {});
export const BreadcrumbItem = defineComponent('BreadcrumbItem', {});
export const BreadcrumbLink = defineComponent('BreadcrumbLink', {});
export const BreadcrumbSeparator = defineComponent('BreadcrumbSeparator', {});
export const Pagination = defineComponent('Pagination', { page: 1, total: 1 });
export const PaginationItem = defineComponent('PaginationItem', {});
export const PaginationButton = defineComponent('PaginationButton', {});
export const PageNav = defineComponent('PageNav', {});
export const Pager = defineComponent('Pager', {});
export const TabBar = defineComponent('TabBar', {});
export const TabNav = defineComponent('TabNav', {});
export const Menu = defineComponent('Menu', {});
export const MenuItem = defineComponent('MenuItem', {});
export const MenuButton = defineComponent('MenuButton', {});
export const MenuList = defineComponent('MenuList', {});
export const MenuGroup = defineComponent('MenuGroup', {});
export const MenuDivider = defineComponent('MenuDivider', {});
export const MenuLabel = defineComponent('MenuLabel', {});
export const ContextMenu = defineComponent('ContextMenu', {});
export const ContextMenuItem = defineComponent('ContextMenuItem', {});
export const Dropdown = defineComponent('Dropdown', {});
export const DropdownMenu = defineComponent('DropdownMenu', {});
export const DropdownItem = defineComponent('DropdownItem', {});
export const DropdownTrigger = defineComponent('DropdownTrigger', {});
export const DropdownButton = defineComponent('DropdownButton', {});
export const MegaMenu = defineComponent('MegaMenu', {});
export const MegaMenuItem = defineComponent('MegaMenuItem', {});
export const Stepper = defineComponent('Stepper', { current: 0 });
export const Step = defineComponent('Step', {});
export const StepItem = defineComponent('StepItem', {});
export const Wizard = defineComponent('Wizard', { step: 0 });
export const WizardStep = defineComponent('WizardStep', {});
export const WizardNav = defineComponent('WizardNav', {});
export const Drawer = defineComponent('Drawer', { side: 'right' });
export const DrawerContent = defineComponent('DrawerContent', {});
export const DrawerHeader = defineComponent('DrawerHeader', {});
export const DrawerBody = defineComponent('DrawerBody', {});
export const DrawerFooter = defineComponent('DrawerFooter', {});
export const BottomSheet = defineComponent('BottomSheet', {});
export const Sheet = defineComponent('Sheet', {});
export const AppBar = defineComponent('AppBar', {});
export const Toolbar = defineComponent('Toolbar', {});
export const CommandPalette = defineComponent('CommandPalette', {});
export const CommandItem = defineComponent('CommandItem', {});

export const NAV_COMPONENTS = {
  Navbar, NavBar, NavItem, NavLink, NavList, NavMenu, Breadcrumb, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, Pagination, PaginationItem, PaginationButton,
  PageNav, Pager, TabBar, TabNav, Menu, MenuItem, MenuButton, MenuList, MenuGroup,
  MenuDivider, MenuLabel, ContextMenu, ContextMenuItem, Dropdown, DropdownMenu,
  DropdownItem, DropdownTrigger, DropdownButton, MegaMenu, MegaMenuItem, Stepper,
  Step, StepItem, Wizard, WizardStep, WizardNav, Drawer, DrawerContent,
  DrawerHeader, DrawerBody, DrawerFooter, BottomSheet, Sheet, AppBar, Toolbar,
  CommandPalette, CommandItem,
};
