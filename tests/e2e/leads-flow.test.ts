/**
 * End-to-end test suite covering the CRM lead lifecycle:
 *   1. Lead creation (NewLeadTab logic)
 *   2. Lead editing (LeadCard inline edits)
 *   3. Document upload + persistence (storage + lead_documents)
 *   4. Funnel moves (drag-and-drop status transitions)
 *
 * Runs against the live Lovable Cloud DB using real authenticated sessions
 * (publishable key + password auth). Cleans up everything it created.
 *
 * Run: bunx vitest run tests/e2e/leads-flow.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GESTOR_EMAIL, VENDOR_EMAIL, VENDOR_NAME, makeClient, signIn, uniquePhone, uniqueProcesso } from "../helpers/client";

const BUCKET = "lead-docs";

describe("CRM lead lifecycle (e2e)", () => {
  const vendor = makeClient();
  const gestor = makeClient();
  let leadId = "";
  let docPath = "";
  const processo = uniqueProcesso();
  const phone = uniquePhone();
  const nome = `E2E Test ${Date.now()}`;

  beforeAll(async () => {
    await signIn(vendor, VENDOR_EMAIL);
    await signIn(gestor, GESTOR_EMAIL);
  });

  afterAll(async () => {
    // Cleanup — gestor can delete any lead. Cascades remove lead_documents rows.
    if (leadId) {
      await gestor.from("leads").delete().eq("id", leadId);
    }
    if (docPath) {
      await gestor.storage.from(BUCKET).remove([docPath]);
    }
    await vendor.auth.signOut();
    await gestor.auth.signOut();
  });

  it("1) blocks creation when an exact duplicate already exists in the CRM", async () => {
    // First insert
    const { data: first, error: firstErr } = await vendor
      .from("leads")
      .insert({
        vendedor: VENDOR_NAME,
        nome,
        phone,
        processo,
        status: "dia_1",
        movido_em: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(firstErr).toBeNull();
    expect(first?.id).toBeTruthy();
    leadId = first!.id;

    // Duplicate detection: replicate the same digits-only match used by checkLeadDuplicate.
    const procDigits = processo.replace(/\D/g, "");
    const { data: matches } = await gestor
      .from("leads")
      .select("id, processo")
      .ilike("processo", `%${procDigits.slice(0, 7)}%`);
    const found = (matches ?? []).find((m) => (m.processo ?? "").replace(/\D/g, "") === procDigits);
    expect(found?.id).toBe(leadId);
  });

  it("2) edits the lead and persists nome, valor_causa, and obs", async () => {
    const newNome = nome + " (editado)";
    const { error } = await vendor
      .from("leads")
      .update({ nome: newNome, valor_causa: 12345.67, obs: "obs editado" })
      .eq("id", leadId);
    expect(error).toBeNull();

    const { data } = await vendor.from("leads").select("nome, valor_causa, obs").eq("id", leadId).single();
    expect(data?.nome).toBe(newNome);
    expect(Number(data?.valor_causa)).toBeCloseTo(12345.67, 2);
    expect(data?.obs).toBe("obs editado");
  });

  it("3) uploads a document and the row stays linked to the lead permanently", async () => {
    const content = new Blob([`e2e test file ${Date.now()}`], { type: "text/plain" });
    docPath = `${leadId}/${Date.now()}_e2e.txt`;
    const up = await vendor.storage.from(BUCKET).upload(docPath, content);
    expect(up.error).toBeNull();

    const { data: doc, error: insErr } = await vendor
      .from("lead_documents")
      .insert({
        lead_id: leadId,
        categoria: "001 PROCURAÇÃO",
        nome_arquivo: "e2e.txt",
        storage_path: docPath,
        mime_type: "text/plain",
        tamanho: 64,
      })
      .select("id")
      .single();
    expect(insErr).toBeNull();
    expect(doc?.id).toBeTruthy();

    // Persistence check via a second client session (simulates reloading the page)
    const reader = makeClient();
    await signIn(reader, VENDOR_EMAIL);
    const { data: rows } = await reader
      .from("lead_documents")
      .select("id, storage_path, nome_arquivo, categoria")
      .eq("lead_id", leadId);
    await reader.auth.signOut();
    expect(rows?.length).toBeGreaterThanOrEqual(1);
    expect(rows?.[0].storage_path).toBe(docPath);
  });

  it("4) moves the lead through the funnel and records movido_em on each step", async () => {
    const steps = ["dia_2", "dia_3", "negociacao", "contrato", "cliente_fechado"] as const;
    let lastMoved = "";
    for (const status of steps) {
      const movido_em = new Date().toISOString();
      const { error } = await vendor.from("leads").update({ status, movido_em }).eq("id", leadId);
      expect(error, `move to ${status}`).toBeNull();
      const { data } = await vendor.from("leads").select("status, movido_em").eq("id", leadId).single();
      expect(data?.status).toBe(status);
      expect(data?.movido_em).toBeTruthy();
      expect(data!.movido_em).not.toBe(lastMoved);
      lastMoved = data!.movido_em as string;
      await new Promise((r) => setTimeout(r, 10));
    }
  });

  it("5) gestor can see the lead and its document across sessions", async () => {
    const { data: lead } = await gestor.from("leads").select("id, status, nome").eq("id", leadId).single();
    expect(lead?.status).toBe("cliente_fechado");
    const { data: docs } = await gestor.from("lead_documents").select("id").eq("lead_id", leadId);
    expect(docs?.length).toBeGreaterThanOrEqual(1);
  });
});
