/* ==========================================================================
   CURSOS E HABILITAÇÕES › FUNÇÕES COMUNS (window.CUR)
   Filtros de OBM e posto com seleção múltipla, busca por nome, colunas comuns
   e texto dos filtros para o relatório em PDF. Usadas por cursos.js,
   embarcacao.js e motoristas.js (nesta pasta).
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const n = UI.norm;
  // OBM e posto aceitam vários valores (ex.: 1º Pel e 2º Pel)
  const base = (st, m) => (!st.obm.length || st.obm.includes(m.obm)) && (!st.posto.length || st.posto.includes(m.posto)) && (!st.q || n(m.nome + ' ' + m.nomeGuerra + ' ' + m.nBM).includes(n(st.q)));
  const colsBase = [
    { key: 'obm', label: 'OBM', render: (m) => UI.obm(m.obm), sort: (m) => DS.ordem(m.obm) * 100 + DS.RANK[m.posto] },
    { key: 'posto', label: 'Posto/grad.', sort: (m) => DS.RANK[m.posto] },
    { key: 'nome', label: 'Nome do militar', cls: 'name', render: (m) => UI.esc(m.nome) },
  ];
  // texto dos filtros aplicados (vai no relatório em PDF)
  const filtrosTxt = (st, extras = []) => [st.obm.length ? 'OBM: ' + st.obm.join(', ') : '', st.posto.length ? 'Posto/grad.: ' + st.posto.join(', ') : '', st.q ? `Nome: "${st.q}"` : '', ...extras].filter(Boolean).join(' · ');
  // filtros de OBM, posto (seleção múltipla) e nome
  const filtrosBase = (st, p) => `${UI.multiSel(st, p + 'Obm', 'obm', 'OBM', DS.obms())}${UI.multiSel(st, p + 'Posto', 'posto', 'Posto/graduação', DS.postos())}${UI.input(p + 'Q', 'Nome do militar', st.q, { placeholder: 'Nome, guerra ou nº BM' })}`;
  // liga os filtros comuns à tela
  function bindBase(view, st, p, rer) {
    UI.ligaMultiSel(view, st, rer);
    UI.ligaBusca(view, p + 'Q', st, rer);
  }


  /* ---------- chave "Por pelotões e alas" ----------
     Desligada: uma lista só (como sempre). Ligada: os militares separados por OBM, na ordem da tela Geral
     (1º a 4º Pel, alas, depois as demais), cada quadro em ordem de antiguidade. Vale para as três telas
     (Cursos, Condutores de embarcação e Motoristas) e fica lembrada neste navegador. */
  const CH_GRUPOS = 'cursos-por-pelotao';
  const porGrupos = () => PREFS.lerJSON(CH_GRUPOS, false) === true;
  const chaveGrupos = (id) => `<label class="sw-chave" title="Mostra os militares separados por pelotão e ala, como na tela Geral"><input type="checkbox" id="${id}" ${porGrupos() ? 'checked' : ''}><span class="sw-trilho" aria-hidden="true"></span><span>Por pelotões e alas</span></label>`;
  function ligaChaveGrupos(view, id, rer) {
    const c = view.querySelector('#' + id);
    if (c) c.onchange = () => { PREFS.gravarJSON(CH_GRUPOS, c.checked); rer(); };
  }
  /* desenha a lista em host: tabela única ou, com a chave ligada, um comparativo e um quadro por OBM.
     O objetivo é ver a diferença entre pelotões e alas: quantos têm o curso / credenciamento / habilitação
     (qualifica) de quantos militares a OBM tem (universo, já com os filtros de posto e nome).
     Cada quadro lista as linhas da tabela (rows) daquela OBM, sem a coluna OBM, em ordem de antiguidade. */
  function lista(host, { cols, rows, empty, universo, qualifica, rotulo }) {
    if (!porGrupos()) { UI.table(host, { cols, rows, maxH: true, empty }); return; }
    const uni = universo || rows, q = qualifica || (() => true);
    const obms = [...new Set(uni.concat(rows).map((m) => m.obm || ''))].sort((a, b) => DS.ordem(a) - DS.ordem(b) || String(a).localeCompare(b));
    const dados = obms.map((o) => {
      const ms = uni.filter((m) => (m.obm || '') === o), nq = ms.filter(q).length;
      return { o, pn: UI.corPel(o), total: ms.length, nq, pct: ms.length ? nq / ms.length : 0, linhas: rows.filter((m) => (m.obm || '') === o) };
    });
    const nome = (d) => (d.pn ? UI.pelChip(d.pn, d.o) : `<span class="cur-obm">${UI.esc(d.o || 'Sem OBM')}</span>`);
    // comparativo: barra com a proporção de cada OBM; pelotões e alas primeiro
    const media = (l) => { const t = l.reduce((s, d) => s + d.total, 0); return t ? l.reduce((s, d) => s + d.nq, 0) / t : 0; };
    const bloco = (titulo, l) => {
      if (!l.length) return '';
      const md = media(l);
      return `<div class="cur-comp-b"><h4>${titulo} <span class="muted">· média ${UI.pct(md)}</span></h4>${l.map((d) => `<div class="cur-comp-l ${d.total && d.pct < md - 0.1 ? 'baixo' : ''}" title="${d.nq} de ${d.total} ${UI.esc(rotulo)} (${UI.pct(d.pct)})">
        <span class="cur-comp-n">${nome(d)}</span><span class="cur-barra"><span style="width:${Math.round(d.pct * 100)}%"></span></span><span class="cur-comp-v"><b>${d.nq}</b> de ${d.total} · ${UI.pct(d.pct)}</span></div>`).join('')}</div>`;
    };
    const pelAla = dados.filter((d) => d.pn), outras = dados.filter((d) => !d.pn);
    host.innerHTML = `<div class="cur-comp">${bloco('Pelotões e alas', pelAla)}${bloco('Demais OBMs', outras)}
        <p class="muted cur-comp-nota">Barra = ${UI.esc(rotulo)} ÷ militares da OBM (com os filtros de posto e nome). Em laranja: mais de 10 pontos abaixo da média do bloco.</p></div>
      <div class="cur-grupos">${dados.filter((d) => d.linhas.length || d.total).map((d) => `<details class="roster cur-g ${d.pn ? 'pc' + d.pn : ''}" ${d.pn ? 'open' : ''}><summary class="roster-h"><h4>${nome(d)}</h4><span class="n"><b>${d.nq}</b> de ${d.total} ${UI.esc(rotulo)} · ${UI.pct(d.pct)}</span>${ICON('chevron', 'chev')}</summary>
        <div class="cur-g-t" data-grupo="${UI.esc(d.o)}"></div></details>`).join('')}</div>`;
    host.querySelectorAll('.cur-g-t').forEach((el) => {
      const o = el.dataset.grupo;
      UI.table(el, { cols: cols.filter((c) => c.key !== 'obm'), rows: rows.filter((m) => (m.obm || '') === o).sort(DS.ordemAntiguidade), compact: true, empty });
    });
  }

  window.CUR = { C, n, base, colsBase, filtrosTxt, filtrosBase, bindBase, chaveGrupos, ligaChaveGrupos, lista, porGrupos };
})();
