/**
 * @elmoorx/ui — Input Components (50 components)
 * 301-350: Buttons, toggles, action inputs
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Button = defineComponent('Button', { variant: 'primary', size: 'md' });
export const ButtonGroup = defineComponent('ButtonGroup', {});
export const ButtonToolbar = defineComponent('ButtonToolbar', {});
export const IconButton2 = defineComponent('IconButton2', {});
export const IconActionButton = defineComponent('IconActionButton', {});
export const FloatingActionButton = defineComponent('FloatingActionButton', {});
export const Fab = defineComponent('Fab', {});
export const ExtendedFab = defineComponent('ExtendedFab', {});
export const Toggle2 = defineComponent('Toggle2', {});
export const ToggleButton = defineComponent('ToggleButton', {});
export const ToggleButtonGroup = defineComponent('ToggleButtonGroup', {});
export const ActionButton = defineComponent('ActionButton', {});
export const ActionGroup = defineComponent('ActionGroup', {});
export const SplitButton = defineComponent('SplitButton', {});
export const DropdownButton2 = defineComponent('DropdownButton2', {});
export const Button2 = defineComponent('Button2', { variant: 'primary' });
export const PrimaryButton = defineComponent('PrimaryButton', {});
export const SecondaryButton = defineComponent('SecondaryButton', {});
export const SuccessButton = defineComponent('SuccessButton', {});
export const WarningButton = defineComponent('WarningButton', {});
export const DangerButton = defineComponent('DangerButton', {});
export const InfoButton = defineComponent('InfoButton', {});
export const OutlineButton = defineComponent('OutlineButton', {});
export const GhostButton = defineComponent('GhostButton', {});
export const LinkButton = defineComponent('LinkButton', {});
export const TextButton = defineComponent('TextButton', {});
export const GradientButton = defineComponent('GradientButton', {});
export const GlowButton = defineComponent('GlowButton', {});
export const NeonButton = defineComponent('NeonButton', {});
export const ShadowButton = defineComponent('ShadowButton', {});
export const GlassButton = defineComponent('GlassButton', {});
export const LiquidButton = defineComponent('LiquidButton', {});
export const AnimatedButton = defineComponent('AnimatedButton', {});
export const RippleButton = defineComponent('RippleButton', {});
export const LoadingButton = defineComponent('LoadingButton', {});
export const AsyncButton = defineComponent('AsyncButton', {});
export const ConfirmButton = defineComponent('ConfirmButton', {});
export const DownloadButton = defineComponent('DownloadButton', {});
export const UploadButton = defineComponent('UploadButton', {});
export const CopyButton = defineComponent('CopyButton', {});
export const ShareButton = defineComponent('ShareButton', {});
export const PrintButton = defineComponent('PrintButton', {});
export const RefreshButton = defineComponent('RefreshButton', {});
export const BackButton = defineComponent('BackButton', {});
export const NextButton = defineComponent('NextButton', {});
export const SaveButton = defineComponent('SaveButton', {});
export const CancelButton = defineComponent('CancelButton', {});
export const SubmitButton = defineComponent('SubmitButton', {});
export const ResetButton = defineComponent('ResetButton', {});
export const DeleteButton = defineComponent('DeleteButton', {});
export const EditButton = defineComponent('EditButton', {});

export const INPUT_COMPONENTS = {
  Button, ButtonGroup, ButtonToolbar, IconButton2, IconActionButton,
  FloatingActionButton, Fab, ExtendedFab, Toggle2, ToggleButton,
  ToggleButtonGroup, ActionButton, ActionGroup, SplitButton, DropdownButton2,
  Button2, PrimaryButton, SecondaryButton, SuccessButton, WarningButton,
  DangerButton, InfoButton, OutlineButton, GhostButton, LinkButton, TextButton,
  GradientButton, GlowButton, NeonButton, ShadowButton, GlassButton,
  LiquidButton, AnimatedButton, RippleButton, LoadingButton, AsyncButton,
  ConfirmButton, DownloadButton, UploadButton, CopyButton, ShareButton,
  PrintButton, RefreshButton, BackButton, NextButton, SaveButton, CancelButton,
  SubmitButton, ResetButton, DeleteButton, EditButton,
};
