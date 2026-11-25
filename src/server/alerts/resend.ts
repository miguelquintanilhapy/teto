import type { Email, EmailSender } from "./ports";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/** Envio pela API do Resend. A chave nunca aparece em mensagens de erro nem em log. */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: FetchLike = (i, init) => fetch(i, init),
  ) {}

  async send(email: Email): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      throw new Error(`resend: sem resposta (${e instanceof Error ? e.name : "erro"})`);
    }
    if (!res.ok) {
      // Só o status: o corpo da resposta pode repetir o endereço do destinatário.
      throw new Error(`resend: HTTP ${res.status}`);
    }
  }
}
