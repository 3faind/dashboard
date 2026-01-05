// No início do script.js
document.addEventListener("DOMContentLoaded", function() {
    verificarAcesso();
});

async function verificarAcesso() {
    let senhaSalva = localStorage.getItem("app_acesso");

    if (!senhaSalva) {
        solicitarSenha();
    } else {
        validarSenhaNoServidor(senhaSalva);
    }
}

async function solicitarSenha() {
    const senha = prompt("Por favor, insira a senha de acesso:");
    if (senha) {
        validarSenhaNoServidor(senha);
    } else {
        document.body.innerHTML = "<h2 style='color:white; text-align:center; margin-top:50px;'>Acesso Negado. Recarregue para tentar novamente.</h2>";
    }
}

async function validarSenhaNoServidor(senha) {
    try {
        const response = await fetch(`/api/consultar?acao=login&senha=${senha}`);
        const data = await response.json();

        if (data.autorizado) {
            localStorage.setItem("app_acesso", senha);
            logDebug("Acesso autorizado com sucesso.");
        } else {
            localStorage.removeItem("app_acesso");
            alert("Senha incorreta!");
            solicitarSenha();
        }
    } catch (e) {
        console.error("Erro na validação", e);
    }
}

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
    const senhaSalva = localStorage.getItem("app_acesso"); // <--- Pega a senha salva
    
    corpo.innerHTML = '<tr><td colspan="7" style="text-align:center">Buscando dados no Nomus...</td></tr>';
    logDebug(`--- Iniciando Busca Automática (Início: Pág 1) ---`);

    let todasAsContas = [];
    let paginaAtual = 1; // Ajustado: Inicia na página 1
    let continuaBuscando = true;
    const idsVistos = new Set();

    try {
        while (continuaBuscando) {
            // INCLUÍMOS &senha=${senhaSalva} na URL
            const urlLocal = `/api/consultar?endpoint=${tipo}&dataInicio=${dInicio}&dataFim=${dFim}&pagina=${paginaAtual}&senha=${senhaSalva}`;
            
            const response = await fetch(urlLocal);
            
            if (response.status === 401) {
                alert("Sessão expirada ou senha inválida.");
                localStorage.removeItem("app_acesso");
                location.reload();
                return;
            }

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
    const selectEmpresa = document.getElementById("filtro-empresa");

    // Limpa mantendo apenas a opção "Todas"
    if (selectClass) selectClass.innerHTML = '<option value="">Todas</option>';
    if (selectPessoa) selectPessoa.innerHTML = '<option value="">Todas</option>';
    if (selectEmpresa) selectEmpresa.innerHTML = '<option value="">Todas</option>';

    const classificacoes = new Set();
    const pessoas = new Set();
    const empresas = new Set();

    // Varre os dados uma única vez para coletar todos os valores únicos
    dados.forEach(item => {
        const nomeClass = item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao;
        if (nomeClass) classificacoes.add(nomeClass);
        if (item.nomePessoa) pessoas.add(item.nomePessoa);
        if (item.nomeEmpresa) empresas.add(item.nomeEmpresa);
    });

    // Preenche Classificação
    if (selectClass) {
        Array.from(classificacoes).sort().forEach(c => {
            selectClass.innerHTML += `<option value="${c}">${c}</option>`;
        });
        selectClass.onchange = aplicarFiltrosSecundarios;
    }

    // Preenche Pessoa
    if (selectPessoa) {
        Array.from(pessoas).sort().forEach(p => {
            selectPessoa.innerHTML += `<option value="${p}">${p}</option>`;
        });
        selectPessoa.onchange = aplicarFiltrosSecundarios;
    }

    // Preenche Empresa
    if (selectEmpresa) {
        Array.from(empresas).sort().forEach(e => {
            selectEmpresa.innerHTML += `<option value="${e}">${e}</option>`;
        });
        selectEmpresa.onchange = aplicarFiltrosSecundarios;
    }
}

function aplicarFiltrosSecundarios() {
    const valClass = document.getElementById("filtro-classificacao").value;
    const valPessoa = document.getElementById("filtro-pessoa").value;
    const valEmpresa = document.getElementById("filtro-empresa").value;

    const filtrados = dadosGlobais.filter(item => {
        const itemClass = item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao;
        
        const matchClass = valClass === "" || itemClass === valClass;
        const matchPessoa = valPessoa === "" || item.nomePessoa === valPessoa;
        const matchEmpresa = valEmpresa === "" || item.nomeEmpresa === valEmpresa;

        // O item só passa se atender aos 3 critérios simultaneamente
        return matchClass && matchPessoa && matchEmpresa;
    });

    renderizarTabela(filtrados, document.getElementById("filtro-tipo").value);
}

function renderizarTabela(lista, tipo) {
    const corpo = document.getElementById("tabela-corpo");
    corpo.innerHTML = "";
    
    // 1. ORDENAÇÃO POR VENCIMENTO (Crucial para listas multi-páginas)
    lista.sort((a, b) => {
        const converterData = (dataStr) => { 
            if (!dataStr) return new Date(1900, 0, 1);
            const partes = dataStr.split('/'); 
            // Formato esperado: DD/MM/AAAA -> Ano, Mês-1, Dia
            return new Date(partes[2], partes[1] - 1, partes[0]); 
        };
        return converterData(a.dataVencimento) - converterData(b.dataVencimento);
    });

    let tSaldoRestante = 0, tReal = 0, tAtrasado = 0;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    // 2. RENDERIZAÇÃO APÓS ORDENAR
    lista.forEach((item, index) => {
        const vBruto = Math.abs(stringParaNumero(item.valorReceber || item.valorPagar));
        const vRealizado = Math.abs(stringParaNumero(item.valorRecebido || item.valorPago));
        
        // Cálculo do Saldo (Abatimento)
        const vSaldoRestante = vBruto - vRealizado;

        tSaldoRestante += vSaldoRestante; 
        tReal += vRealizado;

        const partesData = (item.dataVencimento || "01/01/1900").split('/');
        const dVenc = new Date(partesData[2], partesData[1] - 1, partesData[0]);
        
        // Título está vencido se a data é menor que hoje E ainda tem saldo a pagar
        const vencido = dVenc < hoje && vSaldoRestante > 0.10;

        if (vencido) tAtrasado += vSaldoRestante;

        const tr = document.createElement("tr");


        tr.onclick = () => abrirDetalhes(item.id); // Captura o ID do lançamento

        if (vencido) tr.classList.add("linha-vencida");



        const descClass = item.nomeClassificacaoFinanceira || item.nomeClassificacao || item.classificacao || '-';

        tr.innerHTML = `
            <td style="color: #666; font-size: 0.85em;">${index + 1}</td>
            <td>${descClass}</td>
            <td>${item.nomePessoa || '-'}</td>
            <td style="font-weight:bold">
                ${item.dataVencimento} 
                ${vencido ? '<span class="atraso-badge">VENCIDO</span>' : ''}
            </td>
            <td>${item.descricaoLancamento || '-'}</td>
            <td style="font-weight:bold; color: ${vSaldoRestante > 0 ? '#d32f2f' : '#999'}">
                ${formatarMoeda(vSaldoRestante)}
            </td>
            <td style="color: #2e7d32">
                ${formatarMoeda(vRealizado)}
            </td>
        `;
        corpo.appendChild(tr);
    });

    // 3. ATUALIZAÇÃO DOS CARDS DO DASHBOARD
    document.getElementById("resumo-previsto").innerText = formatarMoeda(tSaldoRestante);
    document.getElementById("resumo-realizado").innerText = formatarMoeda(tReal);
    document.getElementById("resumo-saldo").innerText = formatarMoeda(tSaldoRestante);
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

function abrirDetalhes(id) {
    // Busca o objeto completo nos dados que já temos
    const item = dadosGlobais.find(d => d.id === id);
    if (!item) return;

    const container = document.getElementById("detalhes-conteudo");
    container.innerHTML = ""; // Limpa anterior

    // Lista de campos que queremos exibir de forma amigável
    // Você pode adicionar ou remover campos conforme a resposta da sua API
    const camposOmitir = ['id', 'valorPagar', 'valorReceber', 'valorPago', 'valorRecebido'];
    
    // Criar uma visualização organizada
    for (let [chave, valor] of Object.entries(item)) {
        if (valor && typeof valor !== 'object') {
            const div = document.createElement("div");
            div.className = "detalhe-item";
            div.innerHTML = `<strong>${chave}:</strong> ${valor}`;
            container.appendChild(div);
        }
    }

    document.getElementById("modal-detalhes").style.display = "block";
}

function fecharModal() {
    document.getElementById("modal-detalhes").style.display = "none";
}

// Fechar se clicar fora do modal
window.onclick = function(event) {
    const modal = document.getElementById("modal-detalhes");
    if (event.target == modal) fecharModal();
}
