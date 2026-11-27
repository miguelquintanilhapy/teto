"use client";

import { Camera, FileArrowUp, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRef } from "react";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Confere o arquivo antes de gastar a rede. O servidor confere de novo pelos bytes. */
export function checkFile(file: File): string | null {
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > MAX_BYTES) {
    // Foto grande já foi reduzida antes de chegar aqui; o que sobra é PDF (não dá para reduzir) ou foto que o aparelho não soube abrir.
    return file.type === "application/pdf"
      ? "Este PDF passa de 4 MB. Tire uma foto da nota ou exporte um PDF menor."
      : "Não foi possível reduzir esta foto. Tire outra, mais perto da nota.";
  }
  if (!ACCEPTED.includes(file.type)) return "Envie uma foto (JPG, PNG ou WebP) ou um PDF.";
  return null;
}

const button =
  "pressable flex h-[3.375rem] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full text-[1.1875rem] font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-label";

/** No computador, os dois botões crescem e ficam lado a lado, no centro da tela. */
const desk = "lg:h-[76px] lg:w-auto lg:min-w-[320px] lg:rounded-[20px] lg:px-11 lg:text-[1.5rem] lg:[&>svg]:size-[30px]";

/**
 * Escolher a nota. "Tirar foto" vem primeiro: no celular, a nota quase sempre é de papel.
 * Os botões ficam logo abaixo do cartão (e não presos ao rodapé), sem um vazio no meio da tela.
 *
 * No computador (`lg`), vira uma página de envio de arquivo: sem cartão, tudo no centro da tela, título grande e os
 * dois botões grandes lado a lado ("Tirar foto" continua o principal, em azul e à esquerda).
 */
export function ChooseStep({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois de um erro
    if (file) onFile(file);
  };

  return (
    <div className="lg:m-auto lg:flex lg:w-full lg:max-w-[880px] lg:flex-col lg:items-center lg:pb-16 lg:text-center">
      <section className="rounded-card bg-card p-6 text-center lg:bg-transparent lg:p-0">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-tile lg:size-[86px] lg:rounded-[22px] lg:[&>svg]:size-[46px]">
          <FileArrowUp size={34} weight="fill" aria-hidden="true" />
        </span>
        <h2 className="t-title mt-4 lg:mt-7 lg:text-[3.25rem] lg:leading-[1.1] lg:font-extrabold lg:tracking-[-0.03em]">Foto, PDF ou comprovante de Pix</h2>
        <p className="t-body mt-2 text-label-2 lg:mt-4 lg:text-[1.375rem]">A IA lê os dados e você confere antes de somar ao limite.</p>
      </section>

      {error && (
        <p role="alert" className="t-body mt-4 flex items-start gap-2 rounded-card bg-card p-4 text-danger-text lg:mt-8 lg:text-left">
          <Warning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

    
<div className="mt-5 flex flex-col gap-3 lg:mt-11 lg:flex-row lg:justify-center lg:gap-4">
  <label className={`${button} ${desk} bg-primary text-on-primary shadow-[var(--glow)]`}>
    <Camera size={24} weight="bold" aria-hidden="true" />
    Tirar foto
    <input
      ref={cameraRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={pick}
      className="sr-only"
    />
  </label>

  <label className={`${button} ${desk} bg-card text-action`}>
    <FileArrowUp size={24} weight="bold" aria-hidden="true" />
    Escolher arquivo
    <input
      ref={galleryRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      onChange={pick}
      className="sr-only"
    />
  </label>
</div>

{/* Venda em dinheiro ou Pix sem comprovante: sem nota não há o que enviar, mas há o que lançar. */}
<p className="t-body mt-4 text-center text-label-2">
  Não tem nota?{" "}
  <Link href="/lancar" className="font-semibold text-action">
    Lançar sem nota
  </Link>
</p>

<p className="t-sub mt-5 px-2 text-center text-label-2 lg:mt-[22px] lg:max-w-[640px] lg:text-base">
  A imagem é lida por um serviço de IA (Google ou OpenRouter). Use só notas suas.
</p>
</div>
);
}
