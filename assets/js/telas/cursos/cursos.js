/* ==========================================================================
   TELA › CURSOS OPERACIONAIS (#cursos)
   Vários cursos ao mesmo tempo ("ou" / "e"), gráfico por curso e lista exportável.
   ========================================================================== */
(function () {
  const { C, base, filtrosTxt, filtrosBase, bindBase, n, colsBase } = CUR;
  /* ---------------- Cursos operacionais ----------------
     Vários cursos ao mesmo tempo: "ou" = tem pelo menos um dos marcados; "e" = tem todos. */
  const sc = { obm: [], posto: [], q: '', cursos: [], modo: 'ou', aberto: false };
  PAGES.cursos = {
    title: 'Cursos operacionais',
    render(view) {
      const cursos = DS.cursos();
      const nomeCurso = (s) => (cursos.find((c) => c.sigla === s) || {}).nome || s;
      sc.cursos = sc.cursos.filter((c) => cursos.some((x) => x.sigla === c));
      const marcados = new Set(sc.cursos);
      const atende = (m) => !marcados.size || (sc.modo === 'e' ? sc.cursos.every((c) => m.cursos.includes(c)) : m.cursos.some((c) => marcados.has(c)));
      const universo = DS.militares().filter((m) => base(sc, m));
      const rows = DS.ordenar(universo.filter(atende));
      const porCurso = cursos.map((c) => ({ key: c.sigla, label: c.sigla, title: c.nome, v: universo.filter((m) => m.cursos.includes(c.sigla)).length })).sort((a, b) => b.v - a.v);
      const comAlgum = universo.filter((m) => m.cursos.length).length;
      const resumo = sc.cursos.join(sc.modo === 'e' ? ' e ' : ' ou ');

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Cursos operacionais', 'Qualificações registradas por militar. Marque um ou mais cursos para listar quem tem qualquer um deles.', UI.stamp(C.atualizacoes.cursos))}
        <div class="filters">${filtrosBase(sc, 'c')}
          <div class="field grow"><span class="lbl" id="cCursoLbl">Cursos</span>
            <details class="multi" id="cMulti" ${sc.aberto ? 'open' : ''}>
              <summary class="select" aria-labelledby="cCursoLbl">${!sc.cursos.length ? 'Todos os cursos' : sc.cursos.length <= 3 ? `${sc.cursos.length} curso(s): ${UI.esc(sc.cursos.join(', '))}` : `${sc.cursos.length} cursos marcados`}</summary>
              <div class="multi-pop">
                <input class="input" id="cBuscaCurso" type="search" placeholder="Procurar curso" autocomplete="off">
                <div class="multi-list">${cursos.map((c) => `<label data-txt="${UI.esc(n(c.sigla + ' ' + c.nome))}"><input type="checkbox" value="${UI.esc(c.sigla)}" ${marcados.has(c.sigla) ? 'checked' : ''}><b>${UI.esc(c.sigla)}</b><span class="muted">${UI.esc(c.nome !== c.sigla ? c.nome : '')}</span></label>`).join('')}</div>
                <div class="multi-foot"><span class="btn-row"><button class="btn ghost" type="button" id="cNenhum">Todos</button><button class="btn ghost" type="button" id="cInverte" title="Marca todos os cursos, exceto os que estão marcados agora" ${sc.cursos.length ? '' : 'disabled'}>Inverter seleção</button></span><button class="btn" type="button" id="cFechar">Pronto</button></div>
              </div>
            </details>
          </div>
          <div class="field"><label for="cModo">Combinação</label><select class="select" id="cModo"><option value="ou" ${sc.modo === 'ou' ? 'selected' : ''}>Tem algum (ou)</option><option value="e" ${sc.modo === 'e' ? 'selected' : ''}>Tem todos (e)</option></select></div>
          ${UI.btnLimpar('cLimpar')}
        </div>
        ${sc.cursos.length ? `<div class="chips sel-chips">${sc.cursos.map((c) => `<button type="button" class="chip info" data-tira="${UI.esc(c)}" title="Remover ${UI.esc(nomeCurso(c))}">${UI.esc(c)} ✕</button>`).join(`<span class="muted op">${sc.modo}</span>`)}</div>` : ''}
        <div class="kpis">
          ${UI.kpi(sc.cursos.length ? 'BM com os cursos marcados' : 'BM listados', rows.length, { sub: sc.cursos.length ? UI.esc(resumo) : 'no filtro atual' })}
          ${UI.kpi('Com ao menos um curso', comAlgum, { sub: UI.pct(comAlgum / (universo.length || 1)) + ' do filtro', meter: comAlgum / (universo.length || 1) })}
          ${UI.kpi('Sem curso registrado', universo.length - comAlgum, { tone: 'warn' })}
          ${UI.kpi('Média de cursos', UI.num(universo.reduce((s, m) => s + m.cursos.length, 0) / (universo.length || 1), 1), { sub: 'por militar' })}
        </div>
        <div class="grid g-side">
          <section class="panel"><div class="panel-h"><h3>Militares <span class="count">${rows.length}</span></h3>${UI.exp.btnLista('cTbl')}</div><div id="cTbl"></div></section>
          ${UI.panel('Militares por curso', UI.barrasHMulti(porCurso, marcados), { note: 'Toque para marcar ou desmarcar. Considera os filtros de OBM, posto e nome.' })}
        </div>
      </div>`;

      UI.table(view.querySelector('#cTbl'), {
        cols: [...colsBase, { key: 'cursos', label: 'Cursos de qualificação', full: true, sort: (m) => -m.cursos.length,
          render: (m) => m.cursos.length ? `<div class="chips">${m.cursos.map((c) => `<button type="button" class="chip course ${marcados.has(c) ? 'on' : ''}" data-curso="${UI.esc(c)}" title="${UI.esc(nomeCurso(c))}">${UI.esc(c)}</button>`).join('')}</div>` : UI.dash('') }],
        rows, maxH: true, empty: 'Nenhum militar com essa combinação de cursos.',
      });

      const rer = () => PAGES.cursos.render(view);
      UI.exp.ligaLista(view, () => ({ titulo: 'Cursos operacionais', filtros: filtrosTxt(sc, sc.cursos.length ? ['Cursos: ' + sc.cursos.join(sc.modo === 'e' ? ' e ' : ' ou ')] : []) }));
      const alterna = (k) => { sc.cursos = marcados.has(k) ? sc.cursos.filter((c) => c !== k) : sc.cursos.concat(k); rer(); };
      bindBase(view, sc, 'c', rer);
      const multi = view.querySelector('#cMulti');
      multi.addEventListener('toggle', () => {
        sc.aberto = multi.open;
        if (multi.open) view.querySelector('#cBuscaCurso').focus({ preventScroll: true });
      });
      multi.querySelectorAll('input[type=checkbox]').forEach((cb) => cb.addEventListener('change', () => {
        const lista = multi.querySelector('.multi-list'), sy = lista.scrollTop, busca = view.querySelector('#cBuscaCurso').value;
        sc.cursos = [...multi.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value); sc.aberto = true; rer();
        const nl = view.querySelector('#cMulti .multi-list'); nl.scrollTop = sy;
        const nb = view.querySelector('#cBuscaCurso'); nb.value = busca; nb.dispatchEvent(new Event('input'));
      }));
      view.querySelector('#cBuscaCurso').addEventListener('input', (e) => {
        const t = n(e.target.value);
        multi.querySelectorAll('.multi-list label').forEach((l) => { l.hidden = !!t && !l.dataset.txt.includes(t); });
      });
      view.querySelector('#cNenhum').onclick = () => { sc.cursos = []; sc.aberto = true; rer(); };
      // inverte a marcação: todos os cursos menos os marcados
      view.querySelector('#cInverte').onclick = () => { sc.cursos = cursos.map((c) => c.sigla).filter((c) => !marcados.has(c)); sc.aberto = true; rer(); };
      view.querySelector('#cFechar').onclick = () => { sc.aberto = false; multi.open = false; };
      view.querySelector('#cModo').onchange = (e) => { sc.modo = e.target.value; rer(); };
      view.querySelector('#cLimpar').onclick = () => {
        Object.assign(sc, { obm: [], posto: [], q: '', cursos: [], modo: 'ou', aberto: false, _aberto: null });
        rer();
      };
      view.querySelector('.page').addEventListener('click', (e) => {
        if (sc.aberto && !e.target.closest('#cMulti')) { sc.aberto = false; multi.open = false; }
        const t = e.target.closest('[data-tira]'); if (t) { alterna(t.dataset.tira); return; }
        const b = e.target.closest('[data-curso],.bar-h.click'); if (b) alterna(b.dataset.curso || b.dataset.key);
      });
      view.querySelectorAll('.bar-h.click').forEach((b) => b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        b.click();
      } }));
    },
  };

})();
