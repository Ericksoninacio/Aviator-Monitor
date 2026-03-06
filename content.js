console.log("🛫 [Aviator Monitor PRO] v2.1 — Automação de Entradas Ativa");

// ================= CONFIGURAÇÕES =================
let currentConfig = {
    mode:             "CONSERVADOR",
    sound:            true,
    porcentagemBanca: 0.05,
    oddEntrada1:      1.30,
    oddProtecao:      10.00,
    valorMinimo:      1.00,
    autoEntrar:       false,
    monitorAtivo:     true,    // ← botão liga/desliga geral
};

chrome.storage.local.get(
    ["mode", "sound", "porcentagemBanca", "oddEntrada1", "oddProtecao", "valorMinimo", "autoEntrar", "monitorAtivo"],
    (data) => {
        if (data.mode)               currentConfig.mode             = data.mode;
        if (typeof data.sound === "boolean") currentConfig.sound    = data.sound;
        if (data.porcentagemBanca)   currentConfig.porcentagemBanca = data.porcentagemBanca;
        if (data.oddEntrada1)        currentConfig.oddEntrada1      = data.oddEntrada1;
        if (data.oddProtecao)        currentConfig.oddProtecao      = data.oddProtecao;
        if (data.valorMinimo)        currentConfig.valorMinimo      = data.valorMinimo;
        if (typeof data.autoEntrar  === "boolean") currentConfig.autoEntrar  = data.autoEntrar;
        if (typeof data.monitorAtivo === "boolean") currentConfig.monitorAtivo = data.monitorAtivo;
    }
);

chrome.storage.onChanged.addListener((changes) => {
    if (changes.mode)             currentConfig.mode             = changes.mode.newValue;
    if (changes.sound)            currentConfig.sound            = changes.sound.newValue;
    if (changes.porcentagemBanca) currentConfig.porcentagemBanca = changes.porcentagemBanca.newValue;
    if (changes.oddEntrada1)      currentConfig.oddEntrada1      = changes.oddEntrada1.newValue;
    if (changes.oddProtecao)      currentConfig.oddProtecao      = changes.oddProtecao.newValue;
    if (changes.valorMinimo)      currentConfig.valorMinimo      = changes.valorMinimo.newValue;
    if (changes.autoEntrar  !== undefined) currentConfig.autoEntrar  = changes.autoEntrar.newValue;
    if (changes.monitorAtivo !== undefined) currentConfig.monitorAtivo = changes.monitorAtivo.newValue;
});

// ================= CLASSIFICAÇÃO =================
// Espelho exato da função cor() do frontend:
//   v === 1.00 → CRASH  (#b01212)
//   v <  2.00  → BAIXO  (#00c3ff)
//   v < 10.00  → MEDIO  (#6107ac)
//   v >= 10.00 → ALTO   (#eb63a7)
function classificar(valor) {
    const v = parseFloat(valor.toFixed(2));
    if (v < 2.0)    return "BAIXO";
    if (v < 10.0)   return "MEDIO";
    return "ALTO";
}

// ================= PADRÕES CONHECIDOS =================
// Padrões — carregados do storage (editáveis pelo popup)
let PADROES = [
    { nome: "TENDENCIA_ALTA",  sequencia: ["MEDIO","MEDIO","MEDIO","BAIXO"], confianca: 85.3 },
    { nome: "REVERSAO_FORTE",  sequencia: ["BAIXO","BAIXO","BAIXO","MEDIO"], confianca: 78.1 },
    { nome: "EXPLOSAO_TOPO",   sequencia: ["ALTO","MEDIO","BAIXO","BAIXO"],  confianca: 72.4 },
    { nome: "RECUPERACAO",     sequencia: ["MEDIO","BAIXO","BAIXO","BAIXO"], confianca: 68.9 },
];

// Carrega padrões salvos pelo usuário
chrome.storage.local.get(["padroes"], (data) => {
    if (data.padroes && Array.isArray(data.padroes) && data.padroes.length > 0) {
        PADROES = data.padroes;
        console.log("[Aviator Monitor] 📋 Padrões carregados do storage:", PADROES.length);
    }
});

// Atualiza padrões em tempo real quando o popup salva
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PADROES_UPDATED" && Array.isArray(msg.padroes)) {
        PADROES = msg.padroes;
        console.log("[Aviator Monitor] 🔄 Padrões atualizados:", PADROES.length);
    }
});

function detectarPadrao(results) {
    if (!results || results.length < 4) return null;
    const classificados = results.slice(0, 4).map(classificar);

    for (const padrao of PADROES) {
        if (padrao.sequencia.every((cls, i) => cls === classificados[i])) {
            console.log(`[Aviator Monitor] 🎯 Padrão: ${padrao.nome} | ${classificados.join(",")}`);
            return { nome: padrao.nome, sequencia: padrao.sequencia, confianca: padrao.confianca, classificados };
        }
    }

    console.log(`[Aviator Monitor] 🔍 Sem padrão | ${classificados.join(",")}`);
    return null;
}

// ================= LEITURA DE SALDO =================
function lerSaldo() {
    try {
        const result = document.evaluate(
            "//span[contains(@class,'balance-amount')]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        );
        const el = result.singleNodeValue;
        if (el) {
            const saldo = parseFloat(el.textContent.trim().replace(",", "."));
            if (!isNaN(saldo) && saldo >= 0) return saldo;
        }
        return null;
    } catch (e) {
        console.error("[Aviator Monitor] Erro ao ler saldo:", e);
        return null;
    }
}

// ================= CÁLCULO DE APOSTAS =================
function calcularValores(saldo, porcentagem = 0.05, oddEntrada1 = 1.30, minimo = 1.00) {
    if (!saldo || saldo <= 0) return null;
    const valor1 = Math.max(saldo * porcentagem, minimo);
    const lucro1 = valor1 * (oddEntrada1 - 1);
    const valor2 = Math.max(lucro1, minimo);
    return {
        valor1: parseFloat(valor1.toFixed(2)),
        valor2: parseFloat(valor2.toFixed(2)),
        oddEntrada1,
        porcentagem
    };
}

// ================= LEITURA DOS RESULTADOS (UNIVERSAL) =================
let _lastRawSignature = "";
let _lastParsed = [];

const KNOWN_SELECTORS = [
    ".payouts-block .payout",
    ".payouts-block [class*='payout']",
    "[class*='history'] [class*='multiplier']",
    "[class*='history'] [class*='coef']",
    "[class*='history'] [class*='odd']",
    "[class*='result'] [class*='multiplier']",
    "[class*='round'] [class*='multiplier']",
    "[class*='crash'] [class*='coef']",
    "[class*='game-history'] span",
    "[class*='rounds'] [class*='value']",
    "[class*='coefficient']",
    "[class*='multiplier-value']",
    ".history-item", ".history-value", ".round-result", ".bet-result",
];

function parseMultiplier(text) {
    const clean = text.trim().replace(",", ".");
    const m = clean.match(/^(\d{1,4}\.\d{1,2})\s*[xX]$|^[xX]\s*(\d{1,4}\.\d{1,2})$/);
    if (m) {
        const v = parseFloat(m[1] || m[2]);
        if (!isNaN(v) && v >= 1.0 && v <= 200) return v;
    }
    return null;
}

function extractFromSelectors() {
    for (const sel of KNOWN_SELECTORS) {
        try {
            const els = document.querySelectorAll(sel);
            if (els.length < 2) continue;
            const values = [];
            els.forEach(el => { const v = parseMultiplier(el.textContent); if (v !== null) values.push(v); });
            if (values.length >= 2) return values;
        } catch (_) {}
    }
    return [];
}

function extractFromPageText() {
    const candidates = document.querySelectorAll("span, b, strong, div, td");
    const values = [], seen = new Set();
    candidates.forEach(el => {
        if (el.children.length > 3 || (el.textContent || "").length > 25) return;
        const v = parseMultiplier(el.textContent);
        if (v !== null) {
            const key = `${v}_${Math.round(el.getBoundingClientRect().top)}`;
            if (!seen.has(key)) { seen.add(key); values.push({ v, top: el.getBoundingClientRect().top }); }
        }
    });
    values.sort((a, b) => a.top - b.top);
    return values.map(x => x.v);
}

function getLastResults() {
    try {
        let results = extractFromSelectors();
        if (results.length < 2) results = extractFromPageText();
        if (results.length === 0) return _lastParsed;
        const raw = results.slice(0, 6).join("-");
        if (raw !== _lastRawSignature) { _lastRawSignature = raw; _lastParsed = results.slice(0, 6); }
        return _lastParsed;
    } catch (e) {
        return _lastParsed;
    }
}

// ================= AUTOMAÇÃO DE APOSTAS =================

// Helper: dispara eventos Angular em um input
function setInputAngular(campo, valor) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
    ).set;
    nativeInputValueSetter.call(campo, String(valor));
    campo.dispatchEvent(new Event("input",  { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
    campo.dispatchEvent(new Event("blur",   { bubbles: true }));
}

// Aguarda modal Angular sumir
function aguardarModalSumir(timeout = 5000) {
    return new Promise((resolve) => {
        const deadline = Date.now() + timeout;
        const check = () => {
            const modal = document.querySelector("ngb-modal-window");
            if (!modal || !modal.offsetParent) return resolve(true);
            if (Date.now() > deadline) return resolve(false);
            setTimeout(check, 200);
        };
        check();
    });
}

// ── Encontra o painel app-bet-control pelo índice (0=Aposta1, 1=Aposta2) ──
// Estratégia com múltiplos fallbacks para lidar com variações de DOM
function findApostaPainel(indice, timeout = 4000) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout;

        const tentativas = [
            // 1. Selector nativo direto
            () => document.querySelectorAll("app-bet-control")[indice],
            // 2. XPath pelo label "Aposta N"
            () => {
                const label = indice === 0 ? "Aposta 1" : "Aposta 2";
                const r = document.evaluate(
                    `//label[normalize-space()='${label}']/ancestor::app-bet-control`,
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
                );
                return r.singleNodeValue;
            },
            // 3. XPath por texto do label contendo "Aposta"
            () => {
                const r = document.evaluate(
                    `(//app-bet-control)[${indice + 1}]`,
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
                );
                return r.singleNodeValue;
            },
            // 4. Painel pelo wrapper genérico de bet
            () => {
                const paineis = document.querySelectorAll(
                    "[class*='bet-control'], [class*='bet-panel'], [class*='bet-block']"
                );
                return paineis[indice] || null;
            },
        ];

        const check = () => {
            for (const fn of tentativas) {
                try {
                    const el = fn();
                    if (el) {
                        console.log(`[Aviator Monitor] ✅ Painel ${indice + 1} encontrado via fallback`);
                        return resolve(el);
                    }
                } catch (_) {}
            }
            if (Date.now() > deadline) {
                // Log DOM para debug
                console.error(
                    `[Aviator Monitor] ❌ Painel ${indice + 1} não encontrado. app-bet-control count:`,
                    document.querySelectorAll("app-bet-control").length,
                    "| labels:", [...document.querySelectorAll("label")].map(l => l.textContent.trim()).slice(0, 20)
                );
                return reject(new Error(`Painel de aposta ${indice + 1} não encontrado`));
            }
            setTimeout(check, 250);
        };
        check();
    });
}

// ── Fecha overlays/modais ──
async function fecharOverlays() {
    const xpaths = [
        "//button[contains(@class,'close')]",
        "//button[normalize-space()='Aceitar']",
        "//button[normalize-space()='ACEITAR']",
        "//button[normalize-space()='Entendi']",
        "//button[normalize-space()='OK']",
        "//button[.//span[normalize-space()='VOLTAR A JOGAR']]",
    ];

    let clicou = false;
    for (const xpath of xpaths) {
        try {
            const snap = document.evaluate(
                xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
            );
            for (let i = 0; i < snap.snapshotLength; i++) {
                const btn = snap.snapshotItem(i);
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    clicou = true;
                    console.log("[Aviator Monitor] 🔲 Overlay fechado:", xpath);
                    await sleep(300);
                }
            }
        } catch (_) {}
    }
    if (clicou) await aguardarModalSumir(3000);
    return clicou;
}

// ── Seleciona aba "Auto" ──
async function selecionarModoAuto(painel, indice) {
    // Tenta encontrar o botão Auto com múltiplos seletores
    const seletores = [
        () => painel.querySelector("button.tab.auto, button[class*='tab'][class*='auto']"),
        () => [...painel.querySelectorAll("button")].find(b => {
            const t = b.textContent.trim();
            return t === "Auto" || t === "Automático";
        }),
        () => {
            const r = document.evaluate(
                ".//button[contains(@class,'tab') and (normalize-space()='Auto' or normalize-space()='Automático')]",
                painel, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            return r.singleNodeValue;
        },
        () => painel.querySelector("button.tab:last-child"),
    ];

    let botao = null;
    for (const fn of seletores) {
        try { botao = fn(); if (botao) break; } catch (_) {}
    }

    if (!botao) {
        console.warn(`[Aviator Monitor] ⚠️ Botão Auto não encontrado no painel ${indice + 1}. Botões:`,
            [...painel.querySelectorAll("button")].map(b => b.textContent.trim()));
        return false;
    }

    if (!botao.className.includes("active")) {
        botao.click();
        console.log(`[Aviator Monitor] 🔘 Auto selecionado — Aposta ${indice + 1}`);
        await sleep(350);
    }
    return true;
}

// ── Ativa Auto Cashout (switch estado-driven) ──
async function ativarAutoCashout(painel, indice) {
    const seletores = [
        () => painel.querySelector("app-ui-switcher .input-switch"),
        () => painel.querySelector("[class*='input-switch']"),
        () => painel.querySelector("[class*='switcher'] [class*='switch']"),
        () => {
            const r = document.evaluate(
                ".//app-ui-switcher//div[contains(@class,'input-switch')]",
                painel, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            return r.singleNodeValue;
        },
    ];

    let switchEl = null;
    for (const fn of seletores) {
        try { switchEl = fn(); if (switchEl) break; } catch (_) {}
    }

    if (!switchEl) {
        console.warn(`[Aviator Monitor] ⚠️ Switch auto-cashout não encontrado no painel ${indice + 1}`);
        return false;
    }

    if (switchEl.className.includes("off")) {
        switchEl.click();
        console.log(`[Aviator Monitor] 🔁 Auto cashout ativado — Aposta ${indice + 1}`);
        await sleep(300);
    }
    return true;
}

// ── Define valor de saída (odd) ──
async function definirSaida(painel, odd, indice) {
    // O campo de saída fica no switcher, APÓS o switch ser ativado
    const seletores = [
        () => painel.querySelector("app-ui-switcher input[inputmode='decimal']"),
        () => painel.querySelector("app-ui-switcher input[type='number']"),
        () => painel.querySelector("input[class*='cashout']"),
        () => {
            // Todos os inputs decimais do painel — o segundo costuma ser o cashout
            const inputs = painel.querySelectorAll("input[inputmode='decimal']");
            return inputs[1] || null;
        },
    ];

    let campo = null;
    for (const fn of seletores) {
        try { campo = fn(); if (campo) break; } catch (_) {}
    }

    if (!campo) {
        console.warn(`[Aviator Monitor] ⚠️ Campo de saída não encontrado no painel ${indice + 1}`);
        return false;
    }

    const atual = parseFloat(campo.value);
    if (atual !== odd) {
        setInputAngular(campo, odd);
        console.log(`[Aviator Monitor] 🎯 Saída definida: ${odd}x — Aposta ${indice + 1}`);
        await sleep(150);
    }
    return true;
}

// ── Define valor da aposta ──
async function definirValorAposta(painel, valor, indice) {
    const seletores = [
        // Primeiro input decimal do painel (campo de valor da aposta)
        () => painel.querySelector("input[inputmode='decimal']"),
        () => painel.querySelector("input[type='number']"),
        () => {
            const r = document.evaluate(
                ".//input[@inputmode='decimal']",
                painel, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            return r.singleNodeValue;
        },
    ];

    let campo = null;
    for (const fn of seletores) {
        try { campo = fn(); if (campo) break; } catch (_) {}
    }

    if (!campo) {
        console.error(`[Aviator Monitor] ❌ Campo de valor não encontrado no painel ${indice + 1}`);
        return false;
    }

    const atual = parseFloat(campo.value);
    if (atual !== valor) {
        setInputAngular(campo, valor);
        console.log(`[Aviator Monitor] 💰 Valor definido: R$${valor} — Aposta ${indice + 1}`);
        await sleep(150);
    }
    return true;
}

// ── Clica Apostar (só se autoEntrar marcado) ──
async function clicarApostar(painel, indice) {
    const label = indice === 0 ? "Aposta 1" : "Aposta 2";

    const seletores = [
        // Botão verde principal com classe bet
        () => painel.querySelector("button.btn-success.bet"),
        () => painel.querySelector("button[class*='btn-success'][class*='bet']"),
        // Qualquer botão verde visível no painel
        () => painel.querySelector("button.btn-success:not([class*='tab']):not([class*='cashout'])"),
        // Botão com texto contendo o label da aposta
        () => [...painel.querySelectorAll("button")].find(b =>
            b.textContent.includes(label) && b.offsetParent !== null
        ),
        // Qualquer botão verde visível (último recurso)
        () => [...painel.querySelectorAll("button")].find(b =>
            (b.className.includes("success") || b.className.includes("primary")) &&
            b.offsetParent !== null &&
            !b.className.includes("tab")
        ),
        // XPath
        () => {
            const r = document.evaluate(
                ".//button[contains(@class,'btn-success') and not(contains(@class,'tab'))]",
                painel, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            return r.singleNodeValue;
        },
    ];

    let botao = null;
    for (const fn of seletores) {
        try {
            botao = fn();
            if (botao && botao.offsetParent !== null) break; // só aceita visível
            botao = null;
        } catch (_) {}
    }

    if (!botao) {
        console.error(
            `[Aviator Monitor] ❌ Botão Apostar não encontrado no painel ${indice + 1}.`,
            "Botões disponíveis:",
            [...painel.querySelectorAll("button")].map(b => ({
                cls: b.className.trim(),
                txt: b.textContent.trim().slice(0, 30),
                visivel: b.offsetParent !== null
            }))
        );
        return false;
    }

    botao.click();
    console.log(`[Aviator Monitor] 🟢 ${label} clicada! Botão:`, botao.className.trim());
    return true;
}

// ── Ponto de entrada principal ──
// Cache dos painéis para reutilizar entre prepararCampos e clicarEntrada
let _paineis = null;

// Roda a cada nova rodada — sempre preenche os campos
async function prepararCampos(apostas) {
    if (!apostas) return;

    const SAIDA_1 = currentConfig.oddEntrada1;
    const SAIDA_2 = currentConfig.oddProtecao || 10.00;

    try {
        await aguardarModalSumir();

        _paineis = await Promise.all([
            findApostaPainel(0),
            findApostaPainel(1),
        ]);
        const [p1, p2] = _paineis;

        // preparar_inicio_1 + preparar_inicio_2
        await selecionarModoAuto(p1, 0);
        await ativarAutoCashout(p1, 0);
        await selecionarModoAuto(p2, 1);
        await ativarAutoCashout(p2, 1);

        // preparar_saida_1 + definir_valor_aposta_1
        await definirSaida(p1, SAIDA_1, 0);
        await definirValorAposta(p1, apostas.valor1, 0);

        // preparar_saida_2 + definir_valor_aposta_2
        await definirSaida(p2, SAIDA_2, 1);
        await definirValorAposta(p2, apostas.valor2, 1);

        console.log(`[Aviator Monitor] ✏️ Campos prontos — E1: R$${apostas.valor1}@${SAIDA_1}x | E2: R$${apostas.valor2}@${SAIDA_2}x`);
    } catch (err) {
        _paineis = null;
        console.error("[Aviator Monitor] ❌ Erro ao preparar campos:", err.message);
    }
}

// Roda só quando padrão detectado + autoEntrar marcado
async function clicarEntrada() {
    if (!currentConfig.autoEntrar) {
        console.log("[Aviator Monitor] ⏸ Padrão detectado — entrada manual pendente.");
        return;
    }

    try {
        // Reutiliza painéis já resolvidos ou resolve novamente
        const [p1, p2] = _paineis || await Promise.all([
            findApostaPainel(0),
            findApostaPainel(1),
        ]);

        await sleep(150);
        await clicarApostar(p1, 0);
        await sleep(200);
        await clicarApostar(p2, 1);
        console.log("[Aviator Monitor] ✅ Entradas realizadas automaticamente.");
    } catch (err) {
        console.error("[Aviator Monitor] ❌ Erro ao clicar:", err.message);
    }
}

// ================= UTILITÁRIOS =================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitFor(conditionFn, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout;
        const check = () => {
            if (conditionFn()) return resolve(true);
            if (Date.now() > deadline) return reject(new Error("waitFor timeout"));
            setTimeout(check, 100);
        };
        check();
    });
}

// ================= ENVIO PARA BACKGROUND =================
// Hash-based dedup — idêntico ao Python: tuple(resultados) == ultimo_hash
let ultimoHash = "";

function analisarEEnviar() {
    const results = getLastResults();
    if (results.length === 0) return;

    // Só processa se a rodada mudou (results[0] = mais recente)
    const hashRodada = results.join("|");
    if (hashRodada === ultimoHash) return;
    ultimoHash = hashRodada;

    const rodadaAtual = results[0];
    console.log("[Aviator Monitor] 🎲 Nova rodada:", rodadaAtual, "→ hash:", hashRodada);

    const saldo   = lerSaldo();
    const padrao  = detectarPadrao(results);
    const apostas = saldo ? calcularValores(
        saldo, currentConfig.porcentagemBanca,
        currentConfig.oddEntrada1, currentConfig.valorMinimo
    ) : null;

    chrome.runtime.sendMessage({
        type: "UPDATE_ANALYSIS",
        results, saldo, padrao, apostas,
        classificados: results.map(v => ({ valor: v, classe: classificar(v) }))
    });

    // ── A cada nova rodada: preenche campos (sem clicar) ────────────────
    if (apostas) {
        prepararCampos(apostas);
    }

    // ── Se padrão detectado: alerta + clica (se autoEntrar) ──────────────
    if (padrao && shouldAlert(padrao)) {
        chrome.runtime.sendMessage({ type: "SIGNAL_DETECTED", padrao, saldo, apostas, results });
        clicarEntrada();
    }
}

function shouldAlert(padrao) {
    if (currentConfig.mode === "TESTE") return true;
    const thresholds = { AGRESSIVO: 60, MODERADO: 70, CONSERVADOR: 80 };
    const minimo = thresholds[currentConfig.mode] || 80;
    const passa  = padrao.confianca >= minimo;
    if (!passa) {
        console.warn(
            `[Aviator Monitor] ⚠️ Padrão ${padrao.nome} (${padrao.confianca}%) abaixo do mínimo` +
            ` para ${currentConfig.mode} (${minimo}%) — sem entrada.`
        );
    }
    return passa;
}

// ================= ALERTA VISUAL NA PÁGINA =================
function triggerAlert(padrao, apostas, autoEntrar) {
    const aposta1Txt = apostas ? `R$ ${apostas.valor1.toFixed(2)}` : "—";
    const aposta2Txt = apostas ? `R$ ${apostas.valor2.toFixed(2)}` : "—";
    const statusTxt  = autoEntrar
        ? `<span style="color:#22c55e;">⚡ ENTRADA AUTOMÁTICA REALIZADA</span>`
        : `<span style="color:#fbbf24;">✏️ VALORES PREENCHIDOS — CONFIRME MANUALMENTE</span>`;

    const notifyDiv = document.createElement("div");
    notifyDiv.innerHTML = `
        <div style="background:#060d1a;color:#e2e8f0;padding:18px 20px;border-radius:10px;
            border:1px solid #1e3a5f;box-shadow:0 0 30px rgba(56,189,248,.15);
            font-family:'Courier New',monospace;min-width:320px;max-width:360px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <span style="color:#38bdf8;font-size:13px;font-weight:bold;letter-spacing:2px;">◈ SINAL DETECTADO</span>
                <span style="cursor:pointer;color:#64748b;font-size:16px"
                      onclick="this.closest('div').parentElement.remove()">✕</span>
            </div>
            <div style="background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);
                        border-radius:6px;padding:10px 12px;margin-bottom:10px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:4px;letter-spacing:1px;">PADRÃO</div>
                <div style="color:#f8fafc;font-size:14px;font-weight:bold;">${padrao.nome.replace(/_/g,' ')}</div>
                <div style="color:#22c55e;font-size:12px;margin-top:2px;">${padrao.confianca}% confiança</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);
                            border-radius:6px;padding:8px;text-align:center;">
                    <div style="font-size:10px;color:#64748b;margin-bottom:3px;letter-spacing:1px;">ENTRADA 1</div>
                    <div style="color:#22c55e;font-size:15px;font-weight:bold;">${aposta1Txt}</div>
                    <div style="color:#475569;font-size:10px;">@ ${apostas ? apostas.oddEntrada1 : '—'}x</div>
                </div>
                <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);
                            border-radius:6px;padding:8px;text-align:center;">
                    <div style="font-size:10px;color:#64748b;margin-bottom:3px;letter-spacing:1px;">PROTEÇÃO</div>
                    <div style="color:#fbbf24;font-size:15px;font-weight:bold;">${aposta2Txt}</div>
                    <div style="color:#475569;font-size:10px;">@ 10x</div>
                </div>
            </div>
            <div style="font-size:11px;text-align:center;padding:6px 0 2px;">${statusTxt}</div>
        </div>
    `;
    Object.assign(notifyDiv.style, {
        position: "fixed", top: "20px", right: "20px",
        zIndex: "2147483647", animation: "amSlideIn .35s cubic-bezier(.16,1,.3,1)"
    });

    if (!document.getElementById("am-style")) {
        const style = document.createElement("style");
        style.id = "am-style";
        style.textContent = `@keyframes amSlideIn {
            from { transform: translateX(110%) scale(.95); opacity: 0; }
            to   { transform: translateX(0) scale(1);    opacity: 1; }
        }`;
        document.head.appendChild(style);
    }

    document.body.appendChild(notifyDiv);
    setTimeout(() => notifyDiv.remove(), 10000);
}

// Escuta confirmação do background para exibir alerta visual
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SHOW_VISUAL_ALERT") {
        triggerAlert(msg.padrao, msg.apostas, msg.autoEntrar);
    }
});

// ================= WATCHER DE OVERLAYS =================
// Roda continuamente, independente de sinal — fecha qualquer modal que apareça
let _fechandoOverlay = false;

function verificarEFecharOverlay() {
    if (_fechandoOverlay) return;
    const temOverlay = !!(
        document.querySelector("ngb-modal-window") ||
        document.querySelector(".modal.show") ||
        document.querySelector("[class*='modal'][class*='open']")
    );
    if (temOverlay) {
        _fechandoOverlay = true;
        console.log("[Aviator Monitor] 🔲 Overlay detectado — fechando...");
        fecharOverlays().finally(() => {
            setTimeout(() => { _fechandoOverlay = false; }, 1000);
        });
    }
}

// ================= CONTROLE GERAL (liga/desliga) =================
let lastAlertTime = 0;
let _intervalAnalise   = null;
let _intervalOverlay   = null;
let _observerAnalise   = null;
let _observerText      = null;
let _observerOverlay   = null;

function ligarMonitor() {
    if (_intervalAnalise) return; // já ligado

    console.log("[Aviator Monitor] ▶ Ligando monitor...");
    ultimoHash = ""; // reseta hash para re-detectar tudo

    // Observer principal de análise
    _observerAnalise = new MutationObserver(() => { analisarEEnviar(); });
    _observerAnalise.observe(document.body, { childList: true, subtree: true });

    // Observer de texto (caracteres)
    _observerText = new MutationObserver(() => {
        const now = Date.now();
        if (now - lastAlertTime > 3000) { lastAlertTime = now; analisarEEnviar(); }
    });
    _observerText.observe(document.body, { characterData: true, childList: true, subtree: true });

    // Observer de overlays
    _observerOverlay = new MutationObserver(verificarEFecharOverlay);
    _observerOverlay.observe(document.body, { childList: true, subtree: true });

    // Intervalos
    _intervalAnalise = setInterval(analisarEEnviar, 1500);
    _intervalOverlay = setInterval(verificarEFecharOverlay, 3000);

    // Varredura inicial
    setTimeout(analisarEEnviar, 500);

    console.log("[Aviator Monitor] ✅ Monitor ativo.");
}

function desligarMonitor() {
    console.log("[Aviator Monitor] ⏹ Desligando monitor...");

    if (_observerAnalise)  { _observerAnalise.disconnect();  _observerAnalise  = null; }
    if (_observerText)     { _observerText.disconnect();     _observerText     = null; }
    if (_observerOverlay)  { _observerOverlay.disconnect();  _observerOverlay  = null; }
    if (_intervalAnalise)  { clearInterval(_intervalAnalise); _intervalAnalise = null; }
    if (_intervalOverlay)  { clearInterval(_intervalOverlay); _intervalOverlay = null; }

    console.log("[Aviator Monitor] 🔴 Monitor parado.");
}

// Escuta SET_MONITOR do background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SET_MONITOR") {
        currentConfig.monitorAtivo = msg.ativo;
        msg.ativo ? ligarMonitor() : desligarMonitor();
    }
});

// Inicializa conforme estado salvo
chrome.storage.local.get(["monitorAtivo"], (data) => {
    const ativo = data.monitorAtivo !== false; // padrão: ligado
    currentConfig.monitorAtivo = ativo;
    if (ativo) ligarMonitor();
    else console.log("[Aviator Monitor] 🔴 Monitor iniciado desligado.");
});