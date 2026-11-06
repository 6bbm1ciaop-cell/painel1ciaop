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


  window.CUR = { C, n, base, colsBase, filtrosTxt, filtrosBase, bindBase };
})();
