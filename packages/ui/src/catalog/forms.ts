/**
 * @elmoorx/ui — Forms Components (50 components)
 * 1-50: Form-related inputs and controls
 */


// Helper to create a component
function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    const merged = { ...defaultProps, ...props };
    return { name, props: merged };
  };
}

// ─── 1. Input ───────────────────────────────────────────────────────────────
export const Input = defineComponent('Input', { type: 'text', size: 'md' });
// ─── 2. Textarea ────────────────────────────────────────────────────────────
export const Textarea = defineComponent('Textarea', { rows: 4 });
// ─── 3. Select ──────────────────────────────────────────────────────────────
export const Select = defineComponent('Select', {});
// ─── 4. Checkbox ────────────────────────────────────────────────────────────
export const Checkbox = defineComponent('Checkbox', { checked: false });
// ─── 5. Radio ───────────────────────────────────────────────────────────────
export const Radio = defineComponent('Radio', { checked: false });
// ─── 6. RadioGroup ──────────────────────────────────────────────────────────
export const RadioGroup = defineComponent('RadioGroup', {});
// ─── 7. Switch ──────────────────────────────────────────────────────────────
export const Switch = defineComponent('Switch', { checked: false });
// ─── 8. Slider ──────────────────────────────────────────────────────────────
export const Slider = defineComponent('Slider', { min: 0, max: 100, value: 50 });
// ─── 9. RangeSlider ─────────────────────────────────────────────────────────
export const RangeSlider = defineComponent('RangeSlider', { min: 0, max: 100 });
// ─── 10. DatePicker ─────────────────────────────────────────────────────────
export const DatePicker = defineComponent('DatePicker', {});
// ─── 11. DateRangePicker ────────────────────────────────────────────────────
export const DateRangePicker = defineComponent('DateRangePicker', {});
// ─── 12. TimePicker ─────────────────────────────────────────────────────────
export const TimePicker = defineComponent('TimePicker', {});
// ─── 13. DateTimePicker ─────────────────────────────────────────────────────
export const DateTimePicker = defineComponent('DateTimePicker', {});
// ─── 14. MonthPicker ────────────────────────────────────────────────────────
export const MonthPicker = defineComponent('MonthPicker', {});
// ─── 15. YearPicker ─────────────────────────────────────────────────────────
export const YearPicker = defineComponent('YearPicker', {});
// ─── 16. WeekPicker ─────────────────────────────────────────────────────────
export const WeekPicker = defineComponent('WeekPicker', {});
// ─── 17. QuarterPicker ──────────────────────────────────────────────────────
export const QuarterPicker = defineComponent('QuarterPicker', {});
// ─── 18. ColorPicker ────────────────────────────────────────────────────────
export const ColorPicker = defineComponent('ColorPicker', {});
// ─── 19. ColorSwatch ────────────────────────────────────────────────────────
export const ColorSwatch = defineComponent('ColorSwatch', {});
// ─── 20. FileUpload ─────────────────────────────────────────────────────────
export const FileUpload = defineComponent('FileUpload', {});
// ─── 21. Dropzone ───────────────────────────────────────────────────────────
export const Dropzone = defineComponent('Dropzone', {});
// ─── 22. ImageUpload ────────────────────────────────────────────────────────
export const ImageUpload = defineComponent('ImageUpload', {});
// ─── 23. AvatarUpload ───────────────────────────────────────────────────────
export const AvatarUpload = defineComponent('AvatarUpload', {});
// ─── 24. OTPInput ───────────────────────────────────────────────────────────
export const OTPInput = defineComponent('OTPInput', { length: 6 });
// ─── 25. PinInput ───────────────────────────────────────────────────────────
export const PinInput = defineComponent('PinInput', { length: 4 });
// ─── 26. MaskedInput ────────────────────────────────────────────────────────
export const MaskedInput = defineComponent('MaskedInput', { mask: '(***) ***-****' });
// ─── 27. PhoneInput ─────────────────────────────────────────────────────────
export const PhoneInput = defineComponent('PhoneInput', { country: 'US' });
// ─── 28. CurrencyInput ──────────────────────────────────────────────────────
export const CurrencyInput = defineComponent('CurrencyInput', { currency: 'USD' });
// ─── 29. NumberInput ────────────────────────────────────────────────────────
export const NumberInput = defineComponent('NumberInput', { step: 1 });
// ─── 30. EmailInput ─────────────────────────────────────────────────────────
export const EmailInput = defineComponent('EmailInput', { type: 'email' });
// ─── 31. PasswordInput ──────────────────────────────────────────────────────
export const PasswordInput = defineComponent('PasswordInput', { showToggle: true });
// ─── 32. SearchInput ────────────────────────────────────────────────────────
export const SearchInput = defineComponent('SearchInput', {});
// ─── 33. URLInput ───────────────────────────────────────────────────────────
export const URLInput = defineComponent('URLInput', { type: 'url' });
// ─── 34. Autocomplete ───────────────────────────────────────────────────────
export const Autocomplete = defineComponent('Autocomplete', {});
// ─── 35. Combobox ───────────────────────────────────────────────────────────
export const Combobox = defineComponent('Combobox', {});
// ─── 36. MultiSelect ────────────────────────────────────────────────────────
export const MultiSelect = defineComponent('MultiSelect', {});
// ─── 37. TagInput ───────────────────────────────────────────────────────────
export const TagInput = defineComponent('TagInput', {});
// ─── 38. ChipInput ──────────────────────────────────────────────────────────
export const ChipInput = defineComponent('ChipInput', {});
// ─── 39. Rating ─────────────────────────────────────────────────────────────
export const Rating = defineComponent('Rating', { max: 5, value: 0 });
// ─── 40. StarRating ─────────────────────────────────────────────────────────
export const StarRating = defineComponent('StarRating', { max: 5 });
// ─── 41. HeartRating ────────────────────────────────────────────────────────
export const HeartRating = defineComponent('HeartRating', {});
// ─── 42. EmojiRating ────────────────────────────────────────────────────────
export const EmojiRating = defineComponent('EmojiRating', {});
// ─── 43. Toggle ─────────────────────────────────────────────────────────────
export const Toggle = defineComponent('Toggle', {});
// ─── 44. ToggleGroup ────────────────────────────────────────────────────────
export const ToggleGroup = defineComponent('ToggleGroup', {});
// ─── 45. SegmentedControl ───────────────────────────────────────────────────
export const SegmentedControl = defineComponent('SegmentedControl', {});
// ─── 46. CheckboxGroup ──────────────────────────────────────────────────────
export const CheckboxGroup = defineComponent('CheckboxGroup', {});
// ─── 47. FormBuilder ────────────────────────────────────────────────────────
export const FormBuilder = defineComponent('FormBuilder', {});
// ─── 48. FormField ──────────────────────────────────────────────────────────
export const FormField = defineComponent('FormField', {});
// ─── 49. FormError ──────────────────────────────────────────────────────────
export const FormError = defineComponent('FormError', {});
// ─── 50. FormActions ────────────────────────────────────────────────────────
export const FormActions = defineComponent('FormActions', {});

export const FORMS_COMPONENTS = {
  Input, Textarea, Select, Checkbox, Radio, RadioGroup, Switch, Slider, RangeSlider,
  DatePicker, DateRangePicker, TimePicker, DateTimePicker, MonthPicker, YearPicker,
  WeekPicker, QuarterPicker, ColorPicker, ColorSwatch, FileUpload, Dropzone,
  ImageUpload, AvatarUpload, OTPInput, PinInput, MaskedInput, PhoneInput,
  CurrencyInput, NumberInput, EmailInput, PasswordInput, SearchInput, URLInput,
  Autocomplete, Combobox, MultiSelect, TagInput, ChipInput, Rating, StarRating,
  HeartRating, EmojiRating, Toggle, ToggleGroup, SegmentedControl, CheckboxGroup,
  FormBuilder, FormField, FormError, FormActions,
};
