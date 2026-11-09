/* ==========================================================================
   TELA › MOTORISTAS CREDENCIADOS (#motoristas)
   Credenciados por categoria (clique filtra), CVE e lista exportável.
   ========================================================================== */
(function () {
  const { C, base, filtrosTxt, filtrosBase, bindBase, colsBase, chaveGrupos, ligaChaveGrupos, lista } = CUR;
  /* ---------------- Motoristas credenciados ---------------- */
  // cat: categorias de credenciamento marcadas (várias ao mesmo tempo; vazio = todas)
  const sm = { obm: [], posto: [], q: '', cat: [], cve: '' };
  PAGES.motoristas = {
    title: 'Motoristas credenciados',
    render(view) {
      const todos = DS.militares().filter((m) => base(sm, m));
      const cred = todos.filter((m) => m.credenciado !== '-');
      const rows = DS.ordenar(todos.filter((m) => (!sm.cat.length || sm.cat.includes(m.credenciado)) && (!sm.cve || (sm.cve === 'sim' ? m.cve === true : m.cve === false))));
      // categorias de sempre + as que aparecerem na planilha
      const BASE = ['A', 'B', 'AB', 'D', 'AD', 'AE'];
      const cats = [...BASE, ...[...new Set(DS.militares().map((m) => m.credenciado))].filter((c) => c && c !== '-' && !BASE.includes(c)).sort()];
      const porCat = cats.map((c) => ({ key: c, label: 'Categoria ' + c, v: cred.filter((m) => m.credenciado === c).length })).filter((x) => x.v);

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Motoristas credenciados', 'Categoria da CNH, credenciamento para viatura e curso de condutor de veículo de emergência (CVE).', UI.stamp(C.atualizacoes.motoristas))}
        <div class="filters">${filtrosBase(sm, 'm')}
          ${UI.multiSel(sm, 'mCat', 'cat', 'Credenciado em', cats)}
          <div class="field"><label for="mCve">Possui CVE?</label><select class="select" id="mCve"><option value="">Todos</option><option value="sim" ${sm.cve === 'sim' ? 'selected' : ''}>Possui</option><option value="nao" ${sm.cve === 'nao' ? 'selected' : ''}>Não possui</option></select></div>
          ${UI.btnLimpar('mLimpar')}</div>
        <div class="kpis">
          ${UI.kpi('Credenciados', cred.length, { sub: `de ${todos.length} militares`, meter: cred.length / (todos.length || 1) })}
          ${UI.kpi('Credenciados com CVE', cred.filter((m) => m.cve).length, { tone: 'ok' })}
          ${UI.kpi('Credenciados sem CVE', cred.filter((m) => m.cve === false).length, { tone: 'warn', sub: 'prioridade para o curso' })}
          ${UI.kpi('Sem CNH informada', todos.filter((m) => m.cnh === '-').length)}
        </div>
        <div class="grid g-side">
          <section class="panel"><div class="panel-h"><h3>Militares <span class="count">${rows.length}</span></h3><span class="cur-acoes">${chaveGrupos('mGrupos')}${UI.exp.btnLista('mTbl')}</span></div><div id="mTbl"></div></section>
          ${UI.panel('Credenciados por categoria', UI.barrasHMulti(porCat, new Set(sm.cat)), { note: 'Toque para marcar ou desmarcar uma categoria.' })}
        </div>
      </div>`;

      // por pelotões e alas: credenciados (nas categorias marcadas e com/sem CVE, se filtrado) de quantos militares
      const qualifica = (m) => m.credenciado !== '-' && (!sm.cat.length || sm.cat.includes(m.credenciado)) && (!sm.cve || (sm.cve === 'sim' ? m.cve === true : m.cve === false));
      lista(view.querySelector('#mTbl'), {
        universo: todos, qualifica, rotulo: `credenciados${sm.cat.length ? ' em ' + sm.cat.join(', ') : ''}${sm.cve ? (sm.cve === 'sim' ? ' com CVE' : ' sem CVE') : ''}`,
        cols: [...colsBase,
          { key: 'cnh', label: 'Cat. CNH', cls: 'c', render: (m) => UI.dash(m.cnh) },
          { key: 'credenciado', label: 'Cred. categoria', cls: 'c', render: (m) => m.credenciado === '-' ? UI.dash('') : `<b>${UI.esc(m.credenciado)}</b>` },
          { key: 'cve', label: 'Possui CVE?', render: (m) => UI.simNao(m.cve), sort: (m) => (m.cve === true ? 0 : m.cve === false ? 1 : 2) },
        ],
        rows,
      });
      const rer = () => PAGES.motoristas.render(view);
      ligaChaveGrupos(view, 'mGrupos', rer);
      UI.exp.ligaLista(view, () => ({ titulo: 'Motoristas credenciados', filtros: filtrosTxt(sm, [sm.cat.length ? 'Credenciado em: ' + sm.cat.join(', ') : '', sm.cve ? 'CVE: ' + (sm.cve === 'sim' ? 'Possui' : 'Não possui') : '']) }));
      bindBase(view, sm, 'm', rer);
      view.querySelector('#mCve').onchange = (e) => { sm.cve = e.target.value; rer(); };
      view.querySelector('#mLimpar').onclick = () => { Object.assign(sm, { obm: [], posto: [], q: '', cat: [], cve: '', _aberto: null }); rer(); };
      view.querySelectorAll('.bar-h.click').forEach((b) => {
        b.onclick = () => { const k = b.dataset.key; sm.cat = sm.cat.includes(k) ? sm.cat.filter((c) => c !== k) : sm.cat.concat(k); rer(); };
        b.onkeydown = (e) => { if (e.key === 'Enter') b.click(); };
      });
    },
  };
})();
