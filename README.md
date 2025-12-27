# 🛫 Aviator Monitor

Extensão para Google Chrome que **monitora o jogo Aviator** em tempo real e **emite alertas automáticos de possíveis entradas**, com base em regras configuráveis (Conservador, Moderado e Agressivo).

O projeto foi desenvolvido respeitando **todas as regras do Manifest V3**, garantindo estabilidade, compatibilidade e segurança.

---

## 🎯 Objetivo do Projeto

- Monitorar o histórico de multiplicadores do Aviator
- Identificar padrões de possível entrada
- Notificar o usuário automaticamente
- Permitir configuração simples via popup
- Emitir alerta sonoro opcional

> ⚠️ **Importante:** Este projeto **não realiza apostas automáticas**. Ele atua apenas como **identificador e alertador**.

---

## 🧠 Modos de Operação

O usuário pode escolher o comportamento do monitor:

### 🟢 Conservador
- Menos alertas
- Entradas mais raras
- Maior exigência de padrão

### 🟡 Moderado (padrão)
- Equilíbrio entre risco e frequência

### 🔴 Agressivo
- Mais alertas
- Menor exigência de padrão
- Maior risco

---

## 🔊 Alerta Sonoro

- Pode ser ativado ou desativado no painel
- O som respeita as regras do Chrome (necessita interação inicial)
- Utilizado apenas como aviso, sem interferir no jogo

---

## 🧩 Arquitetura do Projeto

O projeto segue uma separação clara de responsabilidades:

```
content.js    → monitora a página do Aviator
background.js → cria notificações e badge
popup.js      → painel de configuração + áudio
manifest.json → configuração da extensão
```

### 📄 content.js
- Executa dentro da página do jogo
- Lê dados do DOM (histórico de multiplicadores)
- Identifica possíveis entradas
- Envia eventos para o background

### 📄 background.js (Service Worker)
- Recebe eventos do content
- Dispara notificações do Chrome
- Controla badge da extensão
- **Não toca áudio** (limitação do MV3)

### 📄 popup.js
- Interface de configuração
- Seleção de modo
- Ativar/desativar som
- Botão de teste de notificação
- Responsável por tocar áudio

---

## 📦 Estrutura de Pastas

```
aviator-monitor/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── sounds/
│   └── alert.mp3
└── icons/
    └── icon128.png
```

---

## ⚙️ Instalação Manual

1. Abra `chrome://extensions`
2. Ative **Modo do Desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta do projeto
5. A extensão aparecerá na barra do Chrome

---

## 🧪 Teste de Funcionamento

1. Clique no ícone da extensão
2. Selecione o modo desejado
3. Ative o som (opcional)
4. Clique em **🔔 Testar Notificação**
5. Uma notificação deverá aparecer

> 📌 O som só funcionará após interação com o popup (regra do Chrome)

---

## ⚠️ Limitações Conhecidas

- O Chrome **não permite abrir popup automaticamente**
- O Service Worker **não pode tocar áudio**
- O alerta sonoro depende de interação inicial

Essas limitações são **regras do navegador**, não falhas do projeto.

---

## 🛡️ Aviso Legal

Este projeto é apenas uma **ferramenta educacional e experimental**.

- Não garante resultados
- Não influencia o RNG do jogo
- Não executa apostas
- Não se responsabiliza por perdas

O uso é de inteira responsabilidade do usuário.

---
## 📌 Casas de Apostas com Aviator no Brasil Disponivel para leitura

- [x] **Superbet**  
- [ ] **Betano** 
- [ ] **bet365**   
- [ ] **KTO**  
- [ ] **Betnacional**  
- [ ] **Novibet** 
---
## 🚀 Próximos Melhoramentos (Roadmap)

- [x] Leitura avançada do histórico
- [ ] Cooldown entre alertas
- [ ] Estatísticas no popup
- [ ] Detecção de padrões personalizados

---

## 👨‍💻 Autor

Projeto desenvolvido com foco em **Força de vontade kkkk**, **respeito às regras do Chrome** e **estabilidade de longo prazo**.

---

Se precisar de ajuda ou quiser evoluir o projeto, continue a implementação com cautela e testes constantes.

