export default async function handler(req, res) {
  const BASE_URL = "https://3fa.nomus.com.br/3fa/rest";
  const AUTH_KEY = process.env.NOMUS_AUTH_KEY;
  const { endpoint, dataInicio, dataFim } = req.query;

  const formatarData = (dataISO) => {
    if (!dataISO) return null;
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  try {
    const dIni = formatarData(dataInicio);
    const dFim = formatarData(dataFim);

    // Montamos a query exatamente como o Nomus exige
    // Exemplo: ?query=dataVencimento>=01/01/2026;dataVencimento<=31/01/2026
    let queryParams = "";
    if (dIni && dFim) {
      queryParams = `?query=dataVencimento>=${dIni};dataVencimento<=${dFim}`;
    }

    const urlFinal = `${BASE_URL}/${endpoint}${queryParams}`;

    const response = await fetch(urlFinal, {
      method: "GET",
      headers: {
        "Authorization": AUTH_KEY,
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    
    // Retornamos os dados e a URL final para o seu LOG PRETO ler
    return res.status(200).json({
      content: Array.isArray(data) ? data : (data.content || []),
      urlGerada: urlFinal 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
