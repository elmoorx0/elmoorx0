/**
 * @elmoorx/ui — Data Display Components (50 components)
 * 151-200: Data visualization and display
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Table = defineComponent('Table', {});
export const TableHeader = defineComponent('TableHeader', {});
export const TableBody = defineComponent('TableBody', {});
export const TableRow = defineComponent('TableRow', {});
export const TableCell = defineComponent('TableCell', {});
export const TableCaption = defineComponent('TableCaption', {});
export const TableFooter = defineComponent('TableFooter', {});
export const DataTable = defineComponent('DataTable', {});
export const DataGrid = defineComponent('DataGrid', {});
export const TreeTable = defineComponent('TreeTable', {});
export const Tree = defineComponent('Tree', {});
export const TreeNode = defineComponent('TreeNode', {});
export const TreeView = defineComponent('TreeView', {});
export const Timeline = defineComponent('Timeline', {});
export const TimelineItem = defineComponent('TimelineItem', {});
export const TimelineSeparator = defineComponent('TimelineSeparator', {});
export const TimelineContent = defineComponent('TimelineContent', {});
export const TimelineDot = defineComponent('TimelineDot', {});
export const TimelineConnector = defineComponent('TimelineConnector', {});
export const Calendar = defineComponent('Calendar', {});
export const CalendarDay = defineComponent('CalendarDay', {});
export const CalendarMonth = defineComponent('CalendarMonth', {});
export const CalendarHeader = defineComponent('CalendarHeader', {});
export const Kanban = defineComponent('Kanban', {});
export const KanbanColumn = defineComponent('KanbanColumn', {});
export const KanbanCard = defineComponent('KanbanCard', {});
export const Gantt = defineComponent('Gantt', {});
export const GanttRow = defineComponent('GanttRow', {});
export const GanttBar = defineComponent('GanttBar', {});
export const Chart = defineComponent('Chart', { type: 'line' });
export const BarChart = defineComponent('BarChart', {});
export const LineChart = defineComponent('LineChart', {});
export const PieChart = defineComponent('PieChart', {});
export const DonutChart = defineComponent('DonutChart', {});
export const AreaChart = defineComponent('AreaChart', {});
export const ScatterPlot = defineComponent('ScatterPlot', {});
export const Heatmap = defineComponent('Heatmap', {});
export const Sparkline = defineComponent('Sparkline', {});
export const RadialBar = defineComponent('RadialBar', {});
export const Treemap = defineComponent('Treemap', {});
export const Badge = defineComponent('Badge', { variant: 'default' });
export const BadgeGroup = defineComponent('BadgeGroup', {});
export const Avatar = defineComponent('Avatar', { size: 'md' });
export const AvatarGroup = defineComponent('AvatarGroup', {});
export const Chip = defineComponent('Chip', {});
export const Tag = defineComponent('Tag', {});
export const Stat = defineComponent('Stat', {});
export const StatGroup = defineComponent('StatGroup', {});
export const StatLabel = defineComponent('StatLabel', {});
export const StatNumber = defineComponent('StatNumber', {});
export const StatHelpText = defineComponent('StatHelpText', {});
export const StatArrow = defineComponent('StatArrow', {});
export const Metric = defineComponent('Metric', {});
export const MetricCard = defineComponent('MetricCard', {});
export const Progress = defineComponent('Progress', { value: 0, max: 100 });
export const ProgressBar = defineComponent('ProgressBar', {});
export const ProgressCircle = defineComponent('ProgressCircle', {});
export const ProgressRing = defineComponent('ProgressRing', {});
export const Skeleton = defineComponent('Skeleton', {});
export const SkeletonText = defineComponent('SkeletonText', {});
export const SkeletonCircle = defineComponent('SkeletonCircle', {});
export const Empty = defineComponent('Empty', {});
export const EmptyState = defineComponent('EmptyState', {});
export const Placeholder = defineComponent('Placeholder', {});

export const DATA_COMPONENTS = {
  Table, TableHeader, TableBody, TableRow, TableCell, TableCaption, TableFooter,
  DataTable, DataGrid, TreeTable, Tree, TreeNode, TreeView, Timeline, TimelineItem,
  TimelineSeparator, TimelineContent, TimelineDot, TimelineConnector, Calendar,
  CalendarDay, CalendarMonth, CalendarHeader, Kanban, KanbanColumn, KanbanCard,
  Gantt, GanttRow, GanttBar, Chart, BarChart, LineChart, PieChart, DonutChart,
  AreaChart, ScatterPlot, Heatmap, Sparkline, RadialBar, Treemap, Badge,
  BadgeGroup, Avatar, AvatarGroup, Chip, Tag, Stat, StatGroup, StatLabel,
  StatNumber, StatHelpText, StatArrow, Metric, MetricCard, Progress, ProgressBar,
  ProgressCircle, ProgressRing, Skeleton, SkeletonText, SkeletonCircle, Empty,
  EmptyState, Placeholder,
};
