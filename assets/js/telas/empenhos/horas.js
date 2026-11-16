/* ==========================================================================
   TELA › HORAS EXCEDENTES (#empenhos-horas)
   Planilha "Novo Controle de horas" (aba QUADRO PARA DASHBOARD + RESUMO):
   quadros por OBM, regras de destaque por horas e plantões no ciclo de 21.
   ========================================================================== */
(function () {
  const TABS = [['empenhos', 'Empenhos semanais'], ['empenhos-horas', 'Horas excedentes']];
  const tabs = (at) => UI.abas('Empenhos', TABS, at);
  /* ---------- horas excedentes (Controle de horas › QUADRO PARA DASHBOARD) ---------- */
  // ordem: 'horas' (mais horas primeiro) ou 'antiguidade' (como nos quadros da aba Geral) · sel: militar marcado com um clique
  const sh = { obm: '', q: '', so: 'todos', modo: 'quadros', ordem: PREFS.ler('he-ordem', 'horas'), sel: '', regras: null };
  // regras de destaque ("filtro matemático"): a primeira regra que bate define a cor
  const CORES = { vermelho: 'var(--red)', amarelo: 'var(--gold)', azul: 'var(--info)', verde: 'var(--ok)' };
  const OPS_HE = [['>', '> (mais de)'], ['>=', '≥ (a partir de)'], ['=', '= (exatamente)'], ['<=', '≤ (até)'], ['<', '< (menos de)'], ['entre', 'entre']];
  const SIMB = { '>': '>', '>=': '≥', '=': '=', '<=': '≤', '<': '<' };
  const PRESETS = [{ op: '>', a: '100', cor: 'vermelho' }, { op: 'entre', a: '51', b: '100', cor: 'amarelo' }, { op: '<=', a: '50', cor: 'verde' }, { op: '=', a: '0', cor: 'azul' }];
  // texto é um número?
  const numOk = (x) => x !== '' && x != null && !isNaN(parseFloat(String(x).replace(',', '.')));
  // texto → número (aceita vírgula)
  const nv = (x) => parseFloat(String(x).replace(',', '.'));
  // regra de destaque preenchida?
  const regraAtiva = (g) => numOk(g.a);
  // horas do militar se encaixam na regra?
  const bate = (v, g) => {
    if (!regraAtiva(g)) return false;
    const a = nv(g.a);
    switch (g.op) {
      case '>': return v > a; case '>=': return v >= a; case '=': return v === a; case '<=': return v <= a; case '<': return v < a;
      case 'entre': { const b = numOk(g.b) ? nv(g.b) : a; return v >= Math.min(a, b) && v <= Math.max(a, b); }
    }
    return false;
  };
  // texto da regra ("> 100 h", "entre 51 e 100 h")
  const descRegra = (g) => (g.op === 'entre' ? `entre ${g.a} e ${numOk(g.b) ? g.b : g.a} h` : `${SIMB[g.op]} ${g.a} h`);
  const nrm = UI.norm;
  PAGES['empenhos-horas'] = {
    title: 'Horas excedentes',
    render(view) {
      const todas = DS.horas();
      // plantões no ciclo (só pelotões operacionais): a cada PL.ciclo plantões a planilha soma 24 h
      const PL = (APP_CONFIG.horas && APP_CONFIG.horas.plantoes) || { ciclo: 21, obms: [], perto: 18 };
      const temPl = todas.some((h) => h.plantoes != null);
      const perto = (h) => h.plantoes != null && h.plantoes >= PL.perto;
      const pltHtml = (h) => (h.plantoes == null ? '<span></span>' : `<span class="plt ${perto(h) ? 'perto' : ''}" title="${h.plantoes} de ${PL.ciclo} plantões no ciclo atual. Ao completar ${PL.ciclo}, a planilha soma 24 h.${perto(h) ? ' Faltam ' + (PL.ciclo - h.plantoes) + '.' : ''}"><span class="plt-bar"><span style="width:${Math.min(100, (h.plantoes / PL.ciclo) * 100)}%"></span></span><b class="num">${h.plantoes}</b><small>/${PL.ciclo}</small></span>`);
      if (!sh.regras) sh.regras = ((APP_CONFIG.horas && APP_CONFIG.horas.destaques) || []).map((g) => ({ op: '>', a: '', b: '', cor: 'vermelho', ...g, a: String(g.a ?? ''), b: String(g.b ?? '') }));
      const ativas = sh.regras.map((g, i) => ({ ...g, i })).filter(regraAtiva);
      const destaque = (h) => ativas.find((g) => bate(h.he, g));
      const clsDe = (h) => { const g = destaque(h); return g ? `hl hl-${g.cor}` : ''; };
      const obms = DS.obms().filter((o) => todas.some((h) => h.obm === o)).concat([...new Set(todas.map((h) => h.obm))].filter((o) => !DS.obms().includes(o)));
      const rows = todas.filter((h) => (!sh.obm || h.obm === sh.obm) && (sh.so !== 'saldo' || h.he > 0) && (sh.so !== 'destaque' || destaque(h)) && (sh.so !== 'ciclo' || perto(h)) && (!sh.q || nrm(h.nome).includes(nrm(sh.q))));
      const tot = rows.reduce((s, h) => s + h.he, 0), com = rows.filter((h) => h.he > 0);
      const maior = rows.slice().sort((a, b) => b.he - a.he)[0];
      const max = Math.max(1, ...todas.map((h) => h.he));
      const porObm = obms.map((o) => {
        const hs = todas.filter((h) => h.obm === o);
        return { key: o, label: o, v: hs.reduce((s, h) => s + h.he, 0), title: `${hs.length} militares, média ${UI.num(hs.reduce((s, h) => s + h.he, 0) / (hs.length || 1), 1)} h` };
      });
      // quadros por fração (APP_CONFIG.horas.grupos) + "Demais" para as outras OBMs
      const GR = (APP_CONFIG.horas && APP_CONFIG.horas.grupos) || [];
      const ordHE = (a, b) => b.he - a.he || String(a.nome).localeCompare(b.nome);
      // antiguidade: posição no pelotão, posto (Ten → Sub Ten → Sgt → Cb → Sd) e nome, igual aos quadros da Geral
      const milDe = (h) => DS.militar(h.militar) || { nomeGuerra: h.nome };
      const ordAntig = (a, b) => DS.ordemAntiguidade(milDe(a), milDe(b)) || ordHE(a, b);
      const ordem = sh.ordem === 'antiguidade' ? ordAntig : ordHE;
      const grupos = GR.filter((g) => !sh.obm || sh.obm === g).map((g) => {
        const itens = rows.filter((h) => h.obm === g).sort(ordem);
        return { nome: g, itens, tot: itens.reduce((s, h) => s + h.he, 0) };
      });
      const resto = rows.filter((h) => !GR.includes(h.obm)).sort(ordem);
      if (resto.length) grupos.push({ nome: 'Demais OBMs', demais: true, itens: resto, tot: resto.reduce((s, h) => s + h.he, 0) });

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Horas excedentes', 'Saldo de horas excedentes (HE) de cada militar, conforme o quadro para dashboard do controle de horas.', UI.linkPlanilha('horas'))}
        ${tabs('empenhos-horas')}
        <div class="filters">
          ${UI.select('hObm', 'OBM', obms, sh.obm)}
          ${UI.input('hQ', 'Militar', sh.q, { placeholder: 'Nome de guerra' })}
          <div class="field"><label for="hSo">Mostrar</label><select class="select" id="hSo">${[['todos', 'Todos'], ['saldo', 'Só com saldo'], ['destaque', 'Só os destacados'], ...(temPl ? [['ciclo', `Perto de completar ${PL.ciclo} plantões (${PL.perto}+)`]] : [])].map(([v, t]) => `<option value="${v}" ${sh.so === v ? 'selected' : ''} ${v === 'destaque' && !ativas.length ? 'disabled' : ''}>${t}</option>`).join('')}</select></div>
          ${UI.btnLimpar('hLimpar')}
        </div>
        <section class="panel he-regras"><div class="panel-h"><h3>Destacar militares</h3><span class="muted" style="font-size:13px">${ativas.length ? `${todas.filter(destaque).length} destacado(s)` : 'Nenhuma regra ativa'}</span></div>
          <div class="panel-b">
            ${sh.regras.map((g, i) => `<div class="regra ${regraAtiva(g) ? '' : 'off'}">
              <span class="sw-cor" style="background:${CORES[g.cor]}"></span>
              <span class="muted">HE</span>
              <select class="select" data-r="${i}" data-k="op" aria-label="Comparação da regra ${i + 1}">${OPS_HE.map(([v, t]) => `<option value="${v}" ${g.op === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
              <span class="vals"><input class="input" type="number" inputmode="decimal" step="any" id="rA${i}" data-r="${i}" data-k="a" value="${UI.esc(g.a)}" placeholder="horas" aria-label="Horas da regra ${i + 1}">
              ${g.op === 'entre' ? `<span class="muted">e</span><input class="input" type="number" inputmode="decimal" step="any" id="rB${i}" data-r="${i}" data-k="b" value="${UI.esc(g.b)}" placeholder="horas" aria-label="Até quantas horas, regra ${i + 1}">` : ''}</span>
              <select class="select cor" data-r="${i}" data-k="cor" aria-label="Cor da regra ${i + 1}">${Object.keys(CORES).map((c) => `<option value="${c}" ${g.cor === c ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('')}</select>
              <span class="regra-n">${regraAtiva(g) ? `<b class="num">${todas.filter((h) => destaque(h) && destaque(h).i === i).length}</b> mil.` : ''}</span>
              <button type="button" class="icon-btn" data-rdel="${i}" aria-label="Remover regra ${i + 1}" title="Remover regra">✕</button>
            </div>`).join('')}
            <div class="regra-acoes">
              <button type="button" class="btn ghost" id="rAdd">+ Adicionar regra</button>
              <span class="muted">Atalhos:</span>
              ${PRESETS.map((g, i) => `<button type="button" class="chip" data-preset="${i}"><i class="sw-cor" style="background:${CORES[g.cor]}"></i>${descRegra(g)}</button>`).join('')}
            </div>
            ${ativas.length > 1 ? '<p class="muted" style="margin:8px 0 0;font-size:12.5px">Se um militar se encaixar em mais de uma regra, vale a cor da primeira da lista.</p>' : ''}
          </div>
        </section>
        <div class="kpis">
          ${UI.kpi('Total de HE', UI.num(tot), { small: 'h', tone: 'gold' })}
          ${UI.kpi('Militares com saldo', com.length, { small: `/ ${rows.length}`, meter: com.length / (rows.length || 1) })}
          ${UI.kpi('Média por militar', UI.num(tot / (rows.length || 1), 1), { small: 'h' })}
          ${UI.kpi('Maior saldo', maior ? UI.num(maior.he) : '–', { small: maior ? 'h' : '', sub: maior ? UI.esc(maior.nome) : '' })}
          ${temPl ? UI.kpi(`Perto de ${PL.ciclo} plantões`, todas.filter(perto).length, { sub: `${PL.perto} ou mais no ciclo · pelotões operacionais`, click: 'ciclo', on: sh.so === 'ciclo', tone: todas.some(perto) ? 'info' : '' }) : ''}
        </div>
        <div class="he-modos">
          <div class="seg" role="tablist" aria-label="Forma de exibição">
            <button type="button" role="tab" data-modo="quadros" aria-selected="${sh.modo === 'quadros'}">Por fração</button>
            <button type="button" role="tab" data-modo="lista" aria-selected="${sh.modo === 'lista'}">Lista única</button>
          </div>
          <span class="muted">Ordem:</span>
          <div class="seg" role="tablist" aria-label="Ordem dos militares">
            <button type="button" role="tab" data-ordem="horas" aria-selected="${sh.ordem !== 'antiguidade'}" title="Quem tem mais horas excedentes primeiro">Mais horas</button>
            <button type="button" role="tab" data-ordem="antiguidade" aria-selected="${sh.ordem === 'antiguidade'}" title="Tenentes, Sub Ten, Sargentos, Cabos e Soldados, como nos quadros da aba Geral">Antiguidade</button>
          </div>
        </div>
        ${sh.modo === 'quadros' ? `<div class="he-grupos">${grupos.map((g) => `<section class="panel he-grupo ${UI.pelNum(g.nome) ? 'pc' + UI.pelNum(g.nome) : ''}">
            <div class="panel-h"><h3>${UI.pelNum(g.nome) ? UI.pelChip(UI.pelNum(g.nome), g.nome) : UI.esc(g.nome)}</h3><span class="he-tot"><b class="num">${UI.num(g.tot)}</b> h</span></div>
            <div class="he-sub">${g.itens.length} militar(es) / média ${UI.num(g.itens.length ? g.tot / g.itens.length : 0, 1)} h${g.itens.some((h) => h.plantoes != null) ? ` <span class="he-sub-pl">· plantões/${PL.ciclo} · HE</span>` : ''}</div>
            <ol class="he-lista">${g.itens.map((h) => `<li class="${clsDe(h)}"><button type="button" data-h="${h.id}" aria-pressed="${sh.sel === h.id}"><span class="nm">${UI.esc(h.nome)}${g.demais ? ` <small class="muted">${UI.esc(h.obm)}</small>` : ''}</span>${pltHtml(h)}<span class="he-bar"><span style="width:${(h.he / max) * 100}%"></span></span><b class="num">${UI.num(h.he)}</b></button></li>`).join('') || '<li class="muted" style="padding:6px 0">Ninguém neste filtro</li>'}</ol>
          </section>`).join('')}</div>
        <div class="grid g-2">
          ${UI.panel('HE por OBM', UI.barrasH(porObm, { click: true, ativo: sh.obm }), { note: 'Soma das horas da OBM. Toque para filtrar.' })}
          ${UI.panel('Maiores saldos', UI.barrasH(todas.slice().sort((a, b) => b.he - a.he).slice(0, 10).map((h) => ({ key: h.id, label: h.nome, v: h.he, cor: 'var(--gold)' })), { max }))}
        </div>` : `<div class="grid g-side">
          <section class="panel"><div class="panel-h"><h3>Saldo por militar <span class="count">${rows.length}</span></h3></div><div id="hTbl"></div></section>
          <div class="grid">
            ${UI.panel('HE por OBM', UI.barrasH(porObm, { click: true, ativo: sh.obm }), { note: 'Soma das horas da OBM. Toque para filtrar.' })}
            ${UI.panel('Maiores saldos', UI.barrasH(todas.slice().sort((a, b) => b.he - a.he).slice(0, 10).map((h) => ({ key: h.id, label: h.nome, v: h.he, cor: 'var(--gold)' })), { max }))}
          </div>
        </div>`}
      </div>`;

      // clique no militar: só marca com um destaque (o segundo clique desmarca); não sai da tela
      const marca = (id) => {
        sh.sel = sh.sel === id ? '' : id;
        view.querySelectorAll('[data-h]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.h === sh.sel));
        view.querySelectorAll('#hTbl tr[data-id]').forEach((tr) => tr.classList.toggle('sel', tr.dataset.id === sh.sel));
      };
      if (view.querySelector('#hTbl')) UI.table(view.querySelector('#hTbl'), {
        cols: [
          { key: 'obm', label: 'OBM', render: (h) => UI.obm(h.obm), sort: (h) => DS.ordem(h.obm) * 1000 - h.he },
          { key: 'nome', label: 'Militar', cls: 'name', render: (h) => `<b>${UI.esc(h.nome)}</b>` },
          ...(temPl ? [{ key: 'plantoes', label: `Plantões (ciclo de ${PL.ciclo})`, cls: 'c', render: (h) => (h.plantoes == null ? UI.dash('') : pltHtml(h)), sort: (h) => (h.plantoes == null ? -1 : h.plantoes) }] : []),
          { key: 'he', label: 'HE (h)', cls: 'n', render: (h) => `<span class="he-cell"><span class="he-bar"><span style="width:${(h.he / max) * 100}%"></span></span><b class="num">${UI.num(h.he)}</b></span>` },
        ],
        rows: sh.ordem === 'antiguidade' ? rows.slice().sort(ordAntig) : rows, sort: sh.ordem === 'antiguidade' ? null : 'he', dir: -1,
        maxH: true, onRow: marca, selected: () => sh.sel, rowCls: clsDe,
        empty: 'Nenhum militar para os filtros escolhidos.',
      });
      const rer = () => PAGES['empenhos-horas'].render(view);
      view.querySelector('#hObm').onchange = (e) => { sh.obm = e.target.value; rer(); };
      view.querySelector('#hSo').onchange = (e) => { sh.so = e.target.value; rer(); };
      view.querySelectorAll('[data-kpi="ciclo"]').forEach((b) => (b.onclick = () => { sh.so = sh.so === 'ciclo' ? 'todos' : 'ciclo'; rer(); }));
      view.querySelector('#hLimpar').onclick = () => { Object.assign(sh, { obm: '', q: '', so: 'todos', regras: [] }); rer(); };
      // regras de destaque
      const foca = (id) => {
        const n = view.querySelector('#' + id);
        if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (_) { /* number */ } }
      };
      view.querySelectorAll('.he-regras [data-r]').forEach((el) => {
        const g = sh.regras[+el.dataset.r], k = el.dataset.k;
        if (el.tagName === 'SELECT') el.onchange = () => { g[k] = el.value; rer(); };
        else el.oninput = () => {
          g[k] = el.value;
          clearTimeout(sh._t);
          sh._t = setTimeout(() => { if (sh.so === 'destaque' && !sh.regras.some(regraAtiva)) sh.so = 'todos'; rer(); foca(el.id); }, 350);
        };
      });
      view.querySelectorAll('[data-rdel]').forEach((b) => (b.onclick = () => {
        sh.regras.splice(+b.dataset.rdel, 1);
        if (!sh.regras.some(regraAtiva) && sh.so === 'destaque') sh.so = 'todos';
        rer();
      }));
      view.querySelector('#rAdd').onclick = () => {
        const usadas = sh.regras.map((g) => g.cor);
        sh.regras.push({ op: '>', a: '', b: '', cor: Object.keys(CORES).find((c) => !usadas.includes(c)) || 'vermelho' });
        rer();
        foca('rA' + (sh.regras.length - 1));
      };
      view.querySelectorAll('[data-preset]').forEach((b) => (b.onclick = () => { sh.regras.push({ b: '', ...PRESETS[+b.dataset.preset] }); rer(); }));
      view.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => { sh.modo = b.dataset.modo; rer(); }));
      view.querySelectorAll('[data-ordem]').forEach((b) => (b.onclick = () => { sh.ordem = b.dataset.ordem; PREFS.gravar('he-ordem', sh.ordem); rer(); }));
      view.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => marca(b.dataset.h)));
      UI.ligaBusca(view, 'hQ', sh, rer, 220);
      view.querySelectorAll('.bar-h.click').forEach((b) => {
        b.onclick = () => { sh.obm = sh.obm === b.dataset.key ? '' : b.dataset.key; rer(); };
        b.onkeydown = (e) => { if (e.key === 'Enter') b.click(); };
      });
    },
  };
})();
