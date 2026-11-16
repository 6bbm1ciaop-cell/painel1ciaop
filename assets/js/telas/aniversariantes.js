/* ==========================================================================
   TELA › ANIVERSARIANTES (#aniversariantes)
   Aniversariantes do mês escolhido, por OBM.
   ========================================================================== */
(function () {
  const st = { mes: null, obm: '' };
  PAGES.aniversariantes = {
    title: 'Aniversariantes',
    render(view) {
      const hoje = DS.hoje();
      if (st.mes == null) st.mes = hoje.getMonth();
      const lista = DS.militares().filter((m) => m.nascimento && DS.parse(m.nascimento).getMonth() === st.mes && (!st.obm || m.obm === st.obm))
        .map((m) => {
          const n = DS.parse(m.nascimento);
          const d = new Date(hoje.getFullYear(), n.getMonth(), n.getDate());
          return { ...m, dia: n.getDate(), quando: d, idade: d.getFullYear() - n.getFullYear() };
        })
        .sort((a, b) => a.dia - b.dia);
      const hojeL = lista.filter((x) => +x.quando === +hoje);
      const prox = lista.filter((x) => x.quando > hoje)[0];

      view.innerHTML = `<div class="page">
        ${UI.pageHead(`Aniversariantes de ${UI.MESES[st.mes].toLowerCase()}`, 'Militares da 1ª Cia Op que fazem aniversário no mês escolhido.', UI.linkPlanilha('efetivo'))}
        <div class="filters">${UI.select('aMes', 'Mês', UI.MESES.map((m, i) => [i, m]), st.mes, { todos: '' })}${UI.select('aObm', 'OBM', DS.obms(), st.obm)}${UI.btnLimpar('aLimpar')}</div>
        <div class="kpis">
          ${UI.kpi('No mês', lista.length, { tone: 'gold' })}
          ${UI.kpi('Hoje', hojeL.length, { sub: hojeL.map((x) => DS.guerra(x)).join(', ') || 'nenhum' })}
          ${UI.kpi('Próximo', prox ? UI.dm(prox.quando) : '–', { sub: prox ? DS.guerra(prox) : 'sem próximos neste mês' })}
        </div>
        <section class="panel"><div class="panel-h"><h3>Lista do mês <span class="count">${lista.length}</span></h3></div><div id="aTbl"></div></section>
      </div>`;

      UI.table(view.querySelector('#aTbl'), {
        cols: [
          { key: 'dia', label: 'Dia', render: (m) => `<b class="num" style="font-family:var(--f-display);font-size:18px">${UI.pad(m.dia)}</b> <span class="muted">${UI.SEM[m.quando.getDay()]}</span>` },
          { key: 'guerra', label: 'Militar', cls: 'name', render: (m) => `<b>${UI.esc(DS.guerra(m))}</b> ${+m.quando === +hoje ? UI.chip('Hoje', 'gold') : ''}<br><small class="muted">${UI.esc(m.nome)}</small>`, sort: (m) => m.nomeGuerra },
          { key: 'obm', label: 'OBM', render: (m) => UI.obm(m.obm), sort: (m) => DS.ordem(m.obm) },
          { key: 'idade', label: 'Completa', cls: 'n', render: (m) => `${m.idade} anos` },
          { key: 'cel', label: 'Celular', render: (m) => `<span class="num">${UI.esc(m.contato.celular)}</span>`, nosort: true },
        ],
        rows: lista, index: false, onRow: (id) => APP.go('dados', { id }), empty: 'Nenhum aniversariante neste mês para a OBM escolhida.',
      });
      const rer = () => PAGES.aniversariantes.render(view);
      view.querySelector('#aMes').onchange = (e) => { st.mes = +e.target.value; rer(); };
      view.querySelector('#aObm').onchange = (e) => { st.obm = e.target.value; rer(); };
      view.querySelector('#aLimpar').onclick = () => { st.mes = null; st.obm = ''; rer(); };
    },
  };
})();
