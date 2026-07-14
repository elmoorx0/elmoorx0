/**
 * @elmoorx/ui — Specialty Components (50 components)
 * Domain-specific and advanced widgets
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

// Maps & geographic
export const MapView = defineComponent('Map', { center: [0, 0], zoom: 10 });
export const MapMarker = defineComponent('MapMarker', {});
export const MapOverlay = defineComponent('MapOverlay', {});
export const MapControls = defineComponent('MapControls', {});
export const GeoChart = defineComponent('GeoChart', {});

// Time & scheduling
export const Scheduler = defineComponent('Scheduler', {});
export const Calendar2 = defineComponent('Calendar2', {});
export const EventCalendar = defineComponent('EventCalendar', {});
export const BookingCalendar = defineComponent('BookingCalendar', {});
export const TimeSlots = defineComponent('TimeSlots', {});

// File management
export const FileTree = defineComponent('FileTree', {});
export const FileExplorer = defineComponent('FileExplorer', {});
export const FilePreview = defineComponent('FilePreview', {});
export const FileList = defineComponent('FileList', {});
export const FileManager = defineComponent('FileManager', {});

// Communication
export const ChatBox = defineComponent('ChatBox', {});
export const ChatMessage = defineComponent('ChatMessage', {});
export const ChatInput = defineComponent('ChatInput', {});
export const ChatList = defineComponent('ChatList', {});
export const ChatBubble = defineComponent('ChatBubble', {});

// Social
export const LikeButton = defineComponent('LikeButton', {});
export const ShareMenu = defineComponent('ShareMenu', {});
export const SocialCard = defineComponent('SocialCard', {});
export const CommentSection = defineComponent('CommentSection', {});
export const FeedItem = defineComponent('FeedItem', {});

// E-commerce
export const ProductCard = defineComponent('ProductCard', {});
export const ProductGrid = defineComponent('ProductGrid', {});
export const ProductDetail = defineComponent('ProductDetail', {});
export const ShoppingCart = defineComponent('ShoppingCart', {});
export const CartItem = defineComponent('CartItem', {});
export const CheckoutForm = defineComponent('CheckoutForm', {});
export const OrderSummary = defineComponent('OrderSummary', {});
export const PriceTag = defineComponent('PriceTag', {});
export const DiscountBadge = defineComponent('DiscountBadge', {});
export const WishlistButton = defineComponent('WishlistButton', {});

// Content
export const ArticleCard = defineComponent('ArticleCard', {});
export const BlogPost = defineComponent('BlogPost', {});
export const VideoCard = defineComponent('VideoCard', {});
export const PodcastCard = defineComponent('PodcastCard', {});
export const PlaylistCard = defineComponent('PlaylistCard', {});

// Gamification
export const AchievementBadge = defineComponent('AchievementBadge', {});
export const Leaderboard = defineComponent('Leaderboard', {});
export const ProgressBar2 = defineComponent('ProgressBar2', {});
export const StreakIndicator = defineComponent('StreakIndicator', {});
export const RewardCard = defineComponent('RewardCard', {});

// System
export const SystemTray = defineComponent('SystemTray', {});
export const Taskbar = defineComponent('Taskbar', {});
export const WindowFrame = defineComponent('WindowFrame', {});
export const StatusBar = defineComponent('StatusBar', {});
export const NotificationTray = defineComponent('NotificationTray', {});

export const SPECIALTY_COMPONENTS = {
  MapView, MapMarker, MapOverlay, MapControls, GeoChart, Scheduler, Calendar2,
  EventCalendar, BookingCalendar, TimeSlots, FileTree, FileExplorer,
  FilePreview, FileList, FileManager, ChatBox, ChatMessage, ChatInput,
  ChatList, ChatBubble, LikeButton, ShareMenu, SocialCard, CommentSection,
  FeedItem, ProductCard, ProductGrid, ProductDetail, ShoppingCart, CartItem,
  CheckoutForm, OrderSummary, PriceTag, DiscountBadge, WishlistButton,
  ArticleCard, BlogPost, VideoCard, PodcastCard, PlaylistCard,
  AchievementBadge, Leaderboard, ProgressBar2, StreakIndicator, RewardCard,
  SystemTray, Taskbar, WindowFrame, StatusBar, NotificationTray,
};
