import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const shared = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArchiveMark(props: IconProps) {
  return (
    <svg {...shared} viewBox="0 0 32 32" {...props}>
      <path d="M16 2.75 27 8.9v14.2L16 29.25 5 23.1V8.9Z" />
      <path d="m9.5 11.4 6.5-3.6 6.5 3.6v9.2L16 24.2l-6.5-3.6Z" />
      <path d="M16 7.8v16.4M9.5 11.4l13 9.2m0-9.2-13 9.2" opacity=".55" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M12 2.7c.5 4.7 2.6 6.8 7.3 7.3-4.7.5-6.8 2.6-7.3 7.3-.5-4.7-2.6-6.8-7.3-7.3 4.7-.5 6.8-2.6 7.3-7.3Z" />
      <path d="M19 16.2c.2 2.2 1.1 3.1 3.3 3.3-2.2.2-3.1 1.1-3.3 3.3-.2-2.2-1.1-3.1-3.3-3.3 2.2-.2 3.1-1.1 3.3-3.3Z" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M12 21V9m0 0 4 4m-4-4-4 4M4 4h16" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

export function ReplayIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M20 11a8 8 0 1 0-2.35 5.65" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function InspectIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
