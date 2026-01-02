let dadosGlobais = [];

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

async function buscarDados() {
    const corpo = document.getElementById("tabela-corpo");
    const tipo = document.getElementById("filtro-tipo").value;
    const dInicio = document.getElementById("data-inicio").value;
    const dFim = document.getElementById("data-fim").value;
    
    corpo.innerHTML = '<tr><td colspan="7" style="text-align:center">Consultando Nomus...</td></tr>';
    
    // Limpa logs antigos e inicia novo log
    logDebug(`--- Nova Consulta Iniciada ---`);

    try {
        const urlLocal = `/api/consultar?endpoint=${tipo};dInicio>=${dInicio};dFim<=${dFim}`;
        
        const response = await fetch(urlLocal);
        const resultado = await response.json();
        
        // EXIBE A URL GERADA NO LOG PRETO
        if (resultado.urlGerada) {
            logDebug(`URL GERADA: ${resultado.urlGerada}`);
        } else {
            logDebug(`AVISO: A URL gerada não foi retornada pelo servidor.`);
        }

        const listaBruta = resultado.content || [];
        const idsVistos = new Set();
        
        dadosGlobais = listaBruta.filter(item => {
            const idUnico = item.id || item.codigo || JSON.stringify(item); 
            if (idsVistos.has(idUnico)) return false;
            idsVistos.add(idUnico);
            return true;
        });

        logDebug(`Sucesso: ${dadosGlobais.length} registros únicos carregados.`);

        preencherFiltrosDinâmicos(dadosGlobais);
        aplicarFiltrosSecundarios();

    } catch (error) {
        logDebug(`ERRO CRÍTICO: ${error.message}`);
        corpo.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red">Erro na consulta.</td></tr>';
    }
}

function preencherFiltrosDinâmicos(dados) {
    const selectClass = document.getElementById("filtro-classificacao");
    const selectPessoa = document.getElementById("filtro-pessoa");
    if(!selectClass || !selectPessoa) return;

    selectClass.innerHTML = '<option value="">Todas</option>';
    selectPessoa.innerHTML = '<option value="">Todas</option>';

    const classificacoes = new Set();
    const pessoas = new Set();

    dados.forEach(item => {
        const nomeClass = item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao;
        if (nomeClass) classificacoes.add(nomeClass);
        if (item.nomePessoa) pessoas.add(item.nomePessoa);
    });

    Array.from(classificacoes).sort().forEach(c => {
        selectClass.innerHTML += `<option value="${c}">${c}</option>`;
    });
    Array.from(pessoas).sort().forEach(p => {
        selectPessoa.innerHTML += `<option value="${p}">${p}</option>`;
    });

    selectClass.onchange = aplicarFiltrosSecundarios;
    selectPessoa.onchange = aplicarFiltrosSecundarios;
}

function aplicarFiltrosSecundarios() {
    const valClass = document.getElementById("filtro-classificacao").value;
    const valPessoa = document.getElementById("filtro-pessoa").value;

    const filtrados = dadosGlobais.filter(item => {
        const itemClass = item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao;
        const matchClass = valClass === "" || itemClass === valClass;
        const matchPessoa = valPessoa === "" || item.nomePessoa === valPessoa;
        return matchClass && matchPessoa;
    });

    renderizarTabela(filtrados, document.getElementById("filtro-tipo").value);
}

function renderizarTabela(lista, tipo) {
    const corpo = document.getElementById("tabela-corpo");
    corpo.innerHTML = "";
    
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

    lista.forEach((item, index) => {
        const vP = Math.abs(stringParaNumero(item.valorReceber || item.valorPagar));
        const vR = Math.abs(stringParaNumero(item.valorRecebido || item.valorPago));
        const vSaldo = vP - vR;
        tPrev += vP; tReal += vR;

        const pD = (item.dataVencimento || "01/01/1900").split('/');
        const dVenc = new Date(pD[2], pD[1]-1, pD[0]);
        const vencido = dVenc < hoje && vSaldo > 0.10;
        if (vencido) tAtrasado += vSaldo;

        const tr = document.createElement("tr");
        if (vencido) tr.classList.add("linha-vencida");

        tr.innerHTML = `
            <td style="color: #666; font-size: 0.85em;">${index + 1}</td>
            <td>${item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao || '-'}</td>
            <td>${item.nomePessoa || '-'}</td>
            <td style="font-weight:bold">${item.dataVencimento} ${vencido ? '<span class="atraso-badge">VENCIDO</span>' : ''}</td>
            <td>${item.descricaoLancamento || '-'}</td>
            <td>${formatarMoeda(vP)}</td>
            <td>${formatarMoeda(vR)}</td>
        `;
        corpo.appendChild(tr);
    });

    document.getElementById("resumo-previsto").innerText = formatarMoeda(tPrev);
    document.getElementById("resumo-realizado").innerText = formatarMoeda(tReal);
    document.getElementById("resumo-saldo").innerText = formatarMoeda(tPrev - tReal);
    document.getElementById("resumo-atrasado").innerText = formatarMoeda(tAtrasado);
}

function stringParaNumero(str) {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return 0;
    let limpeza = str.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(limpeza) || 0;
}

function formatarMoeda(valor) {
    return Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
