import {
  createHash,
  timingSafeEqual
} from "node:crypto";

function tokenValido(recebido, esperado) {
  if (
    typeof recebido !== "string" ||
    typeof esperado !== "string"
  ) {
    return false;
  }

  const a = createHash("sha256")
    .update(recebido).digest();

  const b = createHash("sha256")
    .update(esperado).digest();

  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  // Apenas ambiente Preview
  if (process.env.VERCEL_ENV !== "preview") {
    return res.status(404).json({
      ok: false
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      mensagem: "Método não permitido"
    });
  }

  const {
    ASAAS_WEBHOOK_TOKEN,
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
  } = process.env;

  // Não receber eventos sem configuração segura
  if (
    !ASAAS_WEBHOOK_TOKEN ||
    ASAAS_WEBHOOK_TOKEN.length < 32 ||
    !SUPABASE_URL ||
    !SUPABASE_SECRET_KEY
  ) {
    return res.status(503).json({
      ok: false,
      mensagem: "Configuração pendente"
    });
  }

  const token = req.headers["asaas-access-token"];

  if (!tokenValido(token, ASAAS_WEBHOOK_TOKEN)) {
    return res.status(401).json({
      ok: false,
      mensagem: "Não autorizado"
    });
  }

  try {
    const dados = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const eventoId = dados?.id;
    const tipo = dados?.event;

    if (
      typeof eventoId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,160}$/.test(eventoId) ||
      typeof tipo !== "string" ||
      !/^[A-Z_]{1,100}$/.test(tipo)
    ) {
      return res.status(400).json({
        ok: false,
        mensagem: "Evento inválido"
      });
    }

    const pagamentoId =
      typeof dados.payment?.id === "string"
        ? dados.payment.id
        : null;

    const assinaturaId =
      typeof dados.payment?.subscription === "string"
        ? dados.payment.subscription
        : null;

    // Salvar evento sem dados de cartão
    const gravacao = await fetch(
      `${SUPABASE_URL}/rest/v1/asaas_eventos_teste?on_conflict=event_id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SECRET_KEY,
          Prefer: "resolution=ignore-duplicates,return=minimal"
        },
        body: JSON.stringify({
          event_id: eventoId,
          event_type: tipo,
          payment_id: pagamentoId,
          subscription_id: assinaturaId
        })
      }
    );

    if (!gravacao.ok) {
      return res.status(503).json({
        ok: false,
        mensagem: "Não foi possível registrar evento"
      });
    }

    return res.status(200).json({
      ok: true,
      mensagem: "Evento recebido e registrado"
    });

  } catch {
    return res.status(400).json({
      ok: false,
      mensagem: "Não foi possível processar o evento"
    });
  }
}
