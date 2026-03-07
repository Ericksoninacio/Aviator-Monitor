console.log("✅ [Aviator Monitor PRO] Popup v2.1 carregado");

// ===== PADRÕES PADRÃO (fallback se storage vazio) =====
const PADROES_DEFAULT = [
    { nome: "TENDENCIA_ALTA",  sequencia: ["MEDIO","MEDIO","MEDIO","BAIXO"],  confianca: 85.3 },
    { nome: "REVERSAO_FORTE",  sequencia: ["BAIXO","BAIXO","BAIXO","MEDIO"],  confianca: 78.1 },
    { nome: "EXPLOSAO_TOPO",   sequencia: ["ALTO","MEDIO","BAIXO","BAIXO"],   confianca: 72.4 },
    { nome: "RECUPERACAO",     sequencia: ["MEDIO","BAIXO","BAIXO","BAIXO"],  confianca: 68.9 },
];

// ===== DOM REFS =====
const modeSelect       = document.getElementById("mode");
const porcentagemInp   = document.getElementById("porcentagem");
const odd1Inp          = document.getElementById("odd1");
const odd2Inp          = document.getElementById("odd2");
const stopLossInp      = document.getElementById("stopLoss");
const stopGainInp      = document.getElementById("stopGain");
const protecaoSub      = document.getElementById("protecaoSub");
const soundToggle      = document.getElementById("sound");
const autoEntrarToggle   = document.getElementById("autoEntrar");
const autoRefreshToggle  = document.getElementById("autoRefresh");
const refreshIntervalInp = document.getElementById("refreshInterval");
const refreshIntervalRow = document.getElementById("refreshIntervalRow");
const refreshCountdown   = document.getElementById("refreshCountdown");
const saveStatus       = document.getElementById("saveStatus");
const powerBtn         = document.getElementById("powerBtn");
const offBanner        = document.getElementById("offBanner");
const shell            = document.querySelector(".shell");
const testBtn          = document.getElementById("testBtn");
const resultsRow       = document.getElementById("resultsRow");
const patternCard      = document.getElementById("patternCard");
const patternNone      = document.getElementById("patternNone");
const patternMatch     = document.getElementById("patternMatch");
const patternName      = document.getElementById("patternName");
const confBar          = document.getElementById("confBar");
const confVal          = document.getElementById("confVal");
const saldoVal         = document.getElementById("saldoVal");
const bancaPct         = document.getElementById("bancaPct");
const entrada1Val      = document.getElementById("entrada1Val");
const entrada1Sub      = document.getElementById("entrada1Sub");
const entrada2Val      = document.getElementById("entrada2Val");
const statusDot        = document.getElementById("statusDot");
const totalSinaisEl    = document.getElementById("totalSinais");
const ultimoSinalEl    = document.getElementById("ultimoSinal");

// Padrões
const padroesList       = document.getElementById("padroesList");
const btnExportar       = document.getElementById("btnExportar");
const btnImportar       = document.getElementById("btnImportar");
const btnResetarPadroes = document.getElementById("btnResetarPadroes");
const fileImport        = document.getElementById("fileImport");
const importModalOverlay= document.getElementById("importModalOverlay");
const importTextarea    = document.getElementById("importTextarea");
const importStatus      = document.getElementById("importStatus");
const btnImportarArquivo= document.getElementById("btnImportarArquivo");
const btnCancelarImport = document.getElementById("btnCancelarImport");
const btnConfirmarImport= document.getElementById("btnConfirmarImport");
const padraoForm       = document.getElementById("padraoForm");
const formTitle        = document.getElementById("formTitle");
const fpNome           = document.getElementById("fpNome");
const fpConfianca      = document.getElementById("fpConfianca");
const btnNovoPadrao    = document.getElementById("btnNovoPadrao");
const btnSalvarPadrao  = document.getElementById("btnSalvarPadrao");
const btnCancelarPadrao= document.getElementById("btnCancelarPadrao");

// ===== TABS =====
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
});

// ===== CARREGAR CONFIGURAÇÕES =====
chrome.storage.local.get(
    ["mode", "sound", "porcentagemBanca", "oddEntrada1", "oddProtecao", "autoEntrar", "stopLoss", "stopGain", "autoRefresh", "refreshInterval"],
    (data) => {
        if (data.mode)             modeSelect.value   = data.mode;
        if (data.porcentagemBanca) porcentagemInp.value = Math.round(data.porcentagemBanca * 100);
        if (data.oddEntrada1)      odd1Inp.value      = data.oddEntrada1;
        if (data.oddProtecao)      odd2Inp.value      = data.oddProtecao;
        if (data.stopLoss !== undefined) stopLossInp.value = data.stopLoss;
        if (data.stopGain !== undefined) stopGainInp.value = data.stopGain;
        soundToggle.checked    = data.sound !== false;
        if (typeof data.autoEntrar === "boolean") autoEntrarToggle.checked = data.autoEntrar;
        if (typeof data.autoRefresh === "boolean") {
            autoRefreshToggle.checked = data.autoRefresh;
            refreshIntervalRow.style.display = data.autoRefresh ? "" : "none";
        }
        if (data.refreshInterval) refreshIntervalInp.value = data.refreshInterval;
        atualizarContagem();
    }
);

// ===== SALVAR CONFIGURAÇÕES =====
function save() {
    const porcentagem = parseFloat(porcentagemInp.value) / 100;
    const odd1        = parseFloat(odd1Inp.value);
    const odd2        = parseFloat(odd2Inp.value);
    chrome.storage.local.set({
        mode:             modeSelect.value,
        sound:            soundToggle.checked,
        autoEntrar:       autoEntrarToggle.checked,
        autoRefresh:      autoRefreshToggle.checked,
        refreshInterval:  Math.max(1, Math.min(120, parseInt(refreshIntervalInp.value) || 30)),
        porcentagemBanca: isNaN(porcentagem) ? 0.05  : Math.max(0.01,  Math.min(0.5,  porcentagem)),
        oddEntrada1:      isNaN(odd1)        ? 1.30  : Math.max(1.01,  Math.min(10,   odd1)),
        oddProtecao:      isNaN(odd2)        ? 10.00 : Math.max(1.01,  Math.min(100,  odd2)),
        stopLoss:         Math.max(0, Math.min(100,  parseFloat(stopLossInp.value) || 0)),
        stopGain:         Math.max(0, Math.min(1000, parseFloat(stopGainInp.value) || 0)),
    });
    showStatus("✔ Salvo", "#22c55e");
}

[modeSelect, porcentagemInp, odd1Inp, odd2Inp, stopLossInp, stopGainInp, soundToggle, autoEntrarToggle, autoRefreshToggle, refreshIntervalInp].forEach(el => {
    el.addEventListener("change", save);
});

// Mostra/oculta campo de intervalo conforme checkbox
autoRefreshToggle.addEventListener("change", () => {
    refreshIntervalRow.style.display = autoRefreshToggle.checked ? "" : "none";
});

// Placeholder para contagem regressiva (utilizado pelo background)
function atualizarContagem() {
    if (!autoRefreshToggle.checked) {
        refreshCountdown.textContent = "";
        return;
    }
    chrome.storage.local.get(["refreshNextAt"], (data) => {
        if (!data.refreshNextAt) { refreshCountdown.textContent = ""; return; }
        const diff = Math.max(0, Math.round((data.refreshNextAt - Date.now()) / 1000));
        const m = Math.floor(diff / 60).toString().padStart(2,"0");
        const s = (diff % 60).toString().padStart(2,"0");
        refreshCountdown.textContent = `${m}:${s}`;
    });
}
setInterval(atualizarContagem, 1000);

function showStatus(msg, color) {
    saveStatus.textContent = msg;
    saveStatus.style.color = color;
    setTimeout(() => saveStatus.textContent = "", 1800);
}

// ===== POWER (liga/desliga geral) =====
let monitorAtivo = true;

function aplicarEstadoPower(ativo) {
    monitorAtivo = ativo;
    if (ativo) {
        powerBtn.classList.add("active");
        powerBtn.classList.remove("off");
        offBanner.classList.add("hidden");
        shell.classList.remove("monitor-off");
        powerBtn.title = "Monitor ligado — clique para desligar";
    } else {
        powerBtn.classList.remove("active");
        powerBtn.classList.add("off");
        offBanner.classList.remove("hidden");
        shell.classList.add("monitor-off");
        powerBtn.title = "Monitor desligado — clique para ligar";
    }
    chrome.storage.local.set({ monitorAtivo: ativo });
    chrome.runtime.sendMessage({ type: "SET_MONITOR", ativo });
}

powerBtn.addEventListener("click", () => {
    aplicarEstadoPower(!monitorAtivo);
    showStatus(monitorAtivo ? "▶ Monitor ligado" : "⏹ Monitor pausado", monitorAtivo ? "#22c55e" : "#ef4444");
});

// Carrega estado inicial do power
chrome.storage.local.get(["monitorAtivo"], (data) => {
    const ativo = data.monitorAtivo !== false; // padrão: ligado
    aplicarEstadoPower(ativo);
});

// ===== CLASSIFICAÇÃO =====
function classificar(valor) {
    const v = parseFloat(valor.toFixed(2));
    if (v < 2.0)    return "BAIXO";
    if (v < 10.0)   return "MEDIO";
    return "ALTO";
}

// ===== RENDERIZAR RESULTADOS =====
function renderResults(classificados) {
    resultsRow.innerHTML = "";
    if (!classificados || classificados.length === 0) {
        resultsRow.innerHTML = `<span class="no-data">— aguardando —</span>`;
        return;
    }
    classificados.slice(0, 6).forEach(({ valor, classe }) => {
        const chip = document.createElement("div");
        chip.className = `result-chip ${classe}`;
        chip.innerHTML = `
            <span class="chip-val">${valor.toFixed(2)}x</span>
            <span class="chip-cls">${classe}</span>`;
        resultsRow.appendChild(chip);
    });
    statusDot.classList.add("active");
}

// ===== RENDERIZAR PADRÃO =====
function renderPattern(padrao) {
    if (padrao) {
        patternNone.style.display = "none";
        patternMatch.classList.remove("hidden");
        patternCard.classList.add("has-pattern");
        patternName.textContent   = padrao.nome.replace(/_/g, " ");
        confBar.style.width       = `${padrao.confianca}%`;
        confVal.textContent       = `${padrao.confianca}%`;
        statusDot.classList.add("signal");
        setTimeout(() => statusDot.classList.remove("signal"), 3000);
    } else {
        patternNone.style.display = "";
        patternMatch.classList.add("hidden");
        patternCard.classList.remove("has-pattern");
    }
}

// ===== RENDERIZAR BANCA =====
// ===== SESSÃO DE LUCRO/PERDA =====
const sessaoTimerEl  = document.getElementById("sessaoTimer");
const btnNovaSessao  = document.getElementById("btnNovaSessao");

// Cache em memória — única fonte da verdade para a sessão atual
// Evita race condition: renderBanca é chamado a cada 1.5s e o storage.get
// é assíncrono, então sem cache a sessão seria recriada repetidamente.
let _sessao     = null;   // { saldoInicial, inicio }
let _lastSaldo  = null;

// Ao abrir o popup, restaura sessão — reseta se for de outro dia
chrome.storage.local.get(["sessao", "lastSaldo"], (data) => {
    if (data.sessao) {
        const diaSession = new Date(data.sessao.inicio).toDateString();
        const diaHoje    = new Date().toDateString();
        if (diaSession !== diaHoje) {
            // Sessão é de outro dia — descarta e aguarda primeiro saldo
            chrome.storage.local.remove(["sessao", "lastSaldo"]);
            console.log("[Aviator Monitor] 🗓 Sessão anterior de outro dia — resetada.");
        } else {
            _sessao    = data.sessao;
            _lastSaldo = data.lastSaldo ?? null;
        }
    }
});

function iniciarNovaSessao(saldo) {
    _sessao = { saldoInicial: saldo, inicio: Date.now() };
    chrome.storage.local.set({ sessao: _sessao });
    atualizarSessaoUI(saldo);
}

function atualizarSessaoUI(saldoAtual) {
    if (!_sessao) return;

    // Percentual em relação ao saldo inicial
    const pct = ((saldoAtual - _sessao.saldoInicial) / _sessao.saldoInicial) * 100;
    const abs = Math.abs(pct).toFixed(2);
    if (pct > 0.005) {
        bancaPct.textContent = `▲ +${abs}%`;
        bancaPct.className   = "banca-pct gain";
    } else if (pct < -0.005) {
        bancaPct.textContent = `▼ -${abs}%`;
        bancaPct.className   = "banca-pct loss";
    } else {
        bancaPct.textContent = "0.00%";
        bancaPct.className   = "banca-pct";
    }

    // Timer — tempo decorrido desde o início (conta para cima: 00:00, 00:01...)
    const elapsed = Date.now() - _sessao.inicio;
    const m = Math.floor(elapsed / 60000).toString().padStart(2, "0");
    const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, "0");
    sessaoTimerEl.textContent = `${m}:${s}`;
}

// Tick do timer — usa apenas cache em memória, sem storage.get
setInterval(() => {
    if (_sessao && _lastSaldo != null) atualizarSessaoUI(_lastSaldo);
}, 1000);

// Botão Nova Sessão — reinicia manualmente
btnNovaSessao.addEventListener("click", () => {
    const saldo = _lastSaldo;
    if (saldo != null) {
        iniciarNovaSessao(saldo);
        // Avisa o content.js para atualizar o _saldoInicial (Stop Loss/Gain)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "NOVA_SESSAO", saldoInicial: saldo }).catch(() => {});
            });
        });
        showStatus("↺ Nova sessão iniciada", "#38bdf8");
    } else {
        _sessao = null;
        chrome.storage.local.remove("sessao");
        bancaPct.textContent      = "";
        sessaoTimerEl.textContent = "--:--";
        showStatus("↺ Sessão resetada", "#38bdf8");
    }
});

function renderBanca(saldo, apostas) {
    saldoVal.textContent = saldo != null ? `R$ ${saldo.toFixed(2)}` : "—";

    if (saldo != null) {
        _lastSaldo = saldo;
        chrome.storage.local.set({ lastSaldo: saldo });

        if (!_sessao) {
            // Primeira leitura — inicia sessão automaticamente
            iniciarNovaSessao(saldo);
        } else {
            // Sessão já existe — só atualiza o percentual, nunca reinicia
            atualizarSessaoUI(saldo);
        }
    } else {
        bancaPct.textContent = "";
        bancaPct.className   = "banca-pct";
    }

    entrada1Val.textContent = apostas ? `R$ ${apostas.valor1.toFixed(2)}` : "—";
    entrada1Sub.textContent = apostas ? `@ ${apostas.oddEntrada1}x` : "—";
    entrada2Val.textContent = apostas ? `R$ ${apostas.valor2.toFixed(2)}` : "—";
    const oddP = parseFloat(odd2Inp.value) || 10;
    if (protecaoSub) protecaoSub.textContent = `@ ${oddP}x`;
}

// ===== ATUALIZAÇÃO COMPLETA =====
function applyState(state) {
    if (!state) return;
    renderResults(state.lastClassificados || (state.lastResults || []).map(v => ({
        valor: v, classe: classificar(v)
    })));
    renderPattern(state.lastPadrao || null);
    renderBanca(state.lastSaldo ?? null, state.lastApostas || null);
    if (state.totalSinais !== undefined) totalSinaisEl.textContent = state.totalSinais;
    if (state.ultimoSinal) ultimoSinalEl.textContent = `Último: ${state.ultimoSinal}`;
}

chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) applyState(response);
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "ANALYSIS_UPDATE") applyState(msg);
    if (msg.type === "EXECUTE_SOUND")   playAlert();
    // Stop Loss/Gain desligou o monitor — atualiza botão power
    if (msg.type === "SET_MONITOR" && msg.ativo === false) aplicarEstadoPower(false);
});

// ===== ÁUDIO =====
let audio = new Audio(chrome.runtime.getURL("sounds/alert.mp3"));
let audioReady = false;
function unlockAudio() {
    if (audioReady) return;
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; audioReady = true; }).catch(() => {});
}
function playAlert() {
    chrome.storage.local.get(["sound"], ({ sound }) => {
        if (sound === false) return;
        if (!audioReady) { showStatus("⚠ Clique para ativar som", "#fbbf24"); return; }
        audio.currentTime = 0;
        audio.play().catch(() => {});
    });
}
document.addEventListener("click", unlockAudio);

// ===== TESTE =====
testBtn.addEventListener("click", () => {
    unlockAudio();
    chrome.runtime.sendMessage({ type: "TEST_NOTIFICATION" });
    showStatus("◎ Testando...", "#38bdf8");
});

// ══════════════════════════════════════════════
//  GERENCIAMENTO DE PADRÕES
// ══════════════════════════════════════════════

let padroes = [...PADROES_DEFAULT];
let editIndex = -1; // -1 = novo, >= 0 = editando

// Carrega padrões do storage
function carregarPadroes(cb) {
    chrome.storage.local.get(["padroes"], (data) => {
        if (data.padroes && Array.isArray(data.padroes) && data.padroes.length > 0) {
            padroes = data.padroes;
        } else {
            padroes = [...PADROES_DEFAULT];
        }
        if (cb) cb();
    });
}

// Salva padrões no storage e notifica content.js
function salvarPadroes() {
    chrome.storage.local.set({ padroes }, () => {
        // Propaga atualização para o content via background
        chrome.runtime.sendMessage({ type: "PADROES_UPDATED", padroes });
        showStatus("✔ Padrões salvos", "#22c55e");
    });
}

// Renderiza a lista de padrões
function renderPadroes() {
    padroesList.innerHTML = "";

    if (padroes.length === 0) {
        padroesList.innerHTML = `<div class="padroes-empty">Nenhum padrão cadastrado</div>`;
        return;
    }

    padroes.forEach((p, i) => {
        const item = document.createElement("div");
        item.className = "padrao-item";
        item.innerHTML = `
            <div class="padrao-item-info">
                <div class="padrao-item-nome">${p.nome.replace(/_/g," ")}</div>
                <div class="padrao-item-seq">
                    ${p.sequencia.map(s => `<span class="seq-badge ${s}">${s}</span>`).join("")}
                </div>
            </div>
            <span class="padrao-item-conf">${p.confianca}%</span>
            <div class="padrao-item-actions">
                <button class="btn-icon edit" title="Editar">✎</button>
                <button class="btn-icon del" title="Remover">✕</button>
            </div>`;

        item.querySelector(".edit").addEventListener("click", () => abrirFormEdicao(i));
        item.querySelector(".del").addEventListener("click", () => removerPadrao(i));
        padroesList.appendChild(item);
    });
}

// Abre form para novo padrão
btnNovoPadrao.addEventListener("click", () => {
    editIndex = -1;
    formTitle.textContent = "NOVO PADRÃO";
    fpNome.value = "";
    fpConfianca.value = "75";
    ["seq0","seq1","seq2","seq3"].forEach(id => {
        document.getElementById(id).value = "BAIXO";
    });
    padraoForm.classList.remove("hidden");
    fpNome.focus();
});

// Abre form para edição
function abrirFormEdicao(i) {
    editIndex = i;
    const p = padroes[i];
    formTitle.textContent = "EDITAR PADRÃO";
    fpNome.value = p.nome;
    fpConfianca.value = p.confianca;
    p.sequencia.forEach((val, idx) => {
        document.getElementById(`seq${idx}`).value = val;
    });
    padraoForm.classList.remove("hidden");
    fpNome.focus();
}

// Cancela form
btnCancelarPadrao.addEventListener("click", () => {
    padraoForm.classList.add("hidden");
    editIndex = -1;
});

// Salva padrão (novo ou edição)
btnSalvarPadrao.addEventListener("click", () => {
    const nome = fpNome.value.trim().toUpperCase().replace(/\s+/g, "_");
    const confianca = parseFloat(fpConfianca.value);

    if (!nome) { showStatus("⚠ Informe um nome", "#fbbf24"); return; }
    if (isNaN(confianca) || confianca <= 0 || confianca > 100) {
        showStatus("⚠ Confiança inválida", "#fbbf24"); return;
    }

    const sequencia = [
        document.getElementById("seq0").value,
        document.getElementById("seq1").value,
        document.getElementById("seq2").value,
        document.getElementById("seq3").value,
    ];

    const novoPadrao = { nome, sequencia, confianca };

    if (editIndex >= 0) {
        padroes[editIndex] = novoPadrao;
    } else {
        padroes.push(novoPadrao);
    }

    salvarPadroes();
    padraoForm.classList.add("hidden");
    editIndex = -1;
    renderPadroes();
});

// Remove padrão
function removerPadrao(i) {
    padroes.splice(i, 1);
    salvarPadroes();
    renderPadroes();
}

// ══════════════════════════════════════════════
//  EXPORTAR / IMPORTAR / RESETAR
// ══════════════════════════════════════════════

// EXPORTAR — gera arquivo JSON para download
btnExportar.addEventListener("click", () => {
    const json   = JSON.stringify(padroes, null, 2);
    const blob   = new Blob([json], { type: "application/json" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = `aviator-padroes-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus("✔ Exportado", "#22c55e");
});

// IMPORTAR — abre modal
btnImportar.addEventListener("click", () => {
    importTextarea.value = "";
    importStatus.textContent = "";
    importStatus.style.color = "";
    importModalOverlay.classList.remove("hidden");
    importTextarea.focus();
});

// Importar via arquivo
btnImportarArquivo.addEventListener("click", () => fileImport.click());

fileImport.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        importTextarea.value = ev.target.result;
        importStatus.textContent = `✔ Arquivo carregado: ${file.name}`;
        importStatus.style.color = "#22c55e";
    };
    reader.readAsText(file);
    fileImport.value = "";
});

// Fechar modal
btnCancelarImport.addEventListener("click", () => {
    importModalOverlay.classList.add("hidden");
});
importModalOverlay.addEventListener("click", (e) => {
    if (e.target === importModalOverlay) importModalOverlay.classList.add("hidden");
});

// Confirmar importação
btnConfirmarImport.addEventListener("click", () => {
    try {
        const raw = importTextarea.value.trim();
        if (!raw) { setImportError("⚠ Cole o JSON antes de importar"); return; }

        const dados = JSON.parse(raw);
        const lista = Array.isArray(dados) ? dados : [dados];

        // Valida cada padrão
        const validos = [];
        for (const p of lista) {
            if (!p.nome || typeof p.nome !== "string") { setImportError(`⚠ Padrão sem nome: ${JSON.stringify(p)}`); return; }
            if (!Array.isArray(p.sequencia) || p.sequencia.length !== 4) { setImportError(`⚠ Sequência inválida em "${p.nome}" — precisa ter 4 itens`); return; }
            const allowed = ["BAIXO","MEDIO","ALTO"];
            for (const cls of p.sequencia) {
                if (!allowed.includes(cls)) { setImportError(`⚠ Classe inválida "${cls}" em "${p.nome}" — use BAIXO, MEDIO ou ALTO`); return; }
            }
            if (typeof p.confianca !== "number" || p.confianca <= 0 || p.confianca > 100) { setImportError(`⚠ Confiança inválida em "${p.nome}" — use 1-100`); return; }
            validos.push({ nome: p.nome.toUpperCase().replace(/\s+/g,"_"), sequencia: p.sequencia, confianca: p.confianca });
        }

        // Mescla: evita duplicatas por nome
        let adicionados = 0, atualizados = 0;
        for (const novo of validos) {
            const idx = padroes.findIndex(p => p.nome === novo.nome);
            if (idx >= 0) { padroes[idx] = novo; atualizados++; }
            else          { padroes.push(novo);  adicionados++; }
        }

        salvarPadroes();
        renderPadroes();
        importModalOverlay.classList.add("hidden");
        showStatus(`✔ +${adicionados} novo(s), ${atualizados} atualizado(s)`, "#22c55e");

    } catch (err) {
        setImportError("⚠ JSON inválido: " + err.message);
    }
});

function setImportError(msg) {
    importStatus.textContent = msg;
    importStatus.style.color = "#ef4444";
}

// RESETAR — restaura padrões default
btnResetarPadroes.addEventListener("click", () => {
    if (!confirm("Restaurar os 4 padrões padrão? Os padrões personalizados serão removidos.")) return;
    padroes = [...PADROES_DEFAULT];
    salvarPadroes();
    renderPadroes();
    showStatus("↺ Padrões restaurados", "#f59e0b");
});

// Init: carrega e renderiza padrões
carregarPadroes(renderPadroes);