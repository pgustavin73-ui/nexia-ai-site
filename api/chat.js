export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API não configurada" });
  }

  try {
    const pergunta = req.body?.mensagem;

    if (typeof pergunta !== "string" || !pergunta.trim()) {
      return res.status(400).json({ error: "Mensagem inválida" });
    }

    if (pergunta.length > 2000) {
      return res.status(400).json({ error: "Mensagem muito longa" });
    }

    const resposta = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: "Você é a NEXIA AI, um assistente profissional. Responda em português do Brasil, com clareza e educação.",
        input: pergunta,
        max_output_tokens: 500
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(502).json({
        error: "Não foi possível consultar a IA."
      });
    }

    const texto = (dados.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    return res.status(200).json({
      resposta: texto || "Não consegui gerar uma resposta."
    });
  } catch (erro) {
    return res.status(500).json({
      error: "Erro ao conectar com a IA."
    });
  }
}
