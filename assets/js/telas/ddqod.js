/* ==========================================================================
   TELA › DDQOD (#ddqod)
   Previsto × existente × claros por fração, com filtro cruzado por círculo:
   clicar em Cb/Sd, St/Sgt, Ten ou Cap em qualquer gráfico filtra todos os outros.
   Observações editáveis, relatório consolidado recolhível e PDF da tela.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const SER = [{ nome: 'Previsto', cor: 'var(--muted)' }, { nome: 'Existente', cor: 'var(--fg)' }, { nome: 'Claro', cor: 'var(--red)', corTxt: 'var(--red-ink)' }];
  const key = `<div class="series-key"><span><i style="background:var(--muted)"></i>Previsto</span><span><i style="background:var(--fg)"></i>Existente</span><span><i style="background:var(--red)"></i>Claro</span></div>`;
  const ORD = ['Cb/Sd', 'St/Sgt', 'Ten', 'Cap'];
  const cores = { 'Cb/Sd': 'var(--fg)', 'St/Sgt': 'var(--muted)', 'Ten': 'var(--red)', 'Cap': 'var(--gold)' };
  let sel = '';
  // quadro consolidado recolhível (lembra a escolha neste navegador)
  let aberto = null;
  // relatório consolidado aberto/recolhido (lembrado no navegador)
  const qAberto = () => { if (aberto == null) aberto = PREFS.ligado('dd-consol', true); return aberto; };
  // soma previsto/existente/claro de várias frações
  const soma = (ls, k) => ls.reduce((s, l) => s + l[k], 0);
  PAGES.ddqod = {
    title: 'DDQOD',
    render(view) {
      const dd = DS.ddqod();
      const tot = ORD.map((c) => {
        const ls = dd.flatMap((g) => g.linhas.filter((l) => l.classe === c));
        return { classe: c, previsto: soma(ls, 'previsto'), existente: soma(ls, 'existente') };
      }).filter((x) => x.previsto || x.existente).map((x) => ({ ...x, claro: x.previsto - x.existente }));
      if (sel && !tot.some((x) => x.classe === sel)) sel = '';
      const totF = sel ? tot.filter((x) => x.classe === sel) : tot;
      const P = soma(totF, 'previsto'), E = soma(totF, 'existente'), Etodos = soma(tot, 'existente');
      // frações com as linhas já filtradas
      const fr = dd.map((g) => {
        const linhas = sel ? g.linhas.filter((l) => l.classe === sel && (l.previsto || l.existente)) : g.linhas;
        const prev = soma(linhas, 'previsto'), ex = soma(linhas, 'existente');
        return { ...g, linhas, previsto: prev, existente: ex, claro: prev - ex, claroPct: prev ? (prev - ex) / prev : null };
      });
      const pctTxt = (v) => (v == null ? 'Não há dados' : UI.pct(v, 2));
      const corPct = (v) => (v == null ? 'var(--muted)' : v > .15 ? 'var(--bad)' : v < 0 ? 'var(--info)' : 'var(--fg-2)');

      view.innerHTML = `<div class="page">
        ${UI.pageHead('DDQOD da 1ª Cia Op', 'Previsto no quadro de organização e distribuição comparado ao existente. Clique em um posto/graduação em qualquer gráfico para filtrar todas as frações.', UI.stamp(C.atualizacoes.ddqod) + UI.linkPlanilha('ddqod') + UI.exp.btnTela())}
        <div class="dd-filtro">
          <span class="muted">Filtrar por:</span>
          ${tot.map((x) => `<button type="button" class="chip ${sel === x.classe ? 'on' : ''}" data-classe="${x.classe}" aria-pressed="${sel === x.classe}"><i class="sw" style="background:${cores[x.classe]}"></i>${x.classe}</button>`).join('')}
          ${sel ? `<button type="button" class="btn ghost" id="ddLimpar">${ICON('reset')}Limpar filtro</button>` : ''}
        </div>
        <div class="dd-top"><div class="kpis">
          ${UI.kpi('Existente', E, { sub: sel ? `${sel}` : 'todos os círculos' })}
          ${UI.kpi('Previsto', P)}
          ${UI.kpi('Claro', P - E, { tone: P - E > 0 ? 'bad' : '' })}
          ${UI.kpi('Claro %', P ? UI.pct((P - E) / P, 2) : '–', { tone: P - E > 0 ? 'bad' : '', meter: P ? Math.max(0, (P - E) / P) : null })}
        </div>${UI.obsQuadro('ddqod', { titulo: 'Observações', placeholder: 'Ex.: Verificar transferências e movimentações. Sub Ten Mauro na função de CBU do 3º Pel.' })}</div>
        <div class="grid g-3">
          ${UI.panel('1ª Cia Op geral' + (sel ? ` <span class="count">${sel}</span>` : ''), key + UI.barras(totF.map((x) => ({ label: x.classe, valores: [x.previsto, x.existente, x.claro] })), SER, { altura: 240, filtro: 'classe', ativo: sel }))}
          ${UI.panel('1ª Cia Op existente', UI.rosca(tot.map((x) => ({ nome: x.classe, v: x.existente, cor: cores[x.classe] })), { centro: E, sub: sel || 'militares', filtro: 'classe', ativo: sel }) + `<div class="series-key" style="justify-content:center;margin-top:8px">${tot.map((x) => `<span class="${sel && sel !== x.classe ? 'apagado' : ''}"><i style="background:${cores[x.classe]}"></i>${x.classe}${sel === x.classe ? ' (incluído)' : ''} ${UI.pct(x.existente / (Etodos || 1))}</span>`).join('')}</div>`)}
          ${UI.panel('Claros por fração' + (sel ? ` <span class="count">${sel}</span>` : ''), fr.some((g) => g.claro) ? UI.barrasH(fr.filter((g) => g.claro !== 0).sort((a, b) => b.claro - a.claro).map((g) => ({ key: g.chave, label: g.grupo, v: g.claro, cor: g.claro < 0 ? 'var(--info)' : 'var(--red)', title: `${g.existente} de ${g.previsto} previstos` })), { max: Math.max(1, ...fr.map((g) => Math.abs(g.claro))) }) : UI.vazio('Nenhum claro neste filtro.'), { note: 'Valores negativos (azul) indicam excedente em relação ao previsto.' })}
        </div>
        <div class="mini-charts">${fr.map((g) => `<section class="panel"><div class="panel-h"><h3>${UI.esc(g.grupo)}</h3><span class="claro-pct" style="color:${corPct(g.claroPct)}" title="Claro percentual">${pctTxt(g.claroPct)}</span></div>
          <div class="panel-b">${UI.barras(g.linhas.map((l) => ({ label: l.classe, valores: [l.previsto, l.existente, l.claro] })), SER, { altura: 200, largura: 290, filtro: 'classe', ativo: sel })}</div>
          <div class="panel-note">${g.linhas.length ? `Existente ${g.existente} de ${g.previsto} previstos` : `Sem ${UI.esc(sel)} previsto nesta fração`}</div></section>`).join('')}</div>
        <section class="panel cal-panel dd-consol ${qAberto() ? '' : 'fechado'}"><div class="panel-h"><button type="button" class="cal-toggle" id="ddConsol" aria-expanded="${qAberto()}">${ICON('chevron', 'chev')}<h3>Quadro consolidado${sel ? ` <span class="count">${sel}</span>` : ''}</h3></button>${qAberto() ? key : ''}</div><div id="qTbl" ${qAberto() ? '' : 'hidden'}></div></section>
      </div>`;

      UI.table(view.querySelector('#qTbl'), {
        cols: [
          { key: 'grupo', label: 'Fração', cls: 'name', render: (g) => `<b>${UI.esc(g.grupo)}</b>` },
          ...(sel ? [sel] : ORD).map((c) => ({ key: c, label: c + ' (P/E)', cls: 'n', render: (g) => {
            const l = g.linhas.find((x) => x.classe === c);
            return l ? `<span class="num">${l.previsto} / ${l.existente}</span>` : UI.dash('');
          }, nosort: true })),
          { key: 'previsto', label: 'Previsto', cls: 'n' },
          { key: 'existente', label: 'Existente', cls: 'n' },
          { key: 'claro', label: 'Claro', cls: 'n', render: (g) => `<b style="color:${g.claro > 0 ? 'var(--bad)' : g.claro < 0 ? 'var(--info)' : 'inherit'}">${g.claro}</b>` },
          { key: 'claroPct', label: 'Claro %', cls: 'n', render: (g) => pctTxt(g.claroPct), sort: (g) => g.claroPct ?? -9 },
        ],
        rows: fr.map((g) => ({ ...g, id: g.chave })), index: false, compact: true,
      });

      const aplica = (c) => { sel = sel === c ? '' : c; const y = window.scrollY; PAGES.ddqod.render(view); window.scrollTo({ top: y }); };
      view.querySelector('.page').addEventListener('click', (e) => { const t = e.target.closest('[data-classe]'); if (t) aplica(t.dataset.classe); });
      view.querySelectorAll('svg [data-classe]').forEach((t) => t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        aplica(t.dataset.classe);
      } }));
      UI.ligaObs(view, 'ddqod');
      view.querySelector('#ddConsol').onclick = (e) => {
        e.stopPropagation();
        aberto = !qAberto();
        PREFS.marcar('dd-consol', aberto);
        const y = window.scrollY;
        PAGES.ddqod.render(view);
        window.scrollTo({ top: y });
      };
      view.querySelector('#telaPdf').onclick = (e) => { e.stopPropagation(); UI.exp.imprimirTela('DDQOD 1ª Cia Op' + (sel ? ' – ' + sel : '')); };
      const l = view.querySelector('#ddLimpar'); if (l) l.onclick = (e) => { e.stopPropagation(); sel = ''; PAGES.ddqod.render(view); };
    },
  };
})();
