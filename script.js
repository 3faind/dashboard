// Funções de utilidade
function logDebug(mensagem) {
    const logElem = document.getElementById("debug-log");
    if (logElem) {
        logElem.style.display = "block";
        const div = document.createElement("div");
        div.innerText = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
        logElem.appendChild(div);
        logElem.scrollTop = logElem.scrollHeight;
    }
}

function formatarMoeda(valor) {
    return Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function stringParaNumero(str) {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return 0;
    let limpeza = str.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(limpeza) || 0;
}

// Função principal de busca
async function buscarDados() {
    const corpo = document.getElementById("tabela-corpo");
    const tipo = document.getElementById("filtro-tipo").value;
    const dInicio = document.getElementById("data-inicio").value;
    const dFim = document.getElementById("data-fim").value;
    
    corpo.innerHTML = '<tr><td colspan="6" style="text-align:center">Consultando Nomus...</td></tr>';
    logDebug(`--- Iniciando Consulta: ${tipo} ---`);

    try {
        // Chamada para o servidor local (Vercel)
        const urlLocal = `/api/consultar?endpoint=${tipo}&dataInicio=${dInicio}&dataFim=${dFim}`;
        
        const response = await fetch(urlLocal);
        const resultado = await response.json();
        
        // Exibe a URL que funcionou no seu teste
        if (resultado.urlGerada) {
            logDebug(`URL NOMUS: ${resultado.urlGerada}`);
        }

        const lista = resultado.content || [];
        logDebug(`Sucesso: ${lista.length} registros encontrados.`);

        if (lista.length === 0) {
            corpo.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum dado encontrado para o período.</td></tr>';
        } else {
            renderizarTabela(lista, tipo);
        }

    } catch (error) {
        logDebug(`ERRO: ${error.message}`);
        corpo.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red">Erro na consulta. Verifique o Log acima.</td></tr>`;
    }
}

function renderizarTabela(lista, tipo) {
    const corpo = document.getElementById("tabela-corpo");
    corpo.innerHTML = "";
    
    // Ordenação por data de vencimento
    lista.sort((a, b) => {
        const c = (s) => { 
            const p = (s || "01/01/1900").split('/'); 
            return new Date(p[2], p[1]-1, p[0]); 
        };
        return c(a.dataVencimento) - c(b.dataVencimento);
    });

    let tPrev = 0, tReal = 0, tAtrasado = 0;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    lista.forEach(item => {
        // Tratamento de valores negativos (Contas a Pagar) e nomes de campos
        const vP = Math.abs(stringParaNumero(item.valorReceber || item.valorPagar));
        const vR = Math.abs(stringParaNumero(item.valorRecebido || item.valorPago));
        const vSaldo = vP - vR;

        tPrev += vP; 
        tReal += vR;

        const pD = (item.dataVencimento || "01/01/1900").split('/');
        const dVenc = new Date(pD[2], pD[1]-1, pD[0]);
        
        // Regra de Vencidos: Data anterior a hoje e saldo em aberto
        const vencido = dVenc < hoje && vSaldo > 0.10;

        if (vencido) tAtrasado += vSaldo;

        const tr = document.createElement("tr");
        if (vencido) tr.classList.add("linha-vencida");

        // Prioriza o nome descritivo da classificação financeira
        const descClass = item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao || '-';

        tr.innerHTML = `
            <td>${descClass}</td>
            <td>${item.nomePessoa || '-'}</td>
            <td style="font-weight:bold">
                ${item.dataVencimento} 
                ${vencido ? '<span class="atraso-badge">VENCIDO</span>' : ''}
            </td>
            <td>${item.descricaoLancamento || '-'}</td>
            <td>${formatarMoeda(vP)}</td>
            <td>${formatarMoeda(vR)}</td>
        `;
        corpo.appendChild(tr);
    });

    // Atualização dos cards de resumo
    document.getElementById("resumo-previsto").innerText = formatarMoeda(tPrev);
    document.getElementById("resumo-realizado").innerText = formatarMoeda(tReal);
    
    const resSaldo = document.getElementById("resumo-saldo");
    resSaldo.innerText = formatarMoeda(tPrev - tReal);
    resSaldo.style.color = tipo === "contasReceber" ? "#2e7d32" : "#cf1322";

    document.getElementById("resumo-atrasado").innerText = formatarMoeda(tAtrasado);
}
