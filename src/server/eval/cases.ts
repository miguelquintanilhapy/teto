import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { DocumentInput } from "../extraction/provider";

const ExpectedSchema = z.object({
  documentType: z.enum(["nota_fiscal", "recibo", "comprovante_pix", "outro"]),
  issueDate: z.string(),
  totalCents: z.number().int(),
  issuerTaxId: z.string().nullable(),
  recipientTaxId: z.string().nullable(),
  accessKey: z.string().nullable(),
});

const CasesFileSchema = z.object({
  ownerTaxId: z.string(),
  ownerName: z.string(),
  cases: z.array(
    z.object({
      id: z.string(),
      file: z.string(),
      mimeType: z.string(),
      tags: z.array(z.string()),
      expected: ExpectedSchema,
    }),
  ),
});

export interface EvalCase {
  id: string;
  tags: string[];
  expected: z.infer<typeof ExpectedSchema>;
  doc: DocumentInput;
}

export interface EvalSuite {
  ownerTaxId: string;
  cases: EvalCase[];
}

export async function loadSuite(dir: string): Promise<EvalSuite> {
  const file = CasesFileSchema.parse(JSON.parse(await readFile(join(dir, "cases.json"), "utf8")));
  const cases = await Promise.all(
    file.cases.map(async (c) => ({
      id: c.id,
      tags: c.tags,
      expected: c.expected,
      doc: { mimeType: c.mimeType, data: new Uint8Array(await readFile(join(dir, c.file))) },
    })),
  );
  return { ownerTaxId: file.ownerTaxId, cases };
}
