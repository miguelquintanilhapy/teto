"use client";

import { Camera, FileArrowUp, Warning } from "@phosphor-icons/react/dist/ssr";
import { useRef } from "react";
import { BottomAction } from "./sheet-shell";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Confere o arquivo antes de gastar a rede. O servidor confere de novo pelos bytes. */
export function checkFile(file: File): string | null {
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > MAX_BYTES) {
    // Foto grande já foi reduzida antes de chegar aqui; o que sobra é PDF (não dá para reduzir) ou foto que o aparelho não soube abrir.
    return file.type === "application/pdf"
      ? "Este PDF passa de 4 MB. Tire uma foto da nota ou exporte um PDF menor."
      : "Não consegui reduzir esta foto. Tire outra, mais perto da nota.";
  }
  if (!ACCEPTED.includes(file.type)) return "Envie uma foto (JPG, PNG ou WebP) ou um PDF.";
  return null;
}

const button =
  "flex h-[3.375rem] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full text-[1.1875rem] font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-label";

export function ChooseStep({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois de um erro
    if (file) onFile(file);
  };

  return (
    <>
      <section className="rounded-card bg-card p-6 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-tile">
          <FileArrowUp size={34} weight="fill" aria-hidden="true" />
        </span>
        <h2 className="t-title mt-4">Envie a nota</h2>
        <p className="t-body mt-2 text-label-2">
          Foto, PDF ou comprovante de Pix. A IA lê os dados e você confere antes de somar ao limite.
        </p>
      </section>

      {error && (
        <p role="alert" className="t-body mt-4 flex items-start gap-2 rounded-card bg-card p-4 text-danger-text">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <p className="t-sub mt-4 px-2 text-center text-label-2">Foto, PNG, WebP ou PDF. Fotos grandes são reduzidas sozinhas.</p>

      <BottomAction>
        <label className={`${button} bg-primary text-on-primary shadow-[var(--glow)]`}>
          <FileArrowUp size={24} weight="bold" aria-hidden="true" />
          Escolher arquivo
          <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pick} className="sr-only" />
        </label>
        <label className={`${button} bg-card text-label`}>
          <Camera size={24} weight="bold" aria-hidden="true" />
          Tirar foto
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" />
        </label>
      </BottomAction>
    </>
  );
}
