async function buscarDados() {
    const corpo = document.getElementById("tabela-corpo");
    const tipo = document.getElementById("filtro-tipo").value;
    const dInicio = document.getElementById("data-inicio").value;
    const dFim = document.getElementById("data-fim").value;
    
    corpo.innerHTML = '<tr><td colspan="6" style="text-align:center">Consultando Nomus...</td></tr>';
    
    logDebug(`--- Iniciando Processo ---`);

    let todasAsContas = [];
    let paginaAtual = 0;
    let continuaBuscando = true;

    try {
        while (continuaBuscando) {
            // URL que chama o seu servidor na Vercel
            const urlLocal = `/api/consultar?endpoint=${tipo}&dataInicio=${dInicio}&dataFim=${dFim}&pagina=${paginaAtual}`;
            
            const response = await fetch(urlLocal);
            const resultado = await response.json();
            
            // EXIBE NO LOG A URL QUE O SERVIDOR MONTOU PARA O NOMUS
            if (resultado.urlGerada) {
                logDebug(`URL NOMUS: ${resultado.urlGerada}`);
            }

            const listaDaPagina = resultado.content || [];
            logDebug(`Sucesso: ${listaDaPagina.length} itens encontrados na pág ${paginaAtual}.`);

            if (listaDaPagina.length > 0) {
                todasAsContas = todasAsContas.concat(listaDaPagina);
                paginaAtual++;
                if (listaDaPagina.length < 50) continuaBuscando = false;
            } else {
                continuaBuscando = false;
            }
            
            if (paginaAtual > 10) continuaBuscando = false; 
        }

        renderizarTabela(todasAsContas, tipo);

    } catch (error) {
        logDebug(`ERRO: ${error.message}`);
        corpo.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red">Erro na consulta. Verifique o Log.</td></tr>`;
    }
}
