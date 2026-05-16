// Lucide-style inline SVG icons used across the kit.
// Constellation/wayfinding accents and a minimal subset for the landing page.

const Icon = ({ children, size = 16, className = "", stroke = 1.5, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

const IconArrowRight = (p) => (
  <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>
);
const IconZap = (p) => (
  <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/></Icon>
);
const IconNetwork = (p) => (
  <Icon {...p}><circle cx="6" cy="6" r="1.6" fill="currentColor"/><circle cx="18" cy="6" r="1.6" fill="currentColor"/><circle cx="12" cy="18" r="1.6" fill="currentColor"/><path d="M6 6 L18 6"/><path d="M6 6 L12 18"/><path d="M18 6 L12 18"/></Icon>
);
const IconLayers = (p) => (
  <Icon {...p}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></Icon>
);
const IconBoxes = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </Icon>
);
const IconFile = (p) => (
  <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></Icon>
);
const IconGamepad = (p) => (
  <Icon {...p}><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.96 3.41L2 14l1 6 4-2 1-1 8 0 1 1 4 2 1-6-.72-5.59A4 4 0 0 0 17.32 5z"/></Icon>
);
const IconWrench = (p) => (
  <Icon {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94L8.31 19.7a2.83 2.83 0 1 1-4-4l7.23-7.23a6 6 0 0 1 7.94-7.94l-3.78 3.78z"/></Icon>
);
const IconLifeBuoy = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></Icon>
);
const IconGrad = (p) => (
  <Icon {...p}><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Icon>
);
const IconUsers = (p) => (
  <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>
);
const IconStamp = (p) => (
  <Icon {...p}><path d="M5 22h14"/><path d="M19.27 13.73A2.5 2.5 0 0 0 21 11.4V10a2 2 0 0 0-2-2h-3.5a2 2 0 0 1-1.94-1.51l-.42-1.68A2 2 0 0 0 11.21 3H8a2 2 0 0 0-2 2v6a2.5 2.5 0 0 0 1.73 2.33L8 14h8z"/><path d="M5 18h14"/></Icon>
);
const IconCompass = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" stroke="none"/></Icon>
);
const IconStar = (p) => (
  <Icon {...p}><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></Icon>
);

// The brand glyph used in the forge-seal — compass rose from the GuideForge codebase
const GuideMark = ({ size = 16, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true">
    <path d="M12 2 L12 22"/><path d="M2 12 L22 12"/>
    <path d="M5.5 5.5 L18.5 18.5"/><path d="M18.5 5.5 L5.5 18.5"/>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2 L10.5 6 L12 5.5 L13.5 6 Z" fill="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

Object.assign(window, {
  Icon, IconArrowRight, IconZap, IconNetwork, IconLayers, IconBoxes, IconFile,
  IconGamepad, IconWrench, IconLifeBuoy, IconGrad, IconUsers, IconStamp,
  IconCompass, IconStar, GuideMark,
});
