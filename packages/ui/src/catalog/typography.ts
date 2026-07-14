/**
 * @elmoorx/ui — Typography Components (50 components)
 * 401-450: Text, headings, formatting
 */

function defineComponent(name: string, defaultProps: Record<string, unknown> = {}) {
  return function (props: Record<string, unknown> = {}) {
    return { name, props: { ...defaultProps, ...props } };
  };
}

export const Text = defineComponent('Text', {});
export const Heading = defineComponent('Heading', { level: 1 });
export const H1 = defineComponent('H1', {});
export const H2 = defineComponent('H2', {});
export const H3 = defineComponent('H3', {});
export const H4 = defineComponent('H4', {});
export const H5 = defineComponent('H5', {});
export const H6 = defineComponent('H6', {});
export const Title = defineComponent('Title', {});
export const Subtitle = defineComponent('Subtitle', {});
export const Subheading = defineComponent('Subheading', {});
export const Caption = defineComponent('Caption', {});
export const Overline = defineComponent('Overline', {});
export const Label = defineComponent('Label', {});
export const LabelText = defineComponent('LabelText', {});
export const Paragraph = defineComponent('Paragraph', {});
export const Lead = defineComponent('Lead', {});
export const Blockquote = defineComponent('Blockquote', {});
export const Quote = defineComponent('Quote', {});
export const Cite = defineComponent('Cite', {});
export const Mark = defineComponent('Mark', {});
export const Highlight = defineComponent('Highlight', {});
export const Code = defineComponent('Code', {});
export const CodeBlock = defineComponent('CodeBlock', {});
export const Pre = defineComponent('Pre', {});
export const Kbd = defineComponent('Kbd', {});
export const Samp = defineComponent('Samp', {});
export const Var = defineComponent('Var', {});
export const Ins = defineComponent('Ins', {});
export const Del = defineComponent('Del', {});
export const Strike = defineComponent('Strike', {});
export const Underline = defineComponent('Underline', {});
export const Italic = defineComponent('Italic', {});
export const Bold = defineComponent('Bold', {});
export const Strong = defineComponent('Strong', {});
export const Emphasis = defineComponent('Emphasis', {});
export const Small = defineComponent('Small', {});
export const Big = defineComponent('Big', {});
export const Subscript = defineComponent('Subscript', {});
export const Superscript = defineComponent('Superscript', {});
export const Abbreviation = defineComponent('Abbreviation', {});
export const Link = defineComponent('Link', {});
export const Link2 = defineComponent('Link2', {});
export const Anchor = defineComponent('Anchor', {});
export const ExternalLink = defineComponent('ExternalLink', {});
export const MailtoLink = defineComponent('MailtoLink', {});
export const TelLink = defineComponent('TelLink', {});
export const Truncate = defineComponent('Truncate', {});
export const Clamp = defineComponent('Clamp', { lines: 2 });

export const TYPOGRAPHY_COMPONENTS = {
  Text, Heading, H1, H2, H3, H4, H5, H6, Title, Subtitle, Subheading, Caption,
  Overline, Label, LabelText, Paragraph, Lead, Blockquote, Quote, Cite, Mark,
  Highlight, Code, CodeBlock, Pre, Kbd, Samp, Var, Ins, Del, Strike, Underline,
  Italic, Bold, Strong, Emphasis, Small, Big, Subscript, Superscript,
  Abbreviation, Link, Link2, Anchor, ExternalLink, MailtoLink, TelLink,
  Truncate, Clamp,
};
