import type { Tone } from "@/lib/copy";

const FILL: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

/**
 * A "sala" do limite: o espaço vazio é o que ainda cabe até o teto.
 * O telhado cheio marca o limite; o pontilhado, o limite com 20% a mais.
 * Medidor de capacidade, e não anel de progresso (a Apple reserva o anel para atividade).
 */
export function Room({ ratio, tone, label }: { ratio: number; tone: Tone; label: string }) {
  const H = 150; // altura da sala = o limite
  const TOP = 62; // y do topo da sala
  const filled = Math.max(0, Math.min(1, ratio));
  const fillH = H * filled;
  const roomPath = `M10,${TOP + 4} Q10,${TOP} 14,${TOP} H90 Q94,${TOP} 94,${TOP + 4} V${TOP + H - 14} Q94,${TOP + H} 80,${TOP + H} H24 Q10,${TOP + H} 10,${TOP + H - 14} Z`;
  const clipId = "room-clip";
  return (
    <svg width="104" height="216" viewBox="0 0 104 216" role="img" aria-label={label} className="shrink-0 self-center">
      <defs>
        <clipPath id={clipId}>
          <path d={roomPath} />
        </clipPath>
      </defs>
      <path d={roomPath} fill="var(--track)" stroke="var(--label-2)" strokeOpacity="0.45" strokeWidth="1.5" />
      <g clipPath={`url(#${clipId})`}>
        <rect
          className="room-fill"
          x="10"
          y={TOP + H - fillH}
          width="84"
          height={fillH + 2}
          fill={FILL[tone]}
        />
      </g>
      {/* limite */}
      <path d={`M10,${TOP} L52,${TOP - 26.6} L94,${TOP}`} fill="none" stroke="var(--label)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* limite + 20% (tolerância), pontilhado */}
      <path
        d={`M10,${TOP - 30} L52,${TOP - 56.6} L94,${TOP - 30}`}
        fill="none"
        stroke="var(--label)"
        strokeOpacity="0.5"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.1 11"
      />
    </svg>
  );
}

/** Telhado pequeno para a legenda: cheio (limite) ou pontilhado (limite + 20%). */
export function RoofKey({ dotted = false }: { dotted?: boolean }) {
  return (
    <svg width="20" height="11" viewBox="0 0 20 11" aria-hidden="true" className="shrink-0">
      <path
        d="M2.5,9 L10,2.5 L17.5,9"
        fill="none"
        stroke="var(--label)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dotted ? "0.1 5" : undefined}
      />
    </svg>
  );
}
