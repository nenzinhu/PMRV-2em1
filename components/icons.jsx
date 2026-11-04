const ICON_CLASS = 'w-5 h-5 shrink-0';

function LineIcon({ className = ICON_CLASS, children }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function MicIcon({ className }) {
  return (
    <LineIcon className={className}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21m-4 0h8" />
    </LineIcon>
  );
}

export function ArrowRightIcon({ className }) {
  return <LineIcon className={className}><path d="M5 12h14m-6-6 6 6-6 6" /></LineIcon>;
}

export function ArrowLeftIcon({ className }) {
  return <LineIcon className={className}><path d="M19 12H5m6 6-6-6 6-6" /></LineIcon>;
}

export function WhatsAppIcon({ className = 'w-6 h-6 shrink-0' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.48-1.459-1.653-1.756-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export function CopyIcon({ className }) {
  return <LineIcon className={className}><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h2" /></LineIcon>;
}

export function UsersIcon({ className }) {
  return <LineIcon className={className}><path d="M16 20v-1.5a4.5 4.5 0 00-4.5-4.5h-3A4.5 4.5 0 004 18.5V20M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm6 2a3 3 0 100-6m2 14h2v-1.5a4.5 4.5 0 00-3.5-4.4" /></LineIcon>;
}

export function UserIcon({ className }) {
  return <LineIcon className={className}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0115 0" /></LineIcon>;
}

export function ClipboardListIcon({ className }) {
  return <LineIcon className={className}><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V4a2 2 0 012-2h2a2 2 0 012 2v1m-6 5h6m-6 4h6m-6 4h4" /></LineIcon>;
}

export function ClipboardIcon({ className }) {
  return <LineIcon className={className}><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V3a2 2 0 012-2h2a2 2 0 012 2v1m-6 6h6m-6 4h6" /></LineIcon>;
}

export function FileReportIcon({ className }) {
  return <LineIcon className={className}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M9 13h6m-6 4h6m-6-8h2" /></LineIcon>;
}

export function FileTextIcon({ className }) {
  return <LineIcon className={className}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M9 13h6m-6 4h6" /></LineIcon>;
}

export function SaveIcon({ className }) {
  return <LineIcon className={className}><path d="M5 3h12l4 4v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M7 3v5h9M7 21v-8h10v8" /></LineIcon>;
}

export function MapPinIcon({ className }) {
  return <LineIcon className={className}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z" /><circle cx="12" cy="10" r="2.5" /></LineIcon>;
}

export function PaletteIcon({ className }) {
  return (
    <LineIcon className={className}>
      <path d="M12 3a9 9 0 100 18h1a2 2 0 001.4-3.4 1.5 1.5 0 011.1-2.6H17a4 4 0 004-4c0-4.2-4-8-9-8z" />
      <circle cx="7.5" cy="10" r=".8" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7" r=".8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r=".8" fill="currentColor" stroke="none" />
    </LineIcon>
  );
}

export function ExpandIcon({ className }) {
  return <LineIcon className={className}><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></LineIcon>;
}

export function DownloadIcon({ className }) {
  return <LineIcon className={className}><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" /></LineIcon>;
}

export function UploadIcon({ className }) {
  return <LineIcon className={className}><path d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16" /></LineIcon>;
}

export function CollapseIcon({ className }) {
  return <LineIcon className={className}><path d="M9 3v3a2 2 0 01-2 2H4m16 0h-3a2 2 0 01-2-2V3M4 16h3a2 2 0 012 2v3m6 0v-3a2 2 0 012-2h3" /></LineIcon>;
}

export function SparkIcon({ className }) {
  return <LineIcon className={className}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" /></LineIcon>;
}

export function CameraIcon({ className }) {
  return <LineIcon className={className}><path d="M4 8a2 2 0 012-2h2l1.4-2h5.2L16 6h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" /><circle cx="12" cy="13" r="3.5" /></LineIcon>;
}

export function ImageIcon({ className }) {
  return <LineIcon className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></LineIcon>;
}

export function SearchIcon({ className }) {
  return <LineIcon className={className}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></LineIcon>;
}

export function BroomIcon({ className }) {
  return <LineIcon className={className}><path d="m14 4 6 6M3 21l7-7m-3-3 6-6a2 2 0 012.8 0l3.2 3.2a2 2 0 010 2.8l-6 6M4 17l3 3m-5-1 2-2m1 4 2-2m2 1 2-2" /></LineIcon>;
}

export function RobotIcon({ className }) {
  return <LineIcon className={className}><path d="M12 3v3m-2 0h4" /><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M8.5 12h.01M15.5 12h.01M9 16h6M2 11v5m20-5v5" /></LineIcon>;
}

export function AlertTriangleIcon({ className }) {
  return <LineIcon className={className}><path d="M10.3 4.3 2.8 18a2 2 0 001.8 3h14.8a2 2 0 001.8-3L13.7 4.3a2 2 0 00-3.4 0z" /><path d="M12 9v5m0 3h.01" /></LineIcon>;
}

export function PencilIcon({ className }) {
  return <LineIcon className={className}><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 00-4-4L4 15l-1 5z" /></LineIcon>;
}

export function CarIcon({ className }) {
  return <LineIcon className={className}><path d="m5 11 1.5-5h11L19 11m-16 0h18v7H3z" /><path d="M6 18v2m12-2v2M6 14h.01M18 14h.01" /></LineIcon>;
}

export function CheckIcon({ className }) {
  return <LineIcon className={className}><path d="m5 12 4 4L19 6" /></LineIcon>;
}

export function PlusIcon({ className }) {
  return <LineIcon className={className}><path d="M12 5v14m-7-7h14" /></LineIcon>;
}

export function SettingsIcon({ className }) {
  return <LineIcon className={className}><path d="M12 8a4 4 0 100 8 4 4 0 000-8z" /><path d="m19.4 15 .1.1a1.7 1.7 0 11-2.4 2.4l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a1.7 1.7 0 11-3.4 0v-.2a1.7 1.7 0 00-2.9-1.2l-.1.1a1.7 1.7 0 11-2.4-2.4l.1-.1a1.7 1.7 0 00-1.2-2.9H4a1.7 1.7 0 110-3.4h.2a1.7 1.7 0 001.2-2.9l-.1-.1a1.7 1.7 0 112.4-2.4l.1.1a1.7 1.7 0 002.9-1.2V2a1.7 1.7 0 113.4 0v.2a1.7 1.7 0 002.9 1.2l.1-.1a1.7 1.7 0 112.4 2.4l-.1.1a1.7 1.7 0 001.2 2.9h.2a1.7 1.7 0 110 3.4h-.2a1.7 1.7 0 00-1.2 2.9z" /></LineIcon>;
}

export function ChevronDownIcon({ className }) {
  return <LineIcon className={className}><path d="m6 9 6 6 6-6" /></LineIcon>;
}

export function MoreHorizontalIcon({ className }) {
  return <LineIcon className={className}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></LineIcon>;
}

export function FilePlusIcon({ className }) {
  return <LineIcon className={className}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5m-7 3v6m-3-3h6" /></LineIcon>;
}
