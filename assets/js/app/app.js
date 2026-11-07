/* ==========================================================================
   APP › APLICAÇÃO — menu, rotas, tema, busca global, login e carga dos dados
   Fluxo: init() monta o menu → carregar() lê os dados (DS.load) →
   render() desenha a tela da rota (#id) com PAGES[id].render(view).
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);

  const { NAV, BOTTOM, REQUER } = NAVEGACAO;

  const flat = {};
  NAV.forEach((s) => s.items.forEach((it) => {
    if (it.children) it.children.forEach((c) => (flat[c.id] = { ...c, parent: it.group, sec: s.sec, icon: it.icon }));
    else flat[it.id] = { ...it, sec: s.sec };
  }));

  const APP = Object.assign(window.APP || {}, {
    params: {},
    // vai para outra tela levando parâmetros (ex.: APP.go("dados", { id }))
    go(id, params = {}) {
      APP.params = params;
      if (location.hash === '#' + id) render(); else location.hash = id;
    },
  });
  window.APP = APP;

  /* ---------- tema ---------- */
  const root = document.documentElement;
  // tema em uso: o escolhido no botão ou o do sistema
  function temaAtual() { return root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }
  // ícone do botão de tema (sol/lua)
  function pintaTema() {
    $('#themeBtn').innerHTML = ICON(temaAtual() === 'dark' ? 'sun' : 'moon');
    $('#themeBtn').setAttribute('aria-label', temaAtual() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro');
  }
  const temaSalvo = PREFS.ler('tema'); if (temaSalvo) root.dataset.theme = temaSalvo;

  /* ---------- menu ---------- */
  function buildNav() {
    const abertos = new Set();
    PREFS.lerJSON('grupos', []).forEach((g) => abertos.add(g));
    $('#sbNav').innerHTML = NAV.map((s) => `<div class="nav-sec"><div class="nav-sec-t">${s.sec}</div>${s.items.map((it) => {
      if (!it.children) return `<a class="nav-a" href="#${it.id}" data-route="${it.id}" title="${it.label}" ${it.soAdmin ? 'data-so-admin hidden' : ''}>${ICON(it.icon)}<span class="lbl">${it.label}</span>${it.soAdmin ? '<span class="nav-badge" hidden></span>' : ''}</a>`;
      const open = abertos.has(it.group);
      const gid = 'g-' + it.group.replace(/\W+/g, '');
      return `<button class="nav-g" type="button" aria-expanded="${open}" aria-controls="${gid}" data-group="${it.group}" title="${it.group}">${ICON(it.icon)}<span class="lbl">${it.group}</span>${ICON('chevron', 'chev')}</button>
        <div class="nav-sub" id="${gid}" ${open ? '' : 'hidden'}>${it.children.map((c) => `<a class="nav-a" href="#${c.id}" data-route="${c.id}">${'<span class="lbl">' + c.label + '</span>'}</a>`).join('')}</div>`;
    }).join('')}</div>`).join('');

    $('#sbNav').addEventListener('click', (e) => {
      const g = e.target.closest('.nav-g');
      if (g) {
        if (document.getElementById('app').classList.contains('rail-min') && innerWidth > 900) { toggleRail(false); }
        const open = g.getAttribute('aria-expanded') !== 'true';
        g.setAttribute('aria-expanded', open); document.getElementById(g.getAttribute('aria-controls')).hidden = !open;
        PREFS.gravarJSON('grupos', [...document.querySelectorAll('.nav-g[aria-expanded="true"]')].map((x) => x.dataset.group));
      }
      if (e.target.closest('.nav-a')) closeDrawer();
    });

    $('#bottomNav').innerHTML = BOTTOM.map((b) => `<a href="#${b.id}" data-route="${b.id}">${ICON(b.icon)}<span>${b.label}</span></a>`).join('') + `<button type="button" id="bnMore">${ICON('menu')}<span>Menu</span></button>`;
    $('#bnMore').addEventListener('click', openDrawer);
  }

  // destaca no menu a tela aberta e abre o grupo dela
  function marcaAtivo(id) {
    document.querySelectorAll('[data-route]').forEach((a) => { if (a.dataset.route === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const it = flat[id];
    if (it && it.parent) {
      const g = document.querySelector(`.nav-g[data-group="${it.parent}"]`);
      if (g && g.getAttribute('aria-expanded') !== 'true') {
        g.setAttribute('aria-expanded', 'true');
        document.getElementById(g.getAttribute('aria-controls')).hidden = false;
      }
    }
    // "Efetivo" do rodapé fica ativo também nas telas de pessoal
    const bn = document.querySelector('#bottomNav [data-route="dados"]');
    if (bn && it && it.sec === 'Pessoal') bn.setAttribute('aria-current', 'page');
  }

  /* ---------- gaveta (celular) e trilho (desktop) ---------- */
  const app = () => document.getElementById('app');
  // abre/fecha a gaveta do menu (celular)
  function openDrawer() {
    app().classList.add('drawer-open');
    $('#scrim').hidden = false;
    $('#sbNav a, #sbNav button')?.focus({ preventScroll: true });
  }
  function closeDrawer() { app().classList.remove('drawer-open'); $('#scrim').hidden = true; }
  // recolhe/expande o menu lateral (computador)
  function toggleRail(force) {
    const on = typeof force === 'boolean' ? force : !app().classList.contains('rail-min');
    app().classList.toggle('rail-min', on);
    $('#sbCollapse').setAttribute('aria-label', on ? 'Expandir menu' : 'Recolher menu');
    PREFS.marcar('trilho', on);
  }

  /* ---------- rotas ---------- */
  function render() {
    let id = (location.hash || '').replace('#', '') || 'inicio';
    if (!PAGES[id]) id = 'inicio';
    const pg = PAGES[id], it = flat[id] || {};
    const req = id in REQUER ? REQUER[id] : (id === 'login' ? null : 'efetivo');
    $('#tbTitle').textContent = pg.title || it.label;
    $('#tbCrumb').textContent = [it.sec, it.parent].filter(Boolean).join(' / ') || 'Painel de Gestão Operacional';
    document.title = (id === 'inicio' ? 'Painel 1ª Cia Op' : (pg.title || it.label) + ' | Painel 1ª Cia Op');
    marcaAtivo(id);
    UI.fechaSheet();
    document.documentElement.style.setProperty('--stick', (document.querySelector('.topbar').offsetHeight + 16) + 'px');
    const view = $('#view');
    view.innerHTML = '';
    if (req && !DS.ligada(req)) { view.innerHTML = `<div class="page">${UI.pageHead(pg.title || it.label, '')}${UI.panel('Aguardando planilha', `<p>${DS.fonte === 'arquivo' ? (req === 'efetivo' ? 'Esta aba usa a planilha <b>Respostas</b> (efetivo). Carregue o .xlsx dela em <a href="#teste">Testar planilhas</a>.' : ['ferias', 'ddqod', 'horas'].includes(req) ? 'Esta aba usa uma planilha que ainda não foi carregada. Carregue o .xlsx em <a href="#teste">Testar planilhas</a>.' : 'Esta aba ainda não tem planilha definida; ela será ligada nas próximas etapas.') : (() => { const erro = (DS.avisos || []).find((x) => x.startsWith(req + ':')); return erro
          ? `O Apps Script tentou ler esta planilha e deu erro: <b>${UI.esc(erro.slice(req.length + 1).trim())}</b>. Confira o id, o nome da aba e se a conta do Apps Script tem acesso à planilha.`
          : `O Apps Script publicado não enviou esta planilha (<code>FONTES.${req}</code> vazio na versão publicada). Se você já colocou o id, falta publicar: <b>Implantar → Gerenciar implantações → lápis → Nova versão → Implantar</b>. <a href="${UI.esc((C.appsScriptUrl || '') + '?acao=diagnostico')}" target="_blank" rel="noopener">Testar conexão</a><br><small class="muted">Painel v${UI.esc(C.versao)} · implantação …${UI.esc((C.appsScriptUrl || '').replace(/\/exec$/, '').slice(-10))}</small>`; })()}</p>`)}</div>`; marcaAtivo(id); return; }
    try { pg.render(view, APP.params || {}); } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="page">${UI.panel('Erro ao montar a tela', `<p>${UI.esc(e.message)}</p>`)}</div>`;
    }
    APP.params = {};
    window.scrollTo({ top: 0 });
    // faixas de escala abrem já posicionadas no dia de hoje
    UI.carregaFotos(view);
    view.querySelectorAll('.strip').forEach((st) => {
      const t = st.querySelector('.today');
      if (t) st.scrollLeft = Math.max(0, t.offsetLeft - st.offsetLeft - 8);
    });
    PREFS.gravar('ultima', id);
  }

  /* ---------- busca global ---------- */
  function buildSearch() {
    const inp = $('#globalSearch'), pop = $('#searchPop');
    const show = () => {
      const r = DS.busca(inp.value);
      if (!inp.value.trim()) { pop.hidden = true; return; }
      pop.innerHTML = r.length ? r.map((m) => `<button type="button" data-id="${m.id}"><span class="avatar" style="width:30px;height:30px;font-size:11px">${UI.iniciais(m)}</span><span><b>${UI.esc(DS.guerra(m))}</b><small>${UI.esc(m.obm)} / BM ${UI.esc(m.nBM)}</small></span></button>`).join('') : '<div class="empty">Nenhum militar encontrado.</div>';
      pop.hidden = false;
    };
    inp.addEventListener('input', show);
    inp.addEventListener('focus', show);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { inp.value = ''; pop.hidden = true; inp.blur(); }
      if (e.key === 'ArrowDown') { pop.querySelector('button')?.focus(); e.preventDefault(); }
    });
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      pop.hidden = true;
      inp.value = '';
      APP.go('dados', { id: b.dataset.id });
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) pop.hidden = true; });
  }

  /* ---------- indicador de serviço e sincronização ---------- */
  function pintaServico() {
    const s = DS.servicoAgora();
    $('#dutyMini').innerHTML = `<span class="sw" style="--pc:var(--p${s.pel})"></span>Serviço: <b>${s.pel}º Pel</b>`;
    $('#syncInfo').innerHTML = `<span class="dot"></span><span>${{ mock: 'Dados de demonstração', arquivo: 'Arquivo carregado', sheets: 'Planilhas lidas' }[DS.fonte]} às ${UI.hora(DS.atualizadoEm)}</span>`;
    $('#syncInfo').title = 'Clique para ler as planilhas de novo';
    $('#footVer').textContent = `Painel v${C.versao} / uso interno da 1ª Cia Op / 6º BBM`;
    $('#footUpd').textContent = `Data da última atualização: ${UI.data(DS.atualizadoEm)} ${UI.hora(DS.atualizadoEm)}`;
  }

  /* ---------- início ---------- */
  /* ---------- telas de estado (carregando / login / erro) ---------- */
  function telaEstado(html) { $('#view').innerHTML = `<div class="login"><div class="login-card">${document.querySelector('.sb-brand .emblem').outerHTML}${html}</div></div>`; }
  // tela de acesso: botão do Google e/ou usuário e senha (config.js → auth.modo)
  function telaLogin(msg) {
    DADOS.aquecer();   // o Apps Script já vai lendo as planilhas enquanto a pessoa entra
    $('#tbTitle').textContent = 'Acesso'; $('#tbCrumb').textContent = 'Painel de Gestão Operacional';
    const google = AUTH.porGoogle(), senha = AUTH.porSenha() || !google;
    const form = `<form class="login-form" id="lfForm" autocomplete="on">
          <div class="field"><label for="lfUser">Usuário</label><input class="input" id="lfUser" name="username" autocomplete="username" required ${google ? '' : 'autofocus'}></div>
          <div class="field"><label for="lfPass">Senha</label><div class="lf-senha"><input class="input" id="lfPass" name="password" type="password" autocomplete="current-password" required><button type="button" class="lf-olho" id="lfOlho" aria-label="Mostrar senha" title="Mostrar senha" aria-pressed="false">${ICON('eye')}</button></div></div>
          <p class="chip bad" id="lfErro" hidden style="height:auto;padding:6px 10px;white-space:normal"></p>
          <a class="btn ghost" id="lfDiag" hidden target="_blank" rel="noopener" href="${UI.esc((C.appsScriptUrl || '') + '?acao=diagnostico')}">Testar conexão com as planilhas</a>
          <button class="btn primary" id="lfBtn" type="submit">Entrar</button>
        </form>`;
    telaEstado(`<div><h2>Painel de Gestão Operacional</h2><p class="muted" style="margin-top:6px">${UI.esc(C.unidade.nome)} / ${UI.esc(C.unidade.batalhao)}</p></div>
      ${msg ? `<p class="chip warn" style="height:auto;padding:6px 10px;white-space:normal">${UI.esc(msg)}</p>` : ''}
      ${google ? `<div class="lf-google"><div id="gBtn" style="min-height:44px"></div>
        <p class="chip bad" id="gErro" hidden style="height:auto;padding:6px 10px;white-space:normal"></p>
        <p class="muted" style="font-size:13px">Entre com a sua conta Google. No primeiro acesso, o pedido vai para o administrador da companhia liberar.</p></div>` : ''}
      ${senha ? (google ? `<details class="lf-outro"><summary>Entrar com usuário e senha</summary>${form}</details>` : `${form}
        <p class="muted" style="font-size:13px">Acesso restrito à 1ª Cia Op. Usuário e senha fornecidos pelo comando da companhia.</p>`) : ''}`);
    if (google) {
      AUTH.botao($('#gBtn'), carregar, (e) => {
        if (e.pendente) { telaPendente(e); return; }
        const g = $('#gErro'); if (g) { g.textContent = e.message; g.hidden = false; }
      }).catch((e) => { $('#gBtn').innerHTML = `<p class="chip bad" style="height:auto;padding:6px 10px;white-space:normal">${UI.esc(e.message)}</p>`; });
    }
    if (!senha) return;
    const f = $('#lfForm'), err = $('#lfErro'), btn = $('#lfBtn');
    // olho: mostra/esconde a senha (o cursor continua no campo)
    const olho = $('#lfOlho'), pass = $('#lfPass');
    olho.onclick = () => {
      const ver = pass.type === 'password';
      pass.type = ver ? 'text' : 'password';
      olho.innerHTML = ICON(ver ? 'eyeOff' : 'eye');
      olho.setAttribute('aria-pressed', String(ver));
      olho.title = ver ? 'Esconder senha' : 'Mostrar senha';
      olho.setAttribute('aria-label', olho.title);
      pass.focus({ preventScroll: true });
    };
    f.onsubmit = async (e) => {
      e.preventDefault(); err.hidden = true; btn.disabled = true; btn.textContent = 'Entrando…';
      try { await AUTH.entrar($('#lfUser').value.trim(), $('#lfPass').value); carregar(); }
      catch (x) {
        err.textContent = x.message;
        err.hidden = false;
        $('#lfDiag').hidden = !x.diag;
        btn.disabled = false;
        btn.textContent = 'Entrar';
        $('#lfPass').select();
      }
    };
  }
  // conta Google ainda não liberada: pedido de acesso enviado ao administrador
  function telaPendente(e) {
    $('#tbTitle').textContent = 'Acesso';
    telaEstado(`<div><h2>Pedido de acesso enviado</h2></div>
      <p>O e-mail <b>${UI.esc(e.email || '')}</b> ainda não tem acesso ao painel. O pedido foi registrado e o administrador da companhia${e.admins && e.admins.length ? ` (<b>${UI.esc(e.admins.join(', '))}</b>)` : ''} precisa liberar e escolher o seu perfil.</p>
      <p class="muted" style="font-size:13.5px">Depois de liberado, é só entrar de novo com a mesma conta.</p>
      <div class="btn-row" style="justify-content:center"><button class="btn primary" id="pdNovo" type="button">${ICON('reset')}Entrar de novo</button><button class="btn" id="pdOutra" type="button">${ICON('logout')}Usar outra conta</button></div>`);
    $('#pdNovo').onclick = () => telaLogin();
    $('#pdOutra').onclick = () => { AUTH.sair(); telaLogin(); };
  }
  // tela de erro ao carregar os dados, com "Tentar novamente"
  function telaErro(e) {
    $('#tbTitle').textContent = 'Painel de Gestão Operacional';
    telaEstado(`<h2>Não foi possível carregar os dados</h2><p>${UI.esc(e.message)}</p>
      <div class="btn-row" style="justify-content:center"><button class="btn primary" id="btnTenta" type="button">${ICON('reset')}Tentar novamente</button>
      ${AUTH.token ? `<button class="btn" id="btnTroca" type="button">${ICON('logout')}Trocar de conta</button>` : ''}</div>`);
    $('#btnTenta').onclick = carregar;
    if ($('#btnTroca')) $('#btnTroca').onclick = () => { AUTH.sair(); telaLogin(); };
  }
  // iniciais ou foto do usuário no topo
  function pintaUsuario() {
    const av = $('#userChip .avatar');
    if (AUTH.token) {
      av.innerHTML = AUTH.foto ? `<img src="${UI.esc(AUTH.foto)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer">` : UI.esc(AUTH.nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase());
      $('#userChip').title = `${AUTH.nome}${AUTH.email && AUTH.email !== AUTH.nome ? ` (${AUTH.email})` : ''} · perfil: ${DS.nomePerfil || AUTH.nomePerfil || 'consulta'}`;
    }
    else { av.textContent = DS.fonte === 'mock' ? 'CB' : '?'; }
  }

  /* ---------- carga dos dados ---------- */
  let ouvindo = false;
  // lê os dados (planilhas ou demonstração) e desenha a tela atual
  async function carregar() {
    if (AUTH.exigido() && !AUTH.valido()) { AUTH.sair(); telaLogin(); return; }
    telaEstado(`<h2>Carregando dados</h2><p class="muted">Lendo as planilhas da 1ª Cia Op…</p>`);
    try {
      await DS.load();
    } catch (e) {
      console.error(e);
      if (['NAO_AUTENTICADO', 'TOKEN_INVALIDO', 'ACESSO_NEGADO'].includes(e.codigo)) { AUTH.sair(); telaLogin(e.message); return; }
      telaErro(e); return;
    }
    atualizarCasca();
    if (DS.avisos.length) {
      console.warn('Avisos da leitura das planilhas:\n' + DS.avisos.join('\n'));
      UI.toast(`${DS.avisos.length} aviso(s) na leitura das planilhas. Veja em Acesso.`);
    }
    if (!ouvindo) { window.addEventListener('hashchange', render); ouvindo = true; }
    render();
  }
  APP.recarregar = carregar;

  /* ---------- botão "Atualizar" do topo ----------
     Lê as planilhas de novo sem sair da tela: mantém a tela, os filtros e a posição da página. */
  let atualizando = false;
  async function atualizar() {
    if (!DS.db || atualizando) return;
    if (DS.fonte === 'arquivo') { UI.toast('Teste com arquivo: carregue o arquivo de novo em Testar planilhas'); return; }
    atualizando = true;
    const btn = $('#atualizaBtn');
    btn.classList.add('girando'); btn.disabled = true;
    try {
      await DS.load(true);
      const y = window.scrollY;
      atualizarCasca();
      UI.fechaSheet();
      render();
      window.scrollTo({ top: y });
      UI.toast(`Dados atualizados às ${UI.hora(DS.atualizadoEm)}`);
    } catch (e) {
      console.error(e);
      if (['NAO_AUTENTICADO', 'TOKEN_INVALIDO', 'ACESSO_NEGADO'].includes(e.codigo)) { AUTH.sair(); telaLogin(e.message); }
      else UI.toast('Não foi possível atualizar: ' + e.message);
    } finally {
      atualizando = false;
      btn.classList.remove('girando'); btn.disabled = false;
    }
  }
  APP.atualizar = atualizar;

  /* faixa amarela do topo: demonstração ou teste com arquivo */
  function pintaBanda() {
    const b = $('#demoBand');
    b.hidden = DS.fonte === 'sheets';
    if (DS.fonte === 'arquivo') b.innerHTML = `Testando com ${Object.keys(DS.arquivos).length > 1 ? 'as planilhas' : 'a planilha'} <b>${Object.values(DS.arquivos).map((a) => UI.esc(a.tipoNome || a.nome)).join(', ')}</b>. Lido só neste navegador; nada é enviado nem salvo. <a class="band-btn" href="#teste">Ver relatório</a> <button type="button" class="band-btn" id="bandDemo">Voltar à demonstração</button>`;
    else b.innerHTML = `Modo demonstração: todos os nomes e números são fictícios. <a class="band-btn" href="#teste">Testar com a sua planilha</a>`;
    const v = $('#bandDemo'); if (v) v.onclick = () => { DS.usarDemo(); atualizarCasca(); render(); UI.toast('Dados de demonstração'); };
  }
  // atualiza faixa de demonstração, serviço do dia e usuário
  // itens do menu só do administrador (Usuários e acessos) e o número de pedidos de acesso esperando
  function pintaAdmin() {
    const adm = DS.perfil === 'admin' && DS.fonte === 'sheets';
    document.querySelectorAll('[data-so-admin]').forEach((a) => {
      a.hidden = !adm;
      const b = a.querySelector('.nav-badge');
      if (b) { b.hidden = !(adm && DS.pendentes); b.textContent = DS.pendentes || ''; b.title = `${DS.pendentes} pedido(s) de acesso esperando`; }
    });
  }
  APP.pintaAdmin = pintaAdmin;
  function atualizarCasca() { pintaBanda(); pintaServico(); pintaUsuario(); pintaAdmin(); }
  APP.atualizarCasca = atualizarCasca;
  APP.render = () => render();

  /* ---------- início ---------- */
  async function init() {
    if (C.unidade.brasao) document.querySelectorAll('.emblem:not(.bbm)').forEach((e) => (e.innerHTML = `<img src="${C.unidade.brasao}" alt="Brasão do CBMMG">`));
    document.querySelectorAll('.emblem.bbm').forEach((e) => { if (C.unidade.brasaoBatalhao) e.innerHTML = `<img src="${C.unidade.brasaoBatalhao}" alt="Brasão do ${UI.esc(C.unidade.batalhao)}">`; else e.remove(); });
    $('#demoBand').hidden = C.fonteDados !== 'mock';
    $('#tbMenu').innerHTML = ICON('menu');
    $('#atualizaBtn').innerHTML = ICON('refresh');
    $('#sbClose').innerHTML = ICON('x');
    $('#sbCollapse').innerHTML = ICON('collapse');
    document.querySelector('.search .ico').innerHTML = ICON('search');
    buildNav(); buildSearch(); pintaTema();
    if (PREFS.ligado('trilho') && innerWidth > 900) toggleRail(true);

    $('#themeBtn').addEventListener('click', () => {
      root.dataset.theme = temaAtual() === 'dark' ? 'light' : 'dark';
      PREFS.gravar('tema', root.dataset.theme);
      pintaTema();
    });
    $('#tbMenu').addEventListener('click', openDrawer);
    $('#sbClose').addEventListener('click', closeDrawer);
    $('#scrim').addEventListener('click', closeDrawer);
    $('#sbCollapse').addEventListener('click', () => toggleRail());
    $('#userChip').addEventListener('click', () => { if (DS.db) APP.go('login'); });
    $('#syncInfo').addEventListener('click', atualizar);
    $('#atualizaBtn').addEventListener('click', atualizar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    // atalho global: abrir ficha completa a partir de qualquer tela
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open-ficha]');
      if (b) APP.go('dados', { id: b.dataset.openFicha });
    });
    setInterval(() => { if (DS.db) pintaServico(); }, 60000);

    if (AUTH.exigido() && !AUTH.restaurar()) { telaLogin(); return; }
    carregar();
  }

  let iniciado = false;
  // inicia o app uma única vez, quando a página termina de carregar
  const start = () => { if (iniciado) return; iniciado = true; init(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
