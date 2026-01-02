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
    
    corpo.innerHTML = '<tr><td colspan="7" style="text-align:center">Buscando dados no Nomus...</td></tr>';
    logDebug(`--- Iniciando Busca Automática (Início: Pág 1) ---`);

    let todasAsContas = [];
    let paginaAtual = 1; // Ajustado: Inicia na página 1
    let continuaBuscando = true;
    const idsVistos = new Set();

    try {
        while (continuaBuscando) {
            const urlLocal = `/api/consultar?endpoint=${tipo}&dataInicio=${dInicio}&dataFim=${dFim}&pagina=${paginaAtual}`;
            const response = await fetch(urlLocal);
            const resultado = await response.json();
            
            const listaDaPagina = resultado.content || [];
            
            if (listaDaPagina.length > 0) {
                logDebug(`Página ${paginaAtual}: +${listaDaPagina.length} itens encontrados.`);
                logDebug(`URL: ${resultado.urlGerada}`);

                listaDaPagina.forEach(item => {
                    const idUnico = item.id || item.codigo || JSON.stringify(item);
                    if (!idsVistos.has(idUnico)) {
                        todasAsContas.push(item);
                        idsVistos.add(idUnico);
                    }
                });

                // Se retornar 50, é provável que existam mais páginas
                if (listaDaPagina.length === 50) {
                    paginaAtual++;
                } else {
                    continuaBuscando = false; // Última página (veio menos de 50)
                }
            } else {
                continuaBuscando = false; // Página vazia
            }

            if (paginaAtual > 50) continuaBuscando = false; // Trava de segurança
        }

        dadosGlobais = todasAsContas;
        logDebug(`Busca Finalizada. Total de registros: ${dadosGlobais.length}`);

        preencherFiltrosDinâmicos(dadosGlobais);
        aplicarFiltrosSecundarios();

    } catch (error) {
        logDebug(`ERRO NO LOOP: ${error.message}`);
        corpo.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red">Erro ao processar páginas.</td></tr>';
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
