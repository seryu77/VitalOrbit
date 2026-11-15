// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { StatusIcon } from "../../components/StatusIcon";
import { INDICATOR_BY_ID, INDICATORS, REGIONS } from "../../data/rules/indicators";
import { formatValue, STATUS_LABEL } from "../../lib/engine";
import type { Assessment, Region, Status } from "../../lib/types";
import { BodyMap } from "./BodyMap";
import { createBodyScene, type BodyScene, type View } from "./bodyScene";

interface Props {
  statusByRegion: Record<Region, Status>;
  selected: Region | null;
  onSelect: (region: Region) => void;
  /** Clears the region filter ("All regions" in the dropdown). */
  onClear?: () => void;
  /** Current readings, shown when a body part is hovered. */
  assessments?: Assessment[];
  /** Value to display for a reading, for example a live wearable value. */
  valueOf?: (a: Assessment) => number;
}

const VIEWS: View[] = ["front", "side", "back"];
const TIP_WIDTH = 260;
const labelOf = (r: Region) => REGIONS.find((x) => x.id === r)!.label;
const indicatorsOf = (r: Region) =>
  INDICATORS.filter((d) => d.region === r)
    .map((d) => d.label)
    .join(", ");

const prefersReducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

/**
 * 3D body map. Drag to turn the figure, hover a body part to see its readings,
 * select it to open its indicators. The region dropdown gives the same selection
 * by keyboard and screen reader. Falls back to the flat body map when WebGL or
 * the anatomy model is not available.
 */
export function BodyMap3D({ statusByRegion, selected, onSelect, onClear, assessments = [], valueOf }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BodyScene | null>(null);
  const pickRef = useRef(onSelect);
  pickRef.current = onSelect;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("front");
  const [hover, setHover] = useState<{ region: Region; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    try {
      sceneRef.current = createBodyScene(hostRef.current, {
        onPick: (r) => pickRef.current(r),
        onHover: (region, x, y) => setHover(region ? { region, x, y } : null),
        onReady: () => setReady(true),
        onError: () => setFailed(true),
        reducedMotion: prefersReducedMotion(),
      });
    } catch {
      setFailed(true);
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update(statusByRegion, selected);
  }, [statusByRegion, selected]);

  if (failed) return <BodyMap statusByRegion={statusByRegion} selected={selected} onSelect={onSelect} />;

  const changeView = (v: View) => {
    setView(v);
    sceneRef.current?.setView(v);
  };

  // Keep the hover card inside the viewport: flip it to the left of the pointer near the right edge.
  const tipStyle = () => {
    if (!hover) return {};
    const w = hostRef.current?.clientWidth ?? 0;
    const left = hover.x + 16 + TIP_WIDTH > w ? Math.max(8, hover.x - 16 - TIP_WIDTH) : hover.x + 16;
    return { left, top: hover.y + 16 };
  };

  const readings = (r: Region) => assessments.filter((a) => INDICATOR_BY_ID[a.indicator].region === r);

  return (
    <div className="bm3d">
      <div className="viewport">
        <div ref={hostRef} className="viewport-canvas" />
        <span className="vp-corner vp-tl" aria-hidden="true" />
        <span className="vp-corner vp-tr" aria-hidden="true" />
        <span className="vp-corner vp-bl" aria-hidden="true" />
        <span className="vp-corner vp-br" aria-hidden="true" />
        <p className="vp-hint mono" aria-hidden="true">
          Hover · Drag to turn
        </p>
        {!ready && <p className="vp-loading mono">Loading anatomy…</p>}
        <p className="vp-credit">
          BodyParts3D © DBCLS ·{" "}
          <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer">
            CC BY-SA 2.1 JP
          </a>
        </p>

        {hover && (
          <div className={`vp-tip tip-${statusByRegion[hover.region]}`} style={tipStyle()} aria-hidden="true">
            <div className="tip-head">
              <strong>{labelOf(hover.region)}</strong>
              <span className="tip-status">
                <StatusIcon status={statusByRegion[hover.region]} size={12} />
                {STATUS_LABEL[statusByRegion[hover.region]]}
              </span>
            </div>
            <ul className="tip-readings">
              {readings(hover.region).map((a) => {
                const def = INDICATOR_BY_ID[a.indicator];
                return (
                  <li key={a.indicator} className={`tr-${a.status}`}>
                    <StatusIcon status={a.status} size={12} />
                    <span className="tr-name">{def.label}</span>
                    <span className="tr-value">
                      {formatValue(def, valueOf ? valueOf(a) : a.value)}
                      <span className="tr-unit">{def.unit}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="tip-foot mono">Click to open</p>
          </div>
        )}

        <div className="vp-views" role="group" aria-label="Turn the figure">
          {VIEWS.map((v) => (
            <button key={v} className={`vp-view mono${view === v ? " is-on" : ""}`} aria-pressed={view === v} onClick={() => changeView(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <RegionPicker statusByRegion={statusByRegion} selected={selected} onSelect={onSelect} onClear={onClear} />
    </div>
  );
}

/* ---------- Region dropdown ---------- */

interface PickerProps {
  statusByRegion: Record<Region, Status>;
  selected: Region | null;
  onSelect: (region: Region) => void;
  onClear?: () => void;
}

function RegionPicker({ statusByRegion, selected, onSelect, onClear }: PickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  // Move focus into the list when it opens, onto the current choice.
  useEffect(() => {
    if (!open) return;
    const items = listRef.current?.querySelectorAll<HTMLElement>("[role=option]");
    const current = listRef.current?.querySelector<HTMLElement>("[aria-selected=true]");
    (current ?? items?.[0])?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (r: Region | null) => {
    if (r === null) onClear?.();
    else if (r !== selected) onSelect(r);
    close();
  };

  const onListKey = (e: KeyboardEvent) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[role=option]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") items[Math.min(items.length - 1, i + 1)]?.focus();
    else if (e.key === "ArrowUp") items[Math.max(0, i - 1)]?.focus();
    else if (e.key === "Home") items[0]?.focus();
    else if (e.key === "End") items[items.length - 1]?.focus();
    else if (e.key === "Escape" || e.key === "Tab") close();
    else return;
    e.preventDefault();
  };

  const optionKey = (r: Region | null) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(r);
    }
  };

  const s = selected ? statusByRegion[selected] : null;
  const counts = REGIONS.reduce(
    (acc, r) => ({ ...acc, [statusByRegion[r.id]]: acc[statusByRegion[r.id]] + 1 }),
    { green: 0, yellow: 0, red: 0 } as Record<Status, number>,
  );

  return (
    <div className="picker" ref={rootRef}>
      <span className="picker-label mono" id="region-picker-label">
        Region
      </span>
      <button
        ref={triggerRef}
        className={`picker-trigger${s ? ` pt-${s}` : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="region-picker-label region-picker-value"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span id="region-picker-value" className="pt-value">
          {selected ? (
            <>
              <StatusIcon status={s!} size={16} />
              <span className="pt-name">{labelOf(selected)}</span>
              <span className="pt-status mono">{STATUS_LABEL[s!]}</span>
            </>
          ) : (
            <>
              <span className="pt-name">All regions</span>
              <span className="pt-summary mono">
                {counts.red > 0 && <span className="c-red">{counts.red} critical</span>}
                {counts.yellow > 0 && <span className="c-yellow">{counts.yellow} attention</span>}
                {counts.red + counts.yellow === 0 && <span>All normal</span>}
              </span>
            </>
          )}
        </span>
        <svg className="pt-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <ul className="picker-list" role="listbox" aria-label="Body region" ref={listRef} onKeyDown={onListKey}>
          {onClear && (
            <li
              role="option"
              tabIndex={-1}
              aria-selected={selected === null}
              className={`po${selected === null ? " is-on" : ""}`}
              onClick={() => choose(null)}
              onKeyDown={optionKey(null)}
            >
              <span className="po-icon" aria-hidden="true" />
              <span className="po-name">All regions</span>
              <span className="po-ind">Show every indicator</span>
            </li>
          )}
          {REGIONS.map((r) => {
            const st = statusByRegion[r.id];
            return (
              <li
                key={r.id}
                role="option"
                tabIndex={-1}
                aria-selected={selected === r.id}
                className={`po po-${st}${selected === r.id ? " is-on" : ""}`}
                onClick={() => choose(r.id)}
                onKeyDown={optionKey(r.id)}
              >
                <StatusIcon status={st} size={16} />
                <span className="po-name">{r.label}</span>
                <span className="po-ind">{indicatorsOf(r.id)}</span>
                <span className="po-status mono">{STATUS_LABEL[st]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
