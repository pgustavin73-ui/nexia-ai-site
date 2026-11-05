
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      mensagem: "Método não permitido"
    });
  }

  const chave = process.env.ASAAS_API_KEY;

  if (!chave) {
    return res.status(500).json({
      ok: false,
      mensagem: "Chave não configurada neste ambiente"
    });
  }

  try {
    const resposta = await fetch(
      "https://api-sandbox.asaas.com/v3/subscriptions?limit=1",
      {
        headers: {
          "accept": "application/json",
          "access_token": chave,
          "User-Agent": "NEXIA-AI/1.0"
        }
      }
    );

    if (!resposta.ok) {
      return res.status(502).json({
        ok: false,
        mensagem: "Não foi possível conectar ao Asaas",
        statusAsaas: resposta.status
      });
    }

    return res.status(200).json({
      ok: true,
      mensagem: "NEXIA AI conectada ao Asaas Sandbox!"
    });

  } catch {
    return res.status(502).json({
      ok: false,
      mensagem: "Erro de conexão com o Asaas"
    });
  }
}
