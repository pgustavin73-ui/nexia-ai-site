
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (process.env.VERCEL_ENV !== "preview") {
    return res.status(404).json({
      ok: false, mensagem: "Indisponível"
    });
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false, mensagem: "Método não permitido"
    });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7) : "";

  if (!token) {
    return res.status(401).json({
      ok: false, mensagem: "Login necessário"
    });
  }

  const {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    NEXIA_OWNER_ID,
    ASAAS_API_KEY
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY ||
      !NEXIA_OWNER_ID || !ASAAS_API_KEY) {
    return res.status(503).json({
      ok: false, mensagem: "Configuração pendente"
    });
  }

  try {
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
        ok: false, mensagem: "Sessão inválida"
      });
    }

    const usuario = await validacao.json();

    if (!usuario.id || usuario.id !== NEXIA_OWNER_ID) {
      return res.status(403).json({
        ok: false, mensagem: "Acesso não autorizado"
      });
    }

    const asaas = await fetch(
      "https://api-sandbox.asaas.com/v3/subscriptions?limit=1",
      {
        headers: {
          accept: "application/json",
          access_token: ASAAS_API_KEY,
          "User-Agent": "NEXIA-AI/1.0"
        }
      }
    );

    return res.status(asaas.ok ? 200 : 502).json({
      ok: asaas.ok,
      mensagem: asaas.ok
        ? "NEXIA AI conectada com autenticação!"
        : "Falha na conexão com Asaas"
    });
  } catch {
    return res.status(502).json({
      ok: false, mensagem: "Erro de conexão"
    });
  }
}
