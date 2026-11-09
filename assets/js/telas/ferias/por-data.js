/* ==========================================================================
   TELA › FÉRIAS POR DATA (#ferias-data)
   Calendário retrátil do mês (1 dia, vários dias ou mês inteiro), % de FA/FP
   sobre o efetivo dos quadros da sede, quadros por fração, observações,
   tabela dos períodos e gráfico por OBM.
   ========================================================================== */
(function () {
  const { tabs, corDe, FC, tomPct, ehCmt, periodo, escondeDica, mostraDica } = FER;
  const est = FER.estado;
  /* Férias por data — calendário retrátil, quadros por fração (modelo do Data Studio) e % de FA/FP no dia */
  const fd = { ano: null, mes: null, cal: null, sel: null, varios: false, ultimoClique: null, tipo: '' };
  // painéis recolhíveis de Férias por data (o painel lembra a escolha neste navegador)
  const aberto = (k) => { if (fd['ab_' + k] == null) fd['ab_' + k] = PREFS.ligado('fd-' + k, true); return fd['ab_' + k]; };
  const tipoOk = (f) => !fd.tipo || f.tipo === fd.tipo;   // filtro FA / FP / todas
  // calendário aberto/recolhido (lembrado no navegador)
  const calAberto = () => { if (fd.cal == null) fd.cal = PREFS.ligado('fd-cal', true); return fd.cal; };
  // situação de um dia: quem está de férias, em qual quadro, e o % sobre o efetivo dos quadros da sede
  function grupo(lista) {
    const Q = APP_CONFIG.obms.quadrosGeral;
    const fs = lista.map((f) => ({ ...f, m: DS.militar(f.militar) })).filter((f) => f.m);
    const cmt = fs.filter((f) => ehCmt(f, f.m)), op = fs.filter((f) => !ehCmt(f, f.m));
    return { fs, cmt, op, sede: op.filter((f) => Q.includes(f.m.obm)), demais: op.filter((f) => !Q.includes(f.m.obm)) };
  }
  // vários dias: férias que tocam qualquer um dos dias; mês: férias que tocam o mês
  const feriasNosDias = (dias) => grupo(DS.ferias().filter((f) => tipoOk(f) && dias.some((k) => f.inicio <= k && f.fim >= k)));
  // férias que tocam algum dia do mês
  const feriasNoMes = (ano, mes) => {
    const a = DS.iso(new Date(ano, mes, 1)), b = DS.iso(new Date(ano, mes + 1, 0));
    return grupo(DS.ferias().filter((f) => tipoOk(f) && f.inicio <= b && f.fim >= a));
  };
  // um período por militar (o primeiro)
  const unicos = (ls) => {
    const vistos = new Set();
    return ls.slice().sort((a, b) => a.inicio.localeCompare(b.inicio)).filter((f) => !vistos.has(f.militar) && vistos.add(f.militar));
  };
  // quem está de férias no dia, em qual quadro, e o % sobre o efetivo dos quadros da sede
  function diaFerias(d) {
    const Q = APP_CONFIG.obms.quadrosGeral;
    const fs = DS.feriasEm(d).filter(tipoOk).map((f) => ({ ...f, m: DS.militar(f.militar) })).filter((f) => f.m);
    const cmt = fs.filter((f) => ehCmt(f, f.m));
    const op = fs.filter((f) => !ehCmt(f, f.m));
    // cada militar conta uma vez (dois períodos no mesmo dia, ex.: FA e FP lançadas juntas, não somam 2)
    const sede = unicos(op.filter((f) => Q.includes(f.m.obm)));
    // efetivo dos quadros, sem quem só entra no quadro CMT Pelotão/ADM (ex.: oficiais do CIAD/COBOM)
    const efetivo = DS.militares().filter((m) => Q.includes(m.obm) && !ehCmt({}, m)).length;
    return { fs, cmt, op, sede, demais: op.filter((f) => !Q.includes(f.m.obm)), efetivo, pct: efetivo ? sede.length / efetivo : 0 };
  }

  PAGES['ferias-data'] = {
    title: 'Férias por data',
    render(view) {
      if (!est.dataSel) est.dataSel = DS.hoje();
      // se a data escolhida mudou, o calendário vai para o mês dela
      if (fd.ano == null || fd.ultimo !== DS.iso(est.dataSel)) {
        fd.ano = est.dataSel.getFullYear();
        fd.mes = est.dataSel.getMonth();
        fd.ultimo = DS.iso(est.dataSel);
        fd.sel = new Set([DS.iso(est.dataSel)]);
      }
      const C = APP_CONFIG, hIso = DS.iso(DS.hoje());
      // seleção: 1 dia (com % e quantidade), vários dias (Ctrl+clique) ou nenhum (mês inteiro)
      const dias = [...fd.sel].sort();
      const modo = dias.length === 1 ? 'dia' : dias.length ? 'dias' : 'mes';
      if (modo === 'dia') est.dataSel = DS.parse(dias[0]);
      const isoSel = modo === 'dia' ? dias[0] : '';
      const x = modo === 'dia' ? diaFerias(est.dataSel) : modo === 'dias' ? feriasNosDias(dias) : feriasNoMes(fd.ano, fd.mes);
      const tom = modo === 'dia' ? tomPct(x.pct) : '', estoura = modo === 'dia' && x.sede.length > FC().maxBM;
      const nomeMes = `${UI.MESES[fd.mes]} ${fd.ano}`;
      const listaDias = dias.slice(0, 6).map((k) => UI.dm(k)).join(', ') + (dias.length > 6 ? '…' : '');
      const selTxt = modo === 'dia' ? `${UI.SEM[est.dataSel.getDay()]}, ${UI.data(est.dataSel)}` : modo === 'dias' ? `${dias.length} dias selecionados` : `Mês inteiro: ${nomeMes}`;
      const ate = modo === 'dia' ? `em ${UI.data(est.dataSel)}` : modo === 'dias' ? `em algum dos ${dias.length} dias selecionados` : `em ${nomeMes.toLowerCase()}`;
      const nMil = (ls) => new Set(ls.map((f) => f.militar)).size;
      const tipoTxt = fd.tipo || 'FA e FP';
      const tiposFer = [...new Set(DS.ferias().map((f) => f.tipo).filter(Boolean))].sort();
      const filtroTipo = `<div class="seg fd-tipo" role="group" aria-label="Tipo de férias">${[['', 'Todas'], ...tiposFer.map((t) => [t, t])].map(([k, t]) => `<button type="button" data-ftipo="${UI.esc(k)}" aria-pressed="${fd.tipo === k}" title="${k === 'FA' ? 'Férias anuais' : k === 'FP' ? 'Férias-prêmio' : k ? UI.esc(k) : 'FA e FP'}">${UI.esc(t)}</button>`).join('')}</div>`;

      // calendário do mês com o nº de militares de férias (FA/FP dos quadros) em cada dia
      const n = new Date(fd.ano, fd.mes + 1, 0).getDate(), pad0 = new Date(fd.ano, fd.mes, 1).getDay();
      const fer = new Map(DS.feriados(fd.ano).map((f) => [f.data, f.nome]));
      // feriado(s) do(s) dia(s) clicado(s) — aparece discretamente abaixo do calendário
      const ferSel = dias.map((k) => {
        const nm = (DS.feriados(+k.slice(0, 4)).find((f) => f.data === k) || {}).nome;
        return nm ? (dias.length > 1 ? `${UI.dm(k)} – ${nm}` : nm) : '';
      }).filter(Boolean);
      const ferTxt = ferSel.length ? `<p class="fd-feriado">Feriado: ${ferSel.map((x) => UI.esc(x)).join(' · ')}</p>` : '';
      let cells = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((w) => `<span class="mcal-wd">${w}</span>`).join('');
      for (let i = 0; i < pad0; i++) cells += '<span class="cd-blank"></span>';
      for (let d = 1; d <= n; d++) {
        const dt = new Date(fd.ano, fd.mes, d), k = DS.iso(dt), p = DS.pelotaoDoDia(dt), h = fer.get(k), y = diaFerias(dt);
        cells += `<button type="button" class="cd pc${p} ${k === hIso ? 'today' : ''} ${h ? 'hol' : ''}" data-dia="${k}" aria-pressed="${fd.sel.has(k)}"
          title="${UI.SEM_L[dt.getDay()]}, ${UI.data(dt)} – ${p}º Pel – ${y.sede.length} de férias (${UI.pct(y.pct, 1)})${h ? ' – ' + UI.esc(h) : ''}">
          <span class="cd-n">${d}</span>${y.sede.length ? `<span class="cd-f t-${tomPct(y.pct)}">${y.sede.length}</span>` : ''}<span class="cd-p">${p}º<span class="full"> Pel</span></span></button>`;
      }

      // quadros: pelotões e alas, COBOM/PBRESC ao lado, CMT Pelotão/ADM e demais OBMs
      // quadros no mesmo padrão de "Férias por período": borda na cor do pelotão, nome e período logo abaixo
      const linhas = (ls) => (ls.length ? ls.sort((a, b) => (DS.RANK[a.m.posto] ?? 99) - (DS.RANK[b.m.posto] ?? 99) || a.m.nomeGuerra.localeCompare(b.m.nomeGuerra)).map((f, i) => `<li><button type="button" data-fer="${f.id}" aria-label="${UI.esc(`${DS.guerra(f.m)}: ${f.tipo} de ${UI.data(f.inicio)} a ${UI.data(f.fim)}`)}"><span class="i">${i + 1}.</span><span class="nm">${UI.esc(DS.guerra(f.m))}${f._obm ? ` <small class="muted">${UI.esc(f._obm)}</small>` : ''}</span><span class="cr fp-datas">${UI.dm(f.inicio)}–${UI.dm(f.fim)} · <b class="fd-t">${UI.esc(f.tipo)}</b></span></button></li>`).join('') : '<li class="muted fd-vazio">Ninguém de férias</li>');
      const card = (nome, ls, extra = '') => {
        const cor = extra ? 0 : corDe(nome);
        return `<section class="roster fd-q ${ls.length ? 'tem' : ''} ${cor ? 'pc' + cor : ''} ${extra}"><div class="roster-h"><h4>${cor ? UI.pelChip(cor, nome) : UI.esc(nome)}</h4><span class="n">${ls.length}</span></div><ul>${linhas(ls)}</ul></section>`;
      };
      const Q = C.obms.quadrosGeral, LADO = C.obms.quadrosLado || ['CIAD/COBOM', 'PBRESC'];
      const doQ = (o) => unicos(x.sede.filter((f) => f.m.obm === o));

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Férias por data', 'Selecione um dia no calendário para ver quem está de férias em cada fração e o percentual de FA/FP do efetivo dos quadros da sede.', UI.linkPlanilha('ferias'))}
        ${tabs('ferias-data')}
        <div class="fd-topo ${calAberto() ? '' : 'fechado'}">
        <section class="panel cal-panel fd-cal ${calAberto() ? '' : 'fechado'}">
          <div class="panel-h">
            <button type="button" class="cal-toggle" id="fdCal" aria-expanded="${calAberto()}">${ICON('chevron', 'chev')}<h3>Calendário</h3></button>
            ${filtroTipo}
            ${calAberto() ? `<div class="month-nav"><button class="icon-btn" id="fdPrev" type="button" aria-label="Mês anterior">${ICON('chevronL')}</button><strong>${UI.MESES[fd.mes]} ${fd.ano}</strong><button class="icon-btn" id="fdNext" type="button" aria-label="Próximo mês">${ICON('chevron')}</button><button class="btn ghost" id="fdHoje" type="button">Hoje</button></div>`
              : `<div class="cal-resumo"><span>${selTxt}</span>${modo === 'dia' ? UI.pelChip(DS.pelotaoDoDia(est.dataSel)) : modo === 'dias' ? `<span class="muted">${listaDias}</span>` : ''}${ferSel.length && modo === 'dia' ? `<span class="fd-feriado-r">${UI.esc(ferSel[0])}</span>` : ''}</div>`}
            <input class="input fd-input" type="date" id="fdData" value="${isoSel}" aria-label="Escolher data">
          </div>
          <div class="panel-b" ${calAberto() ? '' : 'hidden'}><div class="cal-wrap"><div class="mcal"><div class="mcal-grid">${cells}</div><div class="fd-leg"><span><i class="lg t-ok"></i>&lt; ${UI.pct(FC().limites.verde, 0)}</span><span><i class="lg t-warn"></i>${UI.pct(FC().limites.verde, 0)} a ${UI.pct(FC().limites.vermelho, 0)}</span><span><i class="lg t-bad"></i>&gt; ${UI.pct(FC().limites.vermelho, 0)}</span><span class="muted">número = militares de férias nos quadros da sede (sem CMT/ADM)</span></div>${ferTxt}
              <div class="fd-selbar"><button type="button" class="btn ghost ${fd.varios ? 'on' : ''}" id="fdVarios" aria-pressed="${fd.varios}" title="No celular: toque nos dias para somar à seleção">${fd.varios ? '✓ ' : ''}Vários dias</button><button type="button" class="btn ghost" id="fdMes" ${modo === 'mes' ? 'disabled' : ''}>Mês inteiro</button>
              <span class="muted">Ctrl+clique: vários dias · Shift+clique: intervalo · clique no dia selecionado: mês inteiro</span></div></div>
            </div></div>
        </section>

        <div class="fd-dir">
        <div class="fd-status">
          ${modo === 'dia' ? `
          <div class="fs-i"><small>Data selecionada</small><b>${selTxt}</b><span class="muted">${DS.pelotaoDoDia(est.dataSel)}º Pel de serviço</span></div>
          <div class="fs-i ${estoura ? 'bad' : ''}"><small>Total ${tipoTxt}</small><b class="num">${x.sede.length}</b><span class="muted">limite ${FC().maxBM} BM${estoura ? ' – ultrapassado' : ''}</span></div>
          <div class="fs-i pct t-${tom}"><small>% ${tipoTxt}</small><b class="num">${UI.pct(x.pct, 1)}</b><span>de ${x.efetivo} militares dos quadros</span></div>` : `
          <div class="fs-i"><small>${modo === 'dias' ? 'Dias selecionados' : 'Período'}</small><b>${modo === 'dias' ? dias.length + ' dias' : nomeMes}</b><span class="muted">${modo === 'dias' ? listaDias : 'nenhum dia selecionado'}</span></div>
          <div class="fs-i"><small>Militares de férias nos quadros</small><b class="num">${nMil(x.sede)}</b><span class="muted">${modo === 'dias' ? 'em algum dos dias' : 'em algum dia do mês'}</span></div>
          <div class="fs-i pct neutro"><small>% ${tipoTxt}</small><b>–</b><span>selecione um único dia</span></div>`}
          <div class="fs-i"><small>CMT Pelotão/ADM</small><b class="num">${nMil(x.cmt)}</b><span class="muted">não concorrem</span></div>
          <div class="fs-i"><small>Demais OBMs</small><b class="num">${nMil(x.demais)}</b><span class="muted">destacamentos</span></div>
        </div>
        ${UI.obsQuadro('ferias', { titulo: 'Observações', placeholder: 'Ex.: O número de militares em gozo de férias não pode ultrapassar 11 BM. As férias de CMT Pelotão/ADM não concorrem com as FA/FP operacionais. CMT do 6º e do 7º Pel não tiram FA/FP juntos.' })}
        </div></div>

        <div class="fd-grid fp-grid">
          <div class="rosters sede fd-quadros fp-rosters">
            <div class="r-main">${Q.filter((o) => !LADO.includes(o)).map((o) => card(o, doQ(o))).join('')}</div>
            <div class="r-side">${Q.filter((o) => LADO.includes(o)).map((o) => card(o, doQ(o))).join('')}</div>
          </div>
          <div class="fd-lado fp-rosters">
            ${card('CMT Pelotão/ADM', unicos(x.cmt).map((f) => ({ ...f, _obm: f.m.obm })), 'cmt')}
            ${x.demais.length ? card('Demais OBMs', unicos(x.demais).map((f) => ({ ...f, _obm: f.m.obm })), 'demais') : ''}
          </div>
        </div>

        <section class="panel cal-panel ${aberto('tab') ? '' : 'fechado'}"><div class="panel-h"><button type="button" class="cal-toggle" data-recolhe="tab" aria-expanded="${aberto('tab')}">${ICON('chevron', 'chev')}<h3>Períodos de férias ${ate} <span class="count">${x.fs.length}</span></h3></button></div><div id="fdTbl" ${aberto('tab') ? '' : 'hidden'}></div></section>
        ${(() => { const porObm = DS.obms().map((o) => ({ o, n: nMil(x.fs.filter((f) => f.m.obm === o)), ef: DS.militares().filter((m) => m.obm === o).length })).filter((r) => r.n);
          return `<section class="panel cal-panel ${aberto('obm') ? '' : 'fechado'}"><div class="panel-h"><button type="button" class="cal-toggle" data-recolhe="obm" aria-expanded="${aberto('obm')}">${ICON('chevron', 'chev')}<h3>Militares de férias por OBM <span class="count">${porObm.reduce((a, r) => a + r.n, 0)}</span></h3></button></div>
            <div class="panel-b" ${aberto('obm') ? '' : 'hidden'}>${porObm.length ? UI.barrasH(porObm.map((r) => ({ key: r.o, label: r.o, v: r.n, title: `${r.n} de ${r.ef}` })), { max: Math.max(3, ...porObm.map((r) => r.n)) }) : UI.vazio('Ninguém de férias.')}<p class="muted" style="font-size:12px;margin:8px 0 0">Passe o cursor para ver o efetivo da OBM.</p></div></section>`; })()}
      </div>`;

      UI.table(view.querySelector('#fdTbl'), {
        cols: [
          { key: 'obm', label: 'OBM', render: (f) => UI.obm(f.m.obm), sort: (f) => DS.ordem(f.m.obm) },
          { key: 'bm', label: 'Nº BM', render: (f) => `<span class="num">${UI.esc(f.m.nBM)}</span>`, sort: (f) => f.m.nBM },
          { key: 'nome', label: 'Nome de guerra', cls: 'name', render: (f) => `<b>${UI.esc(DS.guerra(f.m))}</b>`, sort: (f) => f.m.nomeGuerra },
          { key: 'periodo', label: 'Período', cls: 'c', render: (f) => UI.esc(f.periodoTxt || (f.periodo ? f.periodo + 'º' : '–')) },
          { key: 'dias', label: 'Dias', cls: 'n' },
          { key: 'inicio', label: 'Início', render: (f) => `<span class="num">${UI.data(f.inicio)}</span>` },
          { key: 'fim', label: 'Final', render: (f) => `<span class="num">${UI.data(f.fim)}</span>` },
          { key: 'exercicio', label: 'Exercício', cls: 'c' },
          { key: 'abono', label: 'Abono', cls: 'c', render: (f) => (f.abono ? 'Sim' : 'Não') },
          { key: 'tipo', label: 'Tipo', cls: 'c', render: (f) => UI.chip(f.tipo, f.tipo === 'FP' ? 'gold' : '') },
          { key: 'conta', label: 'Conta no %', cls: 'c', render: (f) => (ehCmt(f, f.m) ? '<span class="muted">CMT/ADM</span>' : C.obms.quadrosGeral.includes(f.m.obm) ? 'Sim' : '<span class="muted">Destac.</span>'), sort: (f) => (ehCmt(f, f.m) ? 2 : C.obms.quadrosGeral.includes(f.m.obm) ? 0 : 1) },
        ], rows: x.fs, compact: true, sort: 'obm', empty: 'Ninguém de férias na seleção.', onRow: (id) => periodo(x.fs.find((f) => f.id === id), modo === 'dia' ? est.dataSel : null),
      });
      UI.ligaObs(view, 'ferias');
      view.querySelectorAll('[data-fer]').forEach((b) => (b.onclick = () => {
        escondeDica();
        periodo(x.fs.find((f) => f.id === b.dataset.fer), modo === 'dia' ? est.dataSel : null);
      }));
      // popup flutuante ao passar o mouse (ou focar com o teclado) sobre o militar
      view.querySelectorAll('.fd-q [data-fer]').forEach((b) => {
        const f = x.fs.find((y) => y.id === b.dataset.fer); if (!f) return;
        const abre = () => mostraDica(b, f, modo === 'dia' ? est.dataSel : null);
        b.addEventListener('mouseenter', abre); b.addEventListener('focus', abre);
        b.addEventListener('mouseleave', escondeDica); b.addEventListener('blur', escondeDica);
      });
      const rer = () => { const y = window.scrollY; PAGES['ferias-data'].render(view); window.scrollTo({ top: y }); };
      const escolhe = (d) => {
        est.dataSel = d;
        fd.ano = d.getFullYear();
        fd.mes = d.getMonth();
        fd.ultimo = DS.iso(d);
        fd.sel = new Set([DS.iso(d)]);
        fd.ultimoClique = DS.iso(d);
        rer();
      };
      const clicaDia = (k, e) => {
        if (e.shiftKey && fd.ultimoClique) {           // intervalo
          let a = DS.parse(fd.ultimoClique), b = DS.parse(k); if (a > b) [a, b] = [b, a];
          for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) fd.sel.add(DS.iso(d));
        } else if (e.ctrlKey || e.metaKey || fd.varios) { // soma / tira o dia
          if (fd.sel.has(k)) fd.sel.delete(k); else fd.sel.add(k);
        } else if (fd.sel.size === 1 && fd.sel.has(k)) {  // clicou no dia já selecionado: mês inteiro
          fd.sel = new Set();
        } else fd.sel = new Set([k]);
        fd.ultimoClique = k;
        if (fd.sel.size === 1) { est.dataSel = DS.parse([...fd.sel][0]); fd.ultimo = DS.iso(est.dataSel); }
        rer();
      };
      view.querySelectorAll('[data-recolhe]').forEach((b) => (b.onclick = () => {
        const k = b.dataset.recolhe;
        fd['ab_' + k] = !aberto(k);
        PREFS.marcar('fd-' + k, fd['ab_' + k]);
        rer();
      }));
      view.querySelectorAll('[data-ftipo]').forEach((b) => (b.onclick = () => { fd.tipo = b.dataset.ftipo; rer(); }));
      view.querySelector('#fdCal').onclick = () => { fd.cal = !calAberto(); PREFS.marcar('fd-cal', fd.cal); rer(); };
      view.querySelector('#fdData').onchange = (e) => { if (e.target.value) escolhe(DS.parse(e.target.value)); };
      if (calAberto()) {
        const muda = (k) => { const d = new Date(fd.ano, fd.mes + k, 1); fd.ano = d.getFullYear(); fd.mes = d.getMonth(); rer(); };
        view.querySelector('#fdPrev').onclick = () => muda(-1);
        view.querySelector('#fdNext').onclick = () => muda(1);
        view.querySelector('#fdHoje').onclick = () => escolhe(DS.hoje());
        view.querySelector('.fd-cal .mcal-grid').addEventListener('click', (e) => {
          const b = e.target.closest('[data-dia]');
          if (b) clicaDia(b.dataset.dia, e);
        });
        view.querySelector('.fd-cal .mcal-grid').addEventListener('mousedown', (e) => { if (e.shiftKey) e.preventDefault(); }); // evita selecionar texto no Shift+clique
        view.querySelector('#fdVarios').onclick = () => { fd.varios = !fd.varios; rer(); };
        view.querySelector('#fdMes').onclick = () => { fd.sel = new Set(); rer(); };
      }
    },
  };
})();
