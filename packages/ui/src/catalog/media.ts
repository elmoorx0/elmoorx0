/**
 * @elmoorx/ui — Media Components (50 components)
 * 251-300: Image, video, audio, gallery
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Image = defineComponent('Image', { loading: 'lazy' });
export const ImageGroup = defineComponent('ImageGroup', {});
export const ImageGallery = defineComponent('ImageGallery', {});
export const ImageGrid = defineComponent('ImageGrid', {});
export const ImageList = defineComponent('ImageList', {});
export const ImageMasonry = defineComponent('ImageMasonry', {});
export const ImageCompare = defineComponent('ImageCompare', {});
export const ImageCropper = defineComponent('ImageCropper', {});
export const ImageEditor = defineComponent('ImageEditor', {});
export const ImageFilter = defineComponent('ImageFilter', {});
export const ImagePreview = defineComponent('ImagePreview', {});
export const ImageViewer = defineComponent('ImageViewer', {});
export const ImageZoom = defineComponent('ImageZoom', {});
export const ResponsiveImage = defineComponent('ResponsiveImage', {});
export const AvatarImage = defineComponent('AvatarImage', {});
export const BackgroundImage = defineComponent('BackgroundImage', {});
export const Video = defineComponent('Video', { controls: true });
export const VideoPlayer = defineComponent('VideoPlayer', {});
export const VideoGallery = defineComponent('VideoGallery', {});
export const VideoPreview = defineComponent('VideoPreview', {});
export const VideoRecorder = defineComponent('VideoRecorder', {});
export const VideoStream = defineComponent('VideoStream', {});
export const VideoTimeline = defineComponent('VideoTimeline', {});
export const VideoControls = defineComponent('VideoControls', {});
export const Audio = defineComponent('Audio', { controls: true });
export const AudioPlayer = defineComponent('AudioPlayer', {});
export const AudioRecorder = defineComponent('AudioRecorder', {});
export const AudioWaveform = defineComponent('AudioWaveform', {});
export const AudioVisualizer = defineComponent('AudioVisualizer', {});
export const AudioPlaylist = defineComponent('AudioPlaylist', {});
export const Gallery = defineComponent('Gallery', {});
export const Carousel = defineComponent('Carousel', { loop: true });
export const CarouselItem = defineComponent('CarouselItem', {});
export const CarouselArrow = defineComponent('CarouselArrow', {});
export const CarouselDots = defineComponent('CarouselDots', {});
export const Slider2 = defineComponent('Slider2', {});
export const SliderTrack = defineComponent('SliderTrack', {});
export const SliderSlide = defineComponent('SliderSlide', {});
export const Lightbox = defineComponent('Lightbox', {});
export const LightboxImage = defineComponent('LightboxImage', {});
export const LightboxVideo = defineComponent('LightboxVideo', {});
export const Icon = defineComponent('Icon', {});
export const IconButton = defineComponent('IconButton', {});
export const IconStack = defineComponent('IconStack', {});
export const Logo = defineComponent('Logo', {});
export const Brand = defineComponent('Brand', {});
export const Emoji = defineComponent('Emoji', {});
export const Flag = defineComponent('Flag', {});
export const FlagIcon = defineComponent('FlagIcon', {});
export const QRCode = defineComponent('QRCode', {});
export const Barcode = defineComponent('Barcode', {});

export const MEDIA_COMPONENTS = {
  Image, ImageGroup, ImageGallery, ImageGrid, ImageList, ImageMasonry,
  ImageCompare, ImageCropper, ImageEditor, ImageFilter, ImagePreview, ImageViewer,
  ImageZoom, ResponsiveImage, AvatarImage, BackgroundImage, Video, VideoPlayer,
  VideoGallery, VideoPreview, VideoRecorder, VideoStream, VideoTimeline,
  VideoControls, Audio, AudioPlayer, AudioRecorder, AudioWaveform,
  AudioVisualizer, AudioPlaylist, Gallery, Carousel, CarouselItem, CarouselArrow,
  CarouselDots, Slider2, SliderTrack, SliderSlide, Lightbox, LightboxImage,
  LightboxVideo, Icon, IconButton, IconStack, Logo, Brand, Emoji, Flag,
  FlagIcon, QRCode, Barcode,
};
