// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import type { Status } from "../lib/types";

/**
 * Status shapes from DESIGN.md section 5: check mark, exclamation mark, warning triangle.
 * Each status has a different outline (circle, diamond, triangle), so the shape alone
 * tells the statuses apart for people with color vision deficiency.
 */
export function StatusIcon({ status, size = 16 }: { status: Status | "none"; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "status-icon",
  };

  if (status === "green") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.6" />
        <path d="M5.2 8.3 7.1 10.1 10.9 6.1" />
      </svg>
    );
  }
  if (status === "yellow") {
    return (
      <svg {...common}>
        <path d="M8 1.3 14.7 8 8 14.7 1.3 8Z" />
        <path d="M8 5v3.6" />
        <circle cx="8" cy="11" r="0.4" fill="currentColor" />
      </svg>
    );
  }
  if (status === "red") {
    return (
      <svg {...common}>
        <path d="M8 1.8 14.8 13.6H1.2Z" fill="currentColor" fillOpacity="0.18" />
        <path d="M8 6.2v3.4" />
        <circle cx="8" cy="11.6" r="0.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6.6" strokeDasharray="2 2.2" />
      <path d="M5.5 8h5" />
    </svg>
  );
}
