'use client';
import { useRef, useState } from 'react';

/**
 * Small theme-aware SVG charts for the analytics page. Series colors are the
 * validated dataviz slots (blue / orange), chrome uses the shadcn ink tokens.
 */

export interface DayPoint { day: string; value: number; extra?: string }

const VB_W = 600;
const PAD = { top: 14, right: 8, bottom: 20, left: 34 };

const fmtN = (n: number) => n.toLocaleString('el-GR');
const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

function niceMax(max: number) {
  if (max <= 0) return 5;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (max <= m * pow) return m * pow;
  return 10 * pow;
}

function useHover(count: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || count === 0) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VB_W;
    const inner = VB_W - PAD.left - PAD.right;
    const i = Math.round(((x - PAD.left) / inner) * (count - 1));
    setIdx(i >= 0 && i < count ? i : null);
  };
  return { ref, idx, onMove, onLeave: () => setIdx(null) };
}

function Tooltip({ idx, count, children }: { idx: number; count: number; children: React.ReactNode }) {
  const left = count > 1 ? (idx / (count - 1)) * 100 : 50;
  return (
    <div className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: `clamp(3.5rem, ${left}%, calc(100% - 3.5rem))` }}>
      {children}
    </div>
  );
}

function Grid({ max, h }: { max: number; h: number }) {
  const ticks = [0, 0.5, 1];
  return (
    <>
      {ticks.map((t) => {
        const y = PAD.top + (h - PAD.top - PAD.bottom) * (1 - t);
        return (
          <g key={t}>
            {t > 0 && <line x1={PAD.left} x2={VB_W - PAD.right} y1={y} y2={y} className="stroke-border" strokeWidth={1} strokeDasharray="2 3" />}
            <text x={PAD.left - 5} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>{fmtN(Math.round(max * t))}</text>
          </g>
        );
      })}
    </>
  );
}

function XLabels({ days, h }: { days: string[]; h: number }) {
  if (days.length < 2) return null;
  const picks = [0, Math.floor(days.length / 2), days.length - 1];
  const inner = VB_W - PAD.left - PAD.right;
  return (
    <>
      {picks.map((i, k) => (
        <text key={i} x={PAD.left + (i / (days.length - 1)) * inner} y={h - 6}
          textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} className="fill-muted-foreground" fontSize={9}>
          {fmtDay(days[i])}
        </text>
      ))}
    </>
  );
}

/** Single-series daily bar chart with hover tooltip. */
export function DailyBars({ data, valueLabel, height = 190 }: { data: DayPoint[]; valueLabel: string; height?: number }) {
  const { ref, idx, onMove, onLeave } = useHover(data.length);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const inner = VB_W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const step = data.length > 0 ? inner / data.length : inner;
  const bw = Math.min(Math.max(step * 0.62, 2), 26);
  const r = Math.min(4, bw / 2);
  const lastNonZero = [...data].reverse().find((d) => d.value > 0);

  return (
    <div className="relative">
      {idx !== null && data[idx] && (
        <Tooltip idx={idx} count={data.length}>
          <span className="text-muted-foreground">{fmtDay(data[idx].day)}</span>{' · '}
          <b>{fmtN(data[idx].value)}</b> {valueLabel}
          {data[idx].extra && <span className="text-muted-foreground"> · {data[idx].extra}</span>}
        </Tooltip>
      )}
      <svg ref={ref} viewBox={`0 0 ${VB_W} ${height}`} className="w-full [--s1:#2a78d6] dark:[--s1:#3987e5]"
        onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label={valueLabel}>
        <Grid max={max} h={height} />
        {data.map((d, i) => {
          const hgt = max > 0 ? (d.value / max) * innerH : 0;
          const x = PAD.left + i * step + (step - bw) / 2;
          const y = PAD.top + innerH - hgt;
          if (d.value === 0) return null;
          const rr = Math.min(r, hgt);
          return (
            <path key={d.day}
              d={`M${x},${y + hgt} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + bw - rr} Q${x + bw},${y} ${x + bw},${y + rr} V${y + hgt} Z`}
              fill="var(--s1)" opacity={idx === null || idx === i ? 1 : 0.45} />
          );
        })}
        <line x1={PAD.left} x2={VB_W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="stroke-border" strokeWidth={1} />
        {lastNonZero && idx === null && (
          <text x={PAD.left + data.indexOf(lastNonZero) * step + step / 2} y={PAD.top + innerH - (lastNonZero.value / max) * innerH - 5}
            textAnchor="middle" className="fill-foreground" fontSize={10} fontWeight={600}>{fmtN(lastNonZero.value)}</text>
        )}
        <XLabels days={data.map((d) => d.day)} h={height} />
      </svg>
    </div>
  );
}

/** Two-series daily line chart (crosshair + tooltip + legend). */
export function DualLines({ data, aLabel, bLabel, height = 190 }:
  { data: { day: string; a: number; b: number }[]; aLabel: string; bLabel: string; height?: number }) {
  const { ref, idx, onMove, onLeave } = useHover(data.length);
  const max = niceMax(Math.max(...data.flatMap((d) => [d.a, d.b]), 0));
  const inner = VB_W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const pt = (i: number, v: number) => {
    const x = PAD.left + (data.length > 1 ? (i / (data.length - 1)) * inner : inner / 2);
    const y = PAD.top + innerH - (max > 0 ? (v / max) * innerH : 0);
    return `${x},${y}`;
  };
  const line = (key: 'a' | 'b') => data.map((d, i) => pt(i, d[key])).join(' ');

  return (
    <div className="relative [--s1:#2a78d6] [--s2:#eb6834] dark:[--s1:#3987e5] dark:[--s2:#d95926]">
      <div className="mb-1 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--s1)' }} />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--s2)' }} />{bLabel}</span>
      </div>
      {idx !== null && data[idx] && (
        <Tooltip idx={idx} count={data.length}>
          <span className="text-muted-foreground">{fmtDay(data[idx].day)}</span>
          <span className="ml-2 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--s1)' }} /><b>{fmtN(data[idx].a)}</b></span>
          <span className="ml-2 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--s2)' }} /><b>{fmtN(data[idx].b)}</b></span>
        </Tooltip>
      )}
      <svg ref={ref} viewBox={`0 0 ${VB_W} ${height}`} className="w-full" onMouseMove={onMove} onMouseLeave={onLeave}
        role="img" aria-label={`${aLabel} / ${bLabel}`}>
        <Grid max={max} h={height} />
        <polyline points={line('a')} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinejoin="round" />
        <polyline points={line('b')} fill="none" stroke="var(--s2)" strokeWidth={2} strokeLinejoin="round" />
        {idx !== null && data[idx] && (
          <g>
            <line x1={pt(idx, 0).split(',')[0]} x2={pt(idx, 0).split(',')[0]} y1={PAD.top} y2={PAD.top + innerH} className="stroke-muted-foreground" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={pt(idx, data[idx].a).split(',')[0]} cy={pt(idx, data[idx].a).split(',')[1]} r={4} fill="var(--s1)" className="stroke-background" strokeWidth={2} />
            <circle cx={pt(idx, data[idx].b).split(',')[0]} cy={pt(idx, data[idx].b).split(',')[1]} r={4} fill="var(--s2)" className="stroke-background" strokeWidth={2} />
          </g>
        )}
        <line x1={PAD.left} x2={VB_W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="stroke-border" strokeWidth={1} />
        <XLabels days={data.map((d) => d.day)} h={height} />
      </svg>
    </div>
  );
}
