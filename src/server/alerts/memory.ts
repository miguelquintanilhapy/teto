import type { AlertKind } from "@/core";
import type { AlertRow, AlertsRepo, Email, EmailSender } from "./ports";

export class InMemoryAlertsRepo implements AlertsRepo {
  readonly rows: Array<AlertRow & { profileId: string }> = [];

  async ensure(profileId: string, kind: AlertKind, year: number): Promise<void> {
    if (this.rows.some((r) => r.profileId === profileId && r.kind === kind && r.referenceYear === year)) return;
    this.rows.push({ profileId, kind, referenceYear: year, createdAt: "2026-01-01T00:00:00Z", sentAt: null });
  }

  async list(profileId: string, year: number): Promise<AlertRow[]> {
    return this.rows
      .filter((r) => r.profileId === profileId && r.referenceYear === year)
      .map((r) => ({ kind: r.kind, referenceYear: r.referenceYear, createdAt: r.createdAt, sentAt: r.sentAt }));
  }

  async claim(profileId: string, kinds: AlertKind[], year: number, sentAtIso: string): Promise<AlertKind[]> {
    const claimed: AlertKind[] = [];
    for (const r of this.rows) {
      if (r.profileId === profileId && r.referenceYear === year && kinds.includes(r.kind) && r.sentAt === null) {
        r.sentAt = sentAtIso;
        claimed.push(r.kind);
      }
    }
    return claimed;
  }

  async release(profileId: string, kinds: AlertKind[], year: number): Promise<void> {
    for (const r of this.rows) {
      if (r.profileId === profileId && r.referenceYear === year && kinds.includes(r.kind)) r.sentAt = null;
    }
  }
}

export class FakeEmailSender implements EmailSender {
  readonly sent: Email[] = [];
  fail = false;
  async send(email: Email): Promise<void> {
    if (this.fail) throw new Error("resend: HTTP 500");
    this.sent.push(email);
  }
}
