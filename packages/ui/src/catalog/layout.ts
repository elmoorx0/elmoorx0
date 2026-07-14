/**
 * @elmoorx/ui — Layout Components (50 components)
 * 51-100: Layout primitives and structural components
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    const merged = { ...defaultProps, ...props };
    return { name, props: merged };
  };
}

export const Grid = defineComponent('Grid', { cols: 12, gap: 4 });
export const Stack = defineComponent('Stack', { direction: 'vertical', gap: 4 });
export const HStack = defineComponent('HStack', { gap: 4 });
export const VStack = defineComponent('VStack', { gap: 4 });
export const ZStack = defineComponent('ZStack', {});
export const Container = defineComponent('Container', { maxWidth: 'lg' });
export const Box = defineComponent('Box', {});
export const Flex = defineComponent('Flex', { display: 'flex' });
export const FlexBox = defineComponent('FlexBox', {});
export const InlineFlex = defineComponent('InlineFlex', {});
export const Center = defineComponent('Center', {});
export const Square = defineComponent('Square', { size: 40 });
export const Circle = defineComponent('Circle', { size: 40 });
export const Spacer = defineComponent('Spacer', { flex: 1 });
export const Divider = defineComponent('Divider', { orientation: 'horizontal' });
export const VerticalDivider = defineComponent('VerticalDivider', {});
export const Card = defineComponent('Card', {});
export const CardHeader = defineComponent('CardHeader', {});
export const CardBody = defineComponent('CardBody', {});
export const CardFooter = defineComponent('CardFooter', {});
export const Panel = defineComponent('Panel', {});
export const PanelHeader = defineComponent('PanelHeader', {});
export const PanelBody = defineComponent('PanelBody', {});
export const PanelFooter = defineComponent('PanelFooter', {});
export const Sidebar = defineComponent('Sidebar', { side: 'left', width: 250 });
export const SidebarItem = defineComponent('SidebarItem', {});
export const SidebarSection = defineComponent('SidebarSection', {});
export const SidebarToggle = defineComponent('SidebarToggle', {});
export const SplitView = defineComponent('SplitView', { direction: 'horizontal' });
export const SplitPane = defineComponent('SplitPane', {});
export const Resizer = defineComponent('Resizer', {});
export const AspectRatio = defineComponent('AspectRatio', { ratio: 16 / 9 });
export const Absolute = defineComponent('Absolute', {});
export const Relative = defineComponent('Relative', {});
export const Fixed = defineComponent('Fixed', {});
export const Sticky = defineComponent('Sticky', { top: 0 });
export const Position = defineComponent('Position', {});
export const Tabs = defineComponent('Tabs', {});
export const TabList = defineComponent('TabList', {});
export const Tab = defineComponent('Tab', {});
export const TabPanel = defineComponent('TabPanel', {});
export const TabPanels = defineComponent('TabPanels', {});
export const Accordion = defineComponent('Accordion', {});
export const AccordionItem = defineComponent('AccordionItem', {});
export const AccordionButton = defineComponent('AccordionButton', {});
export const AccordionPanel = defineComponent('AccordionPanel', {});
export const Collapsible = defineComponent('Collapsible', {});
export const Collapse = defineComponent('Collapse', {});
export const ScrollArea = defineComponent('ScrollArea', {});
export const ScrollView = defineComponent('ScrollView', {});
export const View = defineComponent('View', {});
export const Section = defineComponent('Section', {});
export const Header = defineComponent('Header', {});
export const Footer = defineComponent('Footer', {});
export const Main = defineComponent('Main', {});
export const Article = defineComponent('Article', {});
export const Aside = defineComponent('Aside', {});
export const Nav = defineComponent('Nav', {});
export const Group = defineComponent('Group', {});
export const Fieldset = defineComponent('Fieldset', {});
export const Figure = defineComponent('Figure', {});
export const Figcaption = defineComponent('Figcaption', {});

export const LAYOUT_COMPONENTS = {
  Grid, Stack, HStack, VStack, ZStack, Container, Box, Flex, FlexBox, InlineFlex,
  Center, Square, Circle, Spacer, Divider, VerticalDivider, Card, CardHeader,
  CardBody, CardFooter, Panel, PanelHeader, PanelBody, PanelFooter, Sidebar,
  SidebarItem, SidebarSection, SidebarToggle, SplitView, SplitPane, Resizer,
  AspectRatio, Absolute, Relative, Fixed, Sticky, Position, Tabs, TabList, Tab,
  TabPanel, TabPanels, Accordion, AccordionItem, AccordionButton, AccordionPanel,
  Collapsible, Collapse, ScrollArea, ScrollView, View, Section, Header, Footer,
  Main, Article, Aside, Nav, Group, Fieldset, Figure, Figcaption,
};
