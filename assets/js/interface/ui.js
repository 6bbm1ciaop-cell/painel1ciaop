/* ==========================================================================
   INTERFACE › UI — componentes básicos de tela (sem dependências)
   Formatação (datas, números), chips, cabeçalhos, painéis, KPIs, campos de
   filtro, ficha curta, mapa, fotos, janela inferior (sheet) e aviso (toast).
   Outros componentes acrescentam métodos ao UI: tabela.js, graficos.js,
   observacoes.js, multisel.js, calendario.js e exporta.js (nesta pasta).
   ========================================================================== */
(function () {
  // protege texto para inserir em HTML (evita quebrar a tela com < > " &)
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const SEM_L = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const pad = (n) => String(n).padStart(2, '0');

  const UI = {
    esc, MESES, MES_C, SEM, SEM_L, pad,

    // data → "dd/mm/aaaa"
    data(d) {
      if (!d) return '–';
      const x = typeof d === 'string' ? DS.parse(d) : d;
      if (!x || isNaN(x)) return typeof d === 'string' ? d : '–';
      return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`;
    },
    // data → "dd/mm"
    dm(d) {
      if (!d) return '–';
      const x = typeof d === 'string' ? DS.parse(d) : d;
      if (!x || isNaN(x)) return '–';
      return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}`;
    },
    hora(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; },
    num(n, dec = 0) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); },
    pct(n, dec = 1) { return UI.num(n * 100, dec) + '%'; },
    // anos completos desde a data (idade, tempo de serviço)
    anos(desde) {
      const d = DS.parse(desde), h = DS.hoje();
      if (!d) return '–';
      let a = h.getFullYear() - d.getFullYear();
      if (h < new Date(h.getFullYear(), d.getMonth(), d.getDate())) a--;
      return a;
    },
    iniciais(m) { return (m.nomeGuerra || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); },
    dash(v) { return v === '' || v == null || v === '-' ? '<span class="muted">–</span>' : esc(v); },

    /* número do pelotão a partir do nome da OBM (1º–4º Pel da sede) */
    pelNum(obm) { const m = /^([1-4])º Pel$/.exec(obm || ''); return m ? +m[1] : 0; },
    /** cor de serviço da OBM: nº do pelotão, também para a Ala PEMAD de mesmo número (trabalham nos mesmos dias) */
    corPel(obm) { return UI.pelNum(obm) || +((/^([1-4])ª Ala PEMAD$/.exec(obm || '') || [])[1] || 0); },
    obm(obm) { const n = UI.pelNum(obm); return n ? `<span class="pel pc${n}">${esc(obm)}</span>` : esc(obm); },
    pelChip(n, txt) { return `<span class="pel pc${n}">${esc(txt || n + 'º Pel')}</span>`; },

    chip(txt, tone = '', extra = '') { return `<span class="chip ${tone}" ${extra}>${esc(txt)}</span>`; },
    simNao(v) { return v == null ? '<span class="muted">–</span>' : v ? UI.chip('Possui', 'ok dot') : UI.chip('Não possui', 'bad dot'); },

    stamp(data, label = 'Atualizado em') { return data ? `<span class="stamp">${label} <b>${UI.data(data)}</b></span>` : ''; },

    /** Botão de atalho (ícone de link) que abre a planilha ou o formulário Google da tela.
        fonte: 'efetivo', 'ferias', 'licencas', 'ddqod', 'viaturas', 'horas' → links em config.js → planilhas. Sem link, não aparece. */
    linkPlanilha(fonte) {
      const url = ((window.APP_CONFIG && APP_CONFIG.planilhas) || {})[fonte];
      if (!url) return '';
      const tit = /\/forms\//.test(url) ? 'Abrir o formulário (Google Formulários)' : 'Abrir a planilha (Google Planilhas)';
      return `<a class="icon-btn pg-planilha" href="${esc(url)}" target="_blank" rel="noopener" title="${tit}" aria-label="${tit}">${ICON('link')}</a>`;
    },
    // título e descrição da tela
    /* Alerta discreto de piloto de embarcação (Geral e Empenhos semanais).
       itens: [{ tom: 'bad'|'warn', onde: '2º Pel' ou 'Qua 05 (Sede)', nomes: 'Sd Fulano (venc. 01/02/2025)' }]
       vermelho: sem nenhum piloto disponível · laranja: só piloto com a habilitação vencida */
    alertaPilotos(itens, quando) {
      const grupo = (tom, txt) => {
        const l = itens.filter((x) => x.tom === tom);
        if (!l.length) return '';
        const dica = UI.dica(`${txt}${quando ? ' · ' + quando : ''}`, l.map((x) => [x.onde, x.nomes || (tom === 'bad' ? 'nenhum piloto disponível' : '')]), tom);
        return `<span class="alerta-pil ${tom}" role="status" tabindex="0" ${dica}>${UI.ancora(tom)}<span>${esc(txt)}: <b>${esc(l.map((x) => x.onde).join(', '))}</b></span></span>`;
      };
      return grupo('bad', 'Sem piloto de embarcação') + grupo('warn', 'Piloto de embarcação com habilitação vencida');
    },
    /* âncora com contorno escuro e claro, para não se confundir com as cores dos pelotões
       tom: 'bad' (vermelho) ou 'warn' (laranja) */
    ancora(tom) {
      const p = '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M7 11h10"/><path d="M4 14c0 4 3.6 7 8 7s8-3 8-7"/>';
      return `<svg class="ancora ${tom || ''}" viewBox="-2 -2 28 28" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><g class="anc-1">${p}</g><g class="anc-2">${p}</g><g class="anc-3">${p}</g></svg>`;
    },
    /* atributos de um popup (ao passar o mouse, ao focar ou ao tocar):
       titulo + linhas [[rótulo, texto]]; tom pinta a faixa do popup */
    dica(titulo, linhas, tom) {
      return `data-dica="${esc(JSON.stringify({ t: titulo, l: linhas || [], tom: tom || '' }))}" aria-label="${esc(titulo + '. ' + (linhas || []).map((x) => x.filter(Boolean).join(': ')).join('. '))}"`;
    },

    pageHead(titulo, desc, right = '') {
      return `<div class="page-head"><div><h2>${esc(titulo)}</h2>${desc ? `<p>${desc}</p>` : ''}</div>${right ? `<div class="btn-row">${right}</div>` : ''}</div>`;
    },
    // painel com título, contador e corpo
    panel(titulo, corpo, { actions = '', count = '', flush = false, note = '', cls = '' } = {}) {
      return `<section class="panel ${cls}"><div class="panel-h"><h3>${titulo}${count !== '' ? ` <span class="count">${count}</span>` : ''}</h3>${actions}</div><div class="panel-b ${flush ? 'flush' : ''}">${corpo}</div>${note ? `<div class="panel-note">${note}</div>` : ''}</section>`;
    },
    // click: chave do quadro clicável (vira botão que filtra a tabela); on: quadro marcado
    kpi(label, valor, { sub = '', tone = '', meter = null, small = '', click = '', on = false } = {}) {
      const tag = click ? 'button' : 'div';
      const attrs = click ? ` type="button" data-kpi="${esc(click)}" aria-pressed="${!!on}" title="${on ? 'Clique para desfazer o filtro' : 'Clique para listar estes militares'}"` : '';
      return `<${tag} class="kpi ${tone ? 'tone-' + tone : ''} ${click ? 'click' : ''} ${on ? 'on' : ''}"${attrs}><span class="kpi-l">${esc(label)}</span><span class="kpi-v">${valor}${small ? `<small>${small}</small>` : ''}</span>${sub ? `<span class="kpi-s">${sub}</span>` : ''}${meter != null ? `<div class="meter"><span style="width:${Math.max(0, Math.min(100, meter * 100))}%"></span></div>` : ''}</${tag}>`;
    },
    // campo de seleção simples
    select(id, label, opcoes, valor = '', { todos = 'Todos', grow = false } = {}) {
      const ops = (todos ? `<option value="">${esc(todos)}</option>` : '') + opcoes.map((o) => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(v)}" ${String(v) === String(valor) ? 'selected' : ''}>${esc(t)}</option>`;
      }).join('');
      return `<div class="field ${grow ? 'grow' : ''}"><label for="${id}">${esc(label)}</label><select class="select" id="${id}">${ops}</select></div>`;
    },
    // campo de texto/data
    input(id, label, valor = '', { type = 'search', placeholder = '', grow = true } = {}) {
      return `<div class="field ${grow ? 'grow' : ''}"><label for="${id}">${esc(label)}</label><input class="input" id="${id}" type="${type}" value="${esc(valor)}" placeholder="${esc(placeholder)}" autocomplete="off"></div>`;
    },
    btnLimpar(id = 'btnLimpar') { return `<button class="btn ghost" id="${id}" type="button">${ICON('reset')}Limpar filtros</button>`; },
    vazio(msg) { return `<div class="empty">${msg}</div>`; },

    /** Abas de navegação entre telas irmãs (ex.: Férias por período / por data). lista = [[rota, texto], …] */
    abas(rotulo, lista, atual) { return `<nav class="tabs" aria-label="${esc(rotulo)}">${lista.map(([id, t]) => `<a href="#${id}" aria-selected="${id === atual}">${t}</a>`).join('')}</nav>`; },
    /** Texto sem acentos e em minúsculas (para buscas). */
    norm(s) { return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); },
    /** Campo de busca (id) com atraso: grava o texto em estado.q, redesenha a tela (rer) e devolve o foco ao campo. */
    ligaBusca(view, id, estado, rer, atraso = 250) {
      const q = view.querySelector('#' + id);
      q.oninput = () => {
        estado.q = q.value;
        clearTimeout(estado._t);
        estado._t = setTimeout(() => {
          rer();
          const nq = view.querySelector('#' + id);
          nq.focus();
          nq.setSelectionRange(nq.value.length, nq.value.length);
        }, atraso);
      };
    },

    /* ---------- ficha resumida de um militar ---------- */
    fichaCurta(m, { link = true } = {}) {
      if (!m) return UI.vazio('Selecione um militar na lista para ver a ficha.');
      const ferias = DS.feriasEm(DS.hoje()).some((f) => f.militar === m.id);
      return `<div class="mil-card"><div class="photo">${m.foto ? `<img src="${esc(m.foto)}" alt="">` : UI.iniciais(m)}</div><div>
        <div class="mil-name">${esc(DS.guerra(m))}</div><div class="mil-sub">${esc(m.nome)}</div>
        <div class="chips" style="margin-top:8px">${UI.obm(m.obm)}${ferias ? UI.chip('De férias', 'warn') : ''}</div></div></div>
        <dl class="kv" style="margin-top:12px">
          <dt>Nº BM</dt><dd class="num">${esc(m.nBM)}</dd>
          <dt>Credenciado em</dt><dd>${UI.dash(m.credenciado)}</dd>
          <dt>Condutor de embarcação</dt><dd>${m.embarcacao ? esc(m.embarcacao.hab) : 'Não'}</dd>
          <dt>Cursos</dt><dd>${m.cursos.length ? esc(m.cursos.join(', ')) : '<span class="muted">Nenhum registrado</span>'}</dd>
          <dt>Tipo sanguíneo</dt><dd>${esc(m.tipoSanguineo || '–')}</dd>
        </dl>
        ${link ? `<div class="btn-row" style="margin-top:12px"><button class="btn" type="button" data-open-ficha="${esc(m.id)}">${ICON('id')}Ver dados completos</button></div>` : ''}`;
    },

    /* ---------- mapa do My Maps ---------- */
    mapa(url, titulo) {
      if (!url) return `<div class="map-slot"><div>${ICON('map')}<b>Mapa não configurado</b><span>Informe a URL de incorporação em <code>config.js → mapas</code>.</span></div></div>`;
      const ver = url.replace('/embed?', '/viewer?');
      return `<div class="map-box"><iframe src="${esc(url)}" title="${esc(titulo)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
        <div class="map-foot"><span class="muted">Se o mapa não aparecer, abra direto no Google Maps.</span><a class="btn" href="${esc(ver)}" target="_blank" rel="noopener">${ICON('link')}Abrir em tela cheia</a></div>`;
    },

    /* ---------- fotos ---------- */
    fotoBox(m, cls = '') { return `<div class="photo ${cls}" data-foto="${esc(m.id)}"><span class="ini">${UI.iniciais(m)}</span></div>`; },
    // carrega as fotos dos militares (Drive; se falhar, pelo Apps Script)
    carregaFotos(root) {
      root.querySelectorAll('[data-foto]').forEach((box) => {
        if (box.dataset.carregada) return;
        box.dataset.carregada = '1';
        const m = DS.militar(box.dataset.foto);
        if (!m || !m.foto) return;
        box.classList.add('loading');
        const img = new Image();
        img.alt = 'Foto de ' + DS.guerra(m);
        img.referrerPolicy = 'no-referrer';
        img.onload = () => { box.classList.remove('loading'); box.querySelector('.ini')?.remove(); if (!img.isConnected) box.appendChild(img); };
        img.onerror = () => {
          img.onerror = () => box.classList.remove('loading');
          DS.fotoApi(m).then((d) => { if (d) img.src = d; else box.classList.remove('loading'); });
        };
        img.src = m.foto;
      });
    },

    /* ---------- janela inferior (celular) ---------- */
    // Janela: no celular sobe de baixo (folha inferior); no computador fica centralizada.
    // Enquanto aberta, a página de trás não rola (inclusive no iPhone) e a janela se ajusta ao teclado.
    sheet(titulo, html) {
      // outra janela por cima de uma pergunta (UI.escolha) ainda sem resposta: a pergunta fica sem resposta
      if (UI._aoFechar) { const f = UI._aoFechar; UI._aoFechar = null; f(); }
      let d = document.getElementById('sheet');
      if (!d) {
        d = document.createElement('div');
        d.id = 'sheet'; d.className = 'sheet'; d.hidden = true;
        d.innerHTML = `<div class="sheet-scrim"></div><section class="sheet-box" role="dialog" aria-modal="true" aria-labelledby="sheetT"><div class="sheet-h"><h3 id="sheetT"></h3><button class="icon-btn" type="button" data-close aria-label="Fechar">${ICON('x')}</button></div><div class="sheet-b"></div></section>`;
        document.body.appendChild(d);
        d.addEventListener('click', (e) => { if (e.target.closest('[data-close],.sheet-scrim,[data-open-ficha]')) UI.fechaSheet(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.fechaSheet(); });
        // teclado do celular: a janela ocupa só a parte visível da tela (acima do teclado)
        if (window.visualViewport) {
          const ajusta = () => {
            if (d.hidden) return;
            const z = (window.APP && APP.zoom) || 1;   // com "Ajustar layout à tela" a janela também tem zoom
            d.style.setProperty('--vvh', visualViewport.height / z + 'px');
            d.style.setProperty('--vvt', visualViewport.offsetTop / z + 'px');
          };
          visualViewport.addEventListener('resize', ajusta);
          visualViewport.addEventListener('scroll', ajusta);
          UI._ajustaSheet = ajusta;
        }
      }
      d.querySelector('#sheetT').textContent = titulo;
      d.querySelector('.sheet-b').innerHTML = html;
      d.querySelector('.sheet-b').scrollTop = 0;
      if (d.hidden) {
        // trava a página de trás na posição atual (body fixo); ao fechar, volta ao mesmo ponto
        UI._rolagem = window.scrollY;
        document.body.style.top = -UI._rolagem + 'px';
        document.body.classList.add('no-scroll');
        d.hidden = false;
      }
      if (UI._ajustaSheet) UI._ajustaSheet();
      UI.carregaFotos(d);
      d.querySelector('[data-close]').focus({ preventScroll: true });
    },
    // fecha a janela aberta e devolve a página à posição em que estava
    fechaSheet() {
      if (UI._aoFechar) { const f = UI._aoFechar; UI._aoFechar = null; f(); }
      const d = document.getElementById('sheet');
      if (d && !d.hidden) {
        d.hidden = true;
        document.body.classList.remove('no-scroll');
        document.body.style.top = '';
        window.scrollTo(0, UI._rolagem || 0);
      }
    },

    /** Botão "trabalhando": ícone girando e texto (ex.: "Gravando…"), desabilitado até terminar.
        Devolve uma função que volta o botão ao que era (se ele ainda estiver na tela). */
    ocupado(btn, texto) {
      if (!btn) return () => {};
      const antes = btn.innerHTML;
      btn.disabled = true; btn.classList.add('ocupado'); btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = `<span class="gira" aria-hidden="true"></span><span>${esc(texto)}</span>`;
      return () => { btn.disabled = false; btn.classList.remove('ocupado'); btn.removeAttribute('aria-busy'); btn.innerHTML = antes; };
    },

    /** Janela com uma pergunta e botões [[valor, texto, primario?]]; devolve uma Promise com o valor
        do botão clicado (ou null se a janela for fechada). */
    escolha(titulo, html, botoes) {
      return new Promise((resolve) => {
        UI.sheet(titulo, `<div class="grid" style="gap:12px">${html}<div class="btn-row">${botoes.map(([v, t, p]) => `<button type="button" class="btn ${p ? 'primary' : 'ghost'}" data-escolha="${UI.esc(v)}">${UI.esc(t)}</button>`).join('')}</div></div>`);
        UI._aoFechar = () => resolve(null);
        document.querySelectorAll('#sheet [data-escolha]').forEach((b) => (b.onclick = () => { UI._aoFechar = null; UI.fechaSheet(); resolve(b.dataset.escolha); }));
      });
    },

    // aviso rápido no rodapé (ms = quanto tempo fica; avisos longos ficam mais)
    toast(msg, ms) {
      const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false;
      clearTimeout(UI._tt); UI._tt = setTimeout(() => (t.hidden = true), ms || (msg.length > 90 ? 6000 : 2600));
    },
    bind(root, sel, ev, fn) { root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn)); },
  };

  window.UI = UI;
  window.PAGES = {};

  /* ---------- popup das dicas (elementos com data-dica) ----------
     Aparece ao passar o mouse ou focar (teclado); no celular, ao tocar (e some ao tocar fora). */
  (function () {
    if (typeof document === 'undefined' || typeof addEventListener === 'undefined') return;   // testes fora do navegador
    let pop = null, alvo = null;
    const cria = () => { pop = document.createElement('div'); pop.className = 'dica-pop'; pop.setAttribute('role', 'tooltip'); pop.hidden = true; document.body.appendChild(pop); };
    function mostra(el) {
      let d; try { d = JSON.parse(el.dataset.dica); } catch (e) { return; }
      if (!pop) cria();
      alvo = el;
      pop.className = 'dica-pop ' + (d.tom || '');
      pop.innerHTML = `<b class="dica-t">${UI.esc(d.t)}</b>${d.l.length ? `<ul>${d.l.map(([a, b]) => `<li>${a ? `<span>${UI.esc(a)}</span>` : ''}${b ? `<em>${UI.esc(b)}</em>` : ''}</li>`).join('')}</ul>` : ''}`;
      pop.hidden = false;
      const r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
      let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
      let y = r.bottom + 8;
      if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
    }
    const esconde = () => { if (pop) pop.hidden = true; alvo = null; };
    document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-dica]'); if (el && el !== alvo) mostra(el); else if (!el && alvo) esconde(); });
    document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-dica]'); if (el) mostra(el); });
    document.addEventListener('focusout', esconde);
    document.addEventListener('click', (e) => { const el = e.target.closest && e.target.closest('[data-dica]'); if (el) mostra(el); else esconde(); }, true);
    // rolou a tela: acompanha o elemento se o mouse ainda está nele; senão, some
    addEventListener('scroll', () => { if (!alvo) return; if (alvo.isConnected && alvo.matches(':hover, :focus')) mostra(alvo); else esconde(); }, true);
    addEventListener('hashchange', esconde);
  })();
})();
