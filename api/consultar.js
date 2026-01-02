export default async function handler(req, res) {
  const APP_PASSWORD = process.env.APP_PASSWORD;

  // Endpoint de Validação de Senha
  if (req.query.acao === 'login') {
    const { senha } = req.query;
    if (senha === APP_PASSWORD) {
      return res.status(200).json({ autorizado: true });
    } else {
      return res.status(401).json({ autorizado: false });
    }
  }
  const BASE_URL = "https://3fa.nomus.com.br/3fa/rest";
  const AUTH_KEY = process.env.NOMUS_AUTH_KEY;
  const { endpoint, dataInicio, dataFim, pagina } = req.query; 

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

    // Usa a página enviada pelo script (ou 1 se não vier nada)
    const p = pagina || 1;
    const urlFinal = `${BASE_URL}/${endpoint}${queryParams}&pagina=${p}`;

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

