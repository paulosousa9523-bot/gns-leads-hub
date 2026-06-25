import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "lead-docs";
const TEMPLATE_PREFIX = "contract-templates";
const OUTPUT_PREFIX = "contracts";

export const CONTRACT_TYPES = ["procuracao", "hipossuficiencia", "honorarios"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  procuracao: "Procuração",
  hipossuficiencia: "Declaração de Hipossuficiência",
  honorarios: "Contrato de Honorários",
};

const tipoSchema = z.enum(CONTRACT_TYPES);

/** Upload de um novo modelo de contrato (.docx) para um tipo. */
export const uploadContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      tipo: tipoSchema,
      nome: z.string().trim().min(1).max(200),
      mime_type: z.string().trim().max(120).optional().nullable(),
      tamanho: z.number().int().nonnegative().optional().nullable(),
      base64: z.string().min(1),
      uploader: z.string().trim().min(1).max(120),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isStaff } = await context.supabase.rpc("is_internal_staff");
    if (!isStaff) throw new Error("Sem permissão para gerenciar modelos.");

    const buf = Buffer.from(data.base64, "base64");
    const path = `${TEMPLATE_PREFIX}/${data.tipo}/${crypto.randomUUID()}.docx`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: data.mime_type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });
    if (upErr) throw new Error(`Falha ao salvar modelo: ${upErr.message}`);

    // Desativa modelos anteriores do MESMO tipo
    await supabaseAdmin
      .from("contract_templates")
      .update({ ativo: false })
      .eq("ativo", true)
      .eq("tipo", data.tipo);

    const { data: tpl, error: insErr } = await supabaseAdmin
      .from("contract_templates")
      .insert({
        tipo: data.tipo,
        nome: data.nome,
        storage_path: path,
        mime_type: data.mime_type ?? null,
        tamanho: data.tamanho ?? buf.length,
        ativo: true,
        enviado_por: data.uploader,
      })
      .select()
      .single();
    if (insErr) throw new Error(`Falha ao registrar modelo: ${insErr.message}`);
    return { template: tpl };
  });

/** Exclui um modelo de contrato (admin/gestor). */
export const deleteContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isStaff } = await context.supabase.rpc("is_internal_staff");
    if (!isStaff) throw new Error("Sem permissão para excluir modelos.");

    const { data: tpl } = await supabaseAdmin
      .from("contract_templates")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (tpl?.storage_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([tpl.storage_path]);
    }
    const { error } = await supabaseAdmin.from("contract_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera um ou mais contratos preenchidos para um lead. */
export const generateContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      leadId: z.string().uuid(),
      geradoPor: z.string().trim().min(1).max(120),
      tipos: z.array(tipoSchema).min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: lead, error: leadErr } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .single();
    if (leadErr || !lead) throw new Error("Cliente não encontrado.");
    if (!lead.nome || !String(lead.nome).trim()) {
      throw new Error("Preencha o nome do cliente antes de gerar o contrato.");
    }

    const PizZipMod = await import("pizzip");
    const DocxMod = await import("docxtemplater");
    const PizZip = (PizZipMod as unknown as { default: typeof import("pizzip") }).default ?? PizZipMod;
    const Docxtemplater =
      (DocxMod as unknown as { default: typeof import("docxtemplater") }).default ?? DocxMod;

    const fallback = "Não informado";
    const val = (v: unknown): string => {
      const s = (v == null ? "" : String(v)).trim();
      return s ? s : fallback;
    };
    const vars: Record<string, string> = {
      nome_cliente: val(lead.nome),
      nacionalidade: val(lead.nacionalidade),
      estado_civil: val(lead.estado_civil),
      profissao: val(lead.profissao),
      endereco_cliente: val(lead.endereco_cliente),
      numero_endereco: val(lead.numero_endereco),
      bairro_cliente: val(lead.bairro_cliente),
      cep_cliente: val(lead.cep_cliente),
      rg_cliente: val(lead.rg_cliente),
      cpf_cliente: val(lead.cpf),
      telefone_cliente: val(lead.phone),
    };

    const safeNome = String(lead.nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60) || "cliente";
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    const results: Array<{ tipo: ContractType; nome_arquivo: string }> = [];
    const erros: string[] = [];

    for (const tipo of data.tipos) {
      const { data: tpl, error: tplErr } = await supabaseAdmin
        .from("contract_templates")
        .select("*")
        .eq("ativo", true)
        .eq("tipo", tipo)
        .order("criado", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tplErr) { erros.push(`${tipo}: ${tplErr.message}`); continue; }
      if (!tpl) { erros.push(`${CONTRACT_TYPE_LABEL[tipo]}: nenhum modelo cadastrado.`); continue; }

      const { data: file, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(tpl.storage_path);
      if (dlErr || !file) { erros.push(`${CONTRACT_TYPE_LABEL[tipo]}: falha ao baixar modelo.`); continue; }
      const arrayBuf = await file.arrayBuffer();

      let out: Buffer;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zip = new (PizZip as any)(Buffer.from(arrayBuf));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = new (Docxtemplater as any)(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: "{{", end: "}}" },
          nullGetter: () => fallback,
        });
        doc.render(vars);
        out = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
      } catch (e) {
        const err = e as { message?: string; properties?: { errors?: Array<{ properties?: { explanation?: string } }> } };
        const inner = err?.properties?.errors?.map((x) => x?.properties?.explanation).filter(Boolean).join("; ");
        erros.push(`${CONTRACT_TYPE_LABEL[tipo]}: ${inner || err?.message || "erro desconhecido"}`);
        continue;
      }

      const filename = `${tipo}_${safeNome}_${ts}.docx`;
      const outPath = `${OUTPUT_PREFIX}/${data.leadId}/${crypto.randomUUID()}.docx`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(outPath, out, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: false,
        });
      if (upErr) { erros.push(`${CONTRACT_TYPE_LABEL[tipo]}: ${upErr.message}`); continue; }

      const { error: recErr } = await supabaseAdmin
        .from("generated_contracts")
        .insert({
          tipo,
          lead_id: data.leadId,
          template_id: tpl.id,
          nome_arquivo: filename,
          storage_path: outPath,
          mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          tamanho: out.length,
          gerado_por: data.geradoPor,
        });
      if (recErr) { erros.push(`${CONTRACT_TYPE_LABEL[tipo]}: ${recErr.message}`); continue; }

      results.push({ tipo, nome_arquivo: filename });
    }

    if (results.length === 0) {
      throw new Error(erros.join(" | ") || "Nenhum contrato gerado.");
    }
    return { gerados: results, erros };
  });

/** Gera URL assinada (10 min) para download de modelo ou contrato gerado. */
export const getContractSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ storage_path: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(data.storage_path, 600);
    if (error || !signed) throw new Error(error?.message || "Falha ao gerar URL");
    return { url: signed.signedUrl };
  });
