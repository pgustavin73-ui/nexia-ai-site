
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  // Somente ambiente de testes
  if (process.env.VERCEL_ENV !== "preview") {
    return res.status(404).json({
      ok: false,
      mensagem: "Indisponível"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      mensagem: "Método não permitido"
    });
  }

  const {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    NEXIA_OWNER_ID,
    ASAAS_API_KEY
  } = process.env;

  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY ||
    !NEXIA_OWNER_ID ||
    !ASAAS_API_KEY
  ) {
    return res.status(503).json({
      ok: false,
      mensagem: "Configuração pendente"
    });
  }

  const token = (req.headers.authorization || "")
    .replace(/^Bearer /, "");

  if (!token) {
    return res.status(401).json({
      ok: false,
      mensagem: "Faça login primeiro"
    });
  }

  try {
    // Validar administrador no Supabase
    const validacao = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!validacao.ok) {
      return res.status(401).json({
        ok: false,
        mensagem: "Sessão inválida"
      });
    }

    const usuario = await validacao.json();

    if (usuario.id !== NEXIA_OWNER_ID) {
      return res.status(403).json({
        ok: false,
        mensagem: "Acesso não autorizado"
      });
    }

    // Valores definidos no servidor
    const planos = {
      essencial: {
        nome: "Essencial",
        valor: 29.90
      },
      profissional: {
        nome: "Profissional",
        valor: 59.90
      },
      enterprise: {
        nome: "Enterprise",
        valor: 99.90
      }
    };

    const corpo = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const plano = corpo?.plano;

    if (
      typeof plano !== "string" ||
      !Object.hasOwn(planos, plano)
    ) {
      return res.status(400).json({
        ok: false,
        mensagem: "Plano inválido"
      });
    }

    const escolhido = planos[plano];

    // Criar link recorrente no Sandbox
    const resposta = await fetch(
      "https://api-sandbox.asaas.com/v3/paymentLinks",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          access_token: ASAAS_API_KEY,
          "User-Agent": "NEXIA-AI/1.0"
        },
        body: JSON.stringify({
          name: "NEXIA AI - " + escolhido.nome,
          description: "Assinatura mensal - teste",
          value: escolhido.valor,
          billingType: "CREDIT_CARD",
          chargeType: "RECURRENT",
          subscriptionCycle: "MONTHLY",
          notificationEnabled: false
        })
      }
    );

    if (!resposta.ok) {
      return res.status(502).json({
        ok: false,
        mensagem: "Falha ao criar link de teste"
      });
    }

    const dados = await resposta.json();

    return res.status(200).json({
      ok: true,
      plano: escolhido.nome,
      valor: escolhido.valor,
      link: dados.url,
      mensagem: "Link de teste criado!"
    });

  } catch {
    return res.status(500).json({
      ok: false,
      mensagem: "Erro ao processar teste"
    });
  }
}
