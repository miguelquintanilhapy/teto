// Cria o perfil de demonstração (dados 100% fictícios). Idempotente: se já existe, não faz nada.
// Uso: npm run seed
//
// O e-mail do perfil recebe os alertas: defina DEMO_PROFILE_EMAIL no .env.local para
// receber de verdade. Sem ele, usa um endereço de exemplo.
import { createAdminClient } from "../src/server/db/client";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}

const db = createAdminClient(url, key);

const { data: existing, error: readError } = await db.from("mei_profiles").select("id, name").limit(1).maybeSingle();
if (readError) {
  console.error(`Não consegui ler os perfis: ${readError.message}`);
  process.exit(1);
}
if (existing) {
  console.log(`Já existe um perfil de demonstração: "${(existing as { name: string }).name}". Nada a fazer.`);
} else {
  const { error } = await db.from("mei_profiles").insert({
    name: "Doces da Marta MEI",
    tax_id: "11222333000181", // CNPJ fictício com dígitos verificadores válidos
    opening_date: "2026-03-01", // aberto em março: limite proporcional de 10 meses
    email: process.env.DEMO_PROFILE_EMAIL || "demo@example.com",
  });
  if (error) {
    console.error(`Não consegui criar o perfil: ${error.message}`);
    process.exit(1);
  }
  console.log('Perfil de demonstração criado: "Doces da Marta MEI" (aberto em 03/2026).');
}
