// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { STATUS_LABEL } from "../lib/engine";
import type { Status } from "../lib/types";
import { StatusIcon } from "./StatusIcon";

/** Status is always shown with color, icon, and text together, never color alone. */
export function StatusBadge({ status, large }: { status: Status; large?: boolean }) {
  return (
    <span className={`badge badge-${status}${large ? " badge-large" : ""}`}>
      <StatusIcon status={status} size={large ? 26 : 14} /> {STATUS_LABEL[status]}
    </span>
  );
}
