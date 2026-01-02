export default async function handler(req, res) {
  const BASE_URL = "https://3fa.nomus.com.br/3fa/rest";
  const AUTH_KEY = process.env.NOMUS_AUTH_KEY;
  const { endpoint, dataInicio, dataFim } = req.query;

  if (!endpoint) return res.status(400).json({ error: "Endpoint não informado" });

  const formatarData = (dataISO) => {
    if (!dataISO) return null;
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  try {
    const dIni = formatarData(dataInicio);
    const dFim = formatarData(dataFim);

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
    
    return res.status(200).json({
      content: Array.isArray(data) ? data : (data.content || []),
      urlGerada: urlFinal
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
