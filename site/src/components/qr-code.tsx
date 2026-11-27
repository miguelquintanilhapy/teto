import QRCode from "qrcode";

/**
 * QR code desenhado à mão a partir da matriz do `qrcode`: módulos em ponto e os três
 * marcadores de canto arredondados, no estilo do resto do site. Gerado no build (nada no navegador).
 * Correção de erro "M": continua legível com o desenho arredondado.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

  const dots: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x] && !inFinder(x, y)) dots.push([x, y]);
    }
  }
  const finders: Array<[number, number]> = [[0, 0], [size - 7, 0], [0, size - 7]];

  return (
    <svg viewBox={`-3 -3 ${size + 6} ${size + 6}`} role="img" aria-label={label} className={className}>
      <rect x="-3" y="-3" width={size + 6} height={size + 6} rx="3.5" fill="#fff" />
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r="0.46" fill="#000" />
      ))}
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="1.8" fill="none" stroke="#000" strokeWidth="1" />
          <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.9" fill="#000" />
        </g>
      ))}
    </svg>
  );
}
