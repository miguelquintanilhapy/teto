import type { AlertKind } from "@/core";

/** O que o banco guarda de cada alerta: um por faixa e por ano. */
export interface AlertRow {
  kind: AlertKind;
  referenceYear: number;
  createdAt: string;
  /** Nulo enquanto o e-mail não saiu; o cron tenta de novo. */
  sentAt: string | null;
}

export interface AlertsRepo {
  /** Cria o alerta se ainda não existe (idempotente por perfil, faixa e ano). */
  ensure(profileId: string, kind: AlertKind, year: number): Promise<void>;
  list(profileId: string, year: number): Promise<AlertRow[]>;
  /**
   * Reserva, de forma atômica, os alertas ainda não enviados e devolve só os que ESTA chamada conseguiu
   * reservar. Duas rodadas simultâneas (cron e confirmação) nunca reservam o mesmo alerta.
   */
  claim(profileId: string, kinds: AlertKind[], year: number, sentAtIso: string): Promise<AlertKind[]>;
  /** Devolve à fila o que foi reservado e não chegou a sair (falha no envio). */
  release(profileId: string, kinds: AlertKind[], year: number): Promise<void>;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  send(email: Email): Promise<void>;
}
