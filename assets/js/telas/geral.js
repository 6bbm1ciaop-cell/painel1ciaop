/* ==========================================================================
   TELA › GERAL (#geral)
   Calendário de serviço do mês (retrátil), quadros das frações com
   disponíveis/efetivo e ficha do militar com foto.
   Fonte: planilha "Respostas" › "Respostas ao formulário 1"
   (NOME DE GUERRA com posto, CREDENCIADO EM, FOTO).
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const st = { ano: null, mes: null, dia: null, obm: '', escopo: 'quadros', sel: null, cal: null };
  // calendário retrátil: estado lembrado neste navegador
  const calAberto = () => { if (st.cal == null) st.cal = PREFS.ligado('geral-cal', true); return st.cal; };
  // quadros da coluna da direita (config.js → obms.quadrosLado)
  const LADO = () => C.obms.quadrosLado || ['CIAD/COBOM', 'PBRESC'];

  // categoria de credenciamento em destaque
  const cred = (m) => (m.credenciado && m.credenciado !== '-' ? `<b>${UI.esc(m.credenciado)}</b>` : '–');

  /* ficha mostrada ao clicar no militar (painel lateral ou janela no celular) */
  function ficha(m) {
    if (!m) return UI.vazio('Toque em um militar para ver a foto e os dados.');
    const hoje = DS.hoje();
    const ferias = DS.feriasEm(hoje).find((f) => f.militar === m.id);
    const emb = m.embarcacao;
    return `<div class="fg">
      ${UI.fotoBox(m, 'big')}
      <div class="fg-name">${UI.esc(DS.guerra(m))}</div>
      <div class="mil-sub">${UI.esc(m.nome)}</div>
      <div class="chips">${UI.obm(m.obm)}${ferias ? UI.chip('De férias até ' + UI.dm(ferias.fim), 'warn') : ''}</div>
      <dl class="kv">
        <dt>Número de BM</dt><dd class="num">${UI.dash(m.nBM)}</dd>
        <dt>Posto/graduação</dt><dd>${UI.dash(m.posto)}</dd>
        <dt>Credenciado em</dt><dd>${m.credenciado && m.credenciado !== '-' ? UI.esc(m.credenciado) : 'Não credenciado'}</dd>
        <dt>Condutor de embarcação</dt><dd>${emb ? `Sim${emb.hab && emb.hab !== 'Habilitado' ? ' – ' + UI.esc(emb.hab) : ''}` : 'Não'}</dd>
        <dt>Cursos</dt><dd>${m.cursos.length ? `<div class="chips">${m.cursos.map((c) => UI.chip(c, 'course')).join('')}</div>` : UI.dash('')}</dd>
        <dt>Tipo sanguíneo</dt><dd>${UI.dash(m.tipoSanguineo)}</dd>
        <dt>Celular</dt><dd class="num">${UI.dash(m.contato.celular)}</dd>
      </dl>
      <button class="btn" type="button" data-open-ficha="${UI.esc(m.id)}">${ICON('id')}Ver dados completos</button>
    </div>`;
  }

  // calendário do mês com o pelotão de cada dia
  function calendario(diaSel) {
    const hoje = DS.iso(DS.hoje());
    const fer = new Map(DS.feriados(st.ano).map((f) => [f.data, f.nome]));
    const n = new Date(st.ano, st.mes + 1, 0).getDate();
    const pad0 = new Date(st.ano, st.mes, 1).getDay();
    let cells = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((w) => `<span class="mcal-wd">${w}</span>`).join('');
    for (let i = 0; i < pad0; i++) cells += '<span class="cd-blank"></span>';
    for (let d = 1; d <= n; d++) {
      const dt = new Date(st.ano, st.mes, d), k = DS.iso(dt), p = DS.pelotaoDoDia(dt), h = fer.get(k);
      cells += `<button type="button" class="cd pc${p} ${k === hoje ? 'today' : ''} ${h ? 'hol' : ''}" data-dia="${k}" aria-pressed="${k === diaSel}"
        aria-label="${d} de ${UI.MESES[st.mes].toLowerCase()}, ${p}º Pel de serviço${h ? ', ' + UI.esc(h) : ''}" title="${UI.SEM_L[dt.getDay()]}, ${UI.data(dt)}${h ? ' – ' + UI.esc(h) : ''}">
        <span class="cd-n">${d}</span><span class="cd-p">${p}º<span class="full"> Pel</span></span></button>`;
    }
    return `<div class="mcal"><div class="mcal-grid">${cells}</div></div>`;
  }

  // dia escolhido, pelotão de serviço e férias do dia
  function ladoDoCalendario(dia) {
    const d = DS.parse(dia), p = DS.pelotaoDoDia(d);
    const prox = [1, 2, 3].map((i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
    const fer = DS.feriados(st.ano).filter((f) => DS.parse(f.data).getMonth() === st.mes);
    const nFerias = DS.ligada('ferias') ? DS.feriasEm(d).length : null;
    return `<div class="cal-side">
      <div class="dia-sel">
        <span class="d1">${dia === DS.iso(DS.hoje()) ? 'Hoje' : 'Dia selecionado'}</span>
        <span class="d2">${UI.SEM_L[d.getDay()]}, ${d.getDate()} de ${UI.MESES[d.getMonth()].toLowerCase()}</span>
        <div class="duty-line"><span class="big-pel pc${p}">${p}º PEL</span><span class="muted">de serviço a partir das ${UI.pad(C.escala.trocaHora)}h${UI.pad(C.escala.trocaMinuto || 0)}</span></div>
        ${nFerias != null ? `<span class="muted">${nFerias} militar(es) de férias neste dia</span>` : ''}
      </div>
      <div><h4>Próximos dias</h4><div class="next-list">${prox.map((x) => `<div><span>${UI.SEM[x.getDay()]} ${UI.dm(x)}</span>${UI.pelChip(DS.pelotaoDoDia(x))}</div>`).join('')}</div></div>
      ${fer.length ? `<div><h4>Feriados do mês</h4><div class="hol-list">${fer.map((f) => `<div><b>${UI.dm(f.data)}</b>${UI.esc(f.nome)}</div>`).join('')}</div></div>` : ''}
    </div>`;
  }

  PAGES.geral = {
    title: 'Dados gerais',
    render(view) {
      const hoje = DS.hoje();
      if (st.ano == null) { st.ano = hoje.getFullYear(); st.mes = hoje.getMonth(); st.dia = DS.iso(hoje); }
      const diaD = DS.parse(st.dia);
      const pelDia = DS.pelotaoDoDia(diaD);
      const emFerias = new Set(DS.feriasEm(diaD).map((f) => f.militar));
      const emTransito = new Set(DS.feriasEm(diaD).filter((f) => /TR[AÂ]NSITO/i.test(String(f.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))).map((f) => f.militar));
      const emLic = new Set(DS.afastadosEm(diaD).map((f) => f.militar));
      const emDisp = new Set(DS.dispensadosEm(diaD).map((f) => f.militar));
      const gv = DS.militares().filter((m) => DS.isSede(m.obm));
      const presentes = new Set(DS.militares().map((m) => m.obm));
      const quadros = C.obms.quadrosGeral;
      const todas = st.escopo === 'todas' ? DS.obms() : quadros;
      const lista = st.obm ? [st.obm] : todas;
      const desktop = innerWidth > 720;
      if (st.sel && !DS.militar(st.sel)) st.sel = null;

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Dados gerais da 1ª Cia Op', 'Escala de serviço do mês e efetivo por fração. Toque em um militar para ver a foto.', `<span class="counter"><span class="t">Militares em ${UI.esc(C.unidade.sede)}</span><span class="v">${gv.length}</span></span>${UI.linkPlanilha('efetivo')}`)}
        <div class="filters">
          ${UI.select('gObm', 'OBM', todas.filter((o) => presentes.has(o) || quadros.includes(o)), st.obm)}
          <div class="field"><label for="gEsc">Quadros</label><select class="select" id="gEsc"><option value="quadros" ${st.escopo === 'quadros' ? 'selected' : ''}>Quadros da sede</option><option value="todas" ${st.escopo === 'todas' ? 'selected' : ''}>Todas as OBMs</option></select></div>
          ${UI.btnLimpar('gLimpar')}
        </div>
        <section class="panel cal-panel ${calAberto() ? '' : 'fechado'}">
          <div class="panel-h">
            <button type="button" class="cal-toggle" id="gCal" aria-expanded="${calAberto()}" aria-controls="gCalB">${ICON('chevron', 'chev')}<h3>Escala de serviço</h3></button>
            ${calAberto() ? `<div class="month-nav"><button class="icon-btn" id="gPrev" type="button" aria-label="Mês anterior">${ICON('chevronL')}</button><strong>${UI.MESES[st.mes]} ${st.ano}</strong><button class="icon-btn" id="gNext" type="button" aria-label="Próximo mês">${ICON('chevron')}</button><button class="btn ghost" id="gHoje" type="button">Hoje</button></div>`
              : `<div class="cal-resumo"><span>${st.dia === DS.iso(hoje) ? 'Hoje' : UI.SEM[diaD.getDay()] + ' ' + UI.dm(diaD)}:</span>${UI.pelChip(pelDia)}<span>+ ${pelDia}ª Ala PEMAD</span>${DS.ligada('ferias') ? `<span class="muted">· ${emFerias.size} de férias</span>` : ''}</div>`}
          </div>
          <div class="panel-b" id="gCalB" ${calAberto() ? '' : 'hidden'}><div class="cal-wrap">${calendario(st.dia)}${ladoDoCalendario(st.dia)}
            ${DS.ligada('ferias') ? `<div class="cal-ferias"><h4>De férias em ${UI.dm(diaD)} <span class="muted">${emFerias.size}</span></h4><div id="gFerias"></div></div>` : ''}
          </div></div>
        </section>

        ${(() => {
          const card = (o) => {
            const ms = DS.militares().filter((m) => m.obm === o).sort(DS.ordemAntiguidade);
            // pelotão ou Ala PEMAD de mesmo número: ficam destacados juntos no dia de serviço
            const pn = UI.corPel(o);
            const duty = pn && pn === pelDia;
            const aberto = desktop || duty || (st.sel && ms.some((m) => m.id === st.sel)) || !!st.obm;
            // disponíveis = efetivo menos férias, trânsito e licença (dispensados continuam disponíveis)
            // licença vale mais que férias (4.72): quem está nos dois conta como licenciado
            const nLic = ms.filter((m) => emLic.has(m.id)).length;
            const nFer = ms.filter((m) => emFerias.has(m.id) && !emTransito.has(m.id) && !emLic.has(m.id)).length, nTra = ms.filter((m) => emTransito.has(m.id) && !emLic.has(m.id)).length;
            const disp = ms.length - nFer - nTra - nLic;
            const dica = `${disp} disponível(is) de ${ms.length} em ${UI.dm(diaD)}` + (nFer || nTra || nLic ? ` — fora: ${[nFer ? nFer + ' de férias' : '', nTra ? nTra + ' em trânsito' : '', nLic ? nLic + ' licenciado(s)' : ''].filter(Boolean).join(', ')}` : '') + '. Dispensados não são descontados.';
            return `<details class="roster ${duty ? 'de-servico pc' + pn : ''} ${/Ala PEMAD/.test(o) ? 'ala' : ''}" ${aberto ? 'open' : ''}>
              <summary class="roster-h"><h4>${pn ? UI.pelChip(pn, o) : UI.esc(o)}</h4>${duty ? `<span class="on-duty">de serviço${st.dia === DS.iso(hoje) ? '' : ' em ' + UI.dm(diaD)}</span>` : ''}<span class="n ${disp < ms.length ? 'desc' : ''}" title="${UI.esc(dica)}"><b>${disp}</b>/${ms.length}</span>${ICON('chevron', 'chev')}</summary>
              <div class="roster-cols"><span>Nome de guerra</span><span>Cred.</span></div>
              <ul>${ms.length ? ms.map((m, i) => `<li><button type="button" data-id="${m.id}" aria-pressed="${st.sel === m.id}"><span class="i">${i + 1}.</span><span class="nm">${UI.esc(DS.guerra(m))}${emLic.has(m.id) ? '<span class="off">licença</span>' : emTransito.has(m.id) ? '<span class="off">trânsito</span>' : emFerias.has(m.id) ? '<span class="off">férias</span>' : emDisp.has(m.id) ? '<span class="off disp">dispensa</span>' : ''}</span><span class="cr" title="Credenciado em">${cred(m)}</span></button></li>`).join('') : '<li class="muted" style="padding:6px 12px;font-size:13px">Sem militares nesta OBM</li>'}</ul>
            </details>`;
          };
          // layout da sede (como no Data Studio): pelotões em cima, alas embaixo e CIAD/COBOM + PBRESC na coluna da direita
          if (!st.obm && st.escopo === 'quadros') {
            const lado = lista.filter((o) => LADO().includes(o)), resto = lista.filter((o) => !LADO().includes(o));
            return `<div class="rosters sede" id="rosters"><div class="r-main">${resto.map(card).join('')}</div>${lado.length ? `<div class="r-side">${lado.map(card).join('')}</div>` : ''}</div>`;
          }
          return `<div class="rosters" id="rosters">${lista.map(card).join('')}</div>`;
        })()}
      </div>`;

      if (DS.ligada('ferias')) UI.table(view.querySelector('#gFerias'), {
        cols: [{ key: 'obm', label: 'OBM', render: (r) => UI.obm(r.obm), sort: (r) => DS.ordem(r.obm) }, { key: 'nome', label: 'Militar', cls: 'name' }, { key: 'retorno', label: 'Retorno', cls: 'n', render: (r) => UI.dm(r.retorno) }],
        rows: DS.feriasEm(diaD).map((f) => {
          const m = DS.militar(f.militar);
          const ret = DS.parse(f.fim);
          ret.setDate(ret.getDate() + 1);
          return { id: m.id, obm: m.obm, nome: DS.guerra(m), retorno: DS.iso(ret) };
        }),
        sort: 'obm', compact: true, onRow: (id) => abrir(id), empty: 'Ninguém de férias neste dia.', maxH: true,
      });
      UI.carregaFotos(view);

      const rer = () => PAGES.geral.render(view);
      const abrir = (id) => {
        st.sel = id;
        view.querySelectorAll('#rosters button[data-id]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.id === id));
        const m = DS.militar(id);
        UI.sheet('Militar', ficha(m));
      };
      const mudaMes = (delta) => { const d = new Date(st.ano, st.mes + delta, 1); st.ano = d.getFullYear(); st.mes = d.getMonth(); rer(); };
      view.querySelector('#gCal').onclick = () => { st.cal = !calAberto(); PREFS.marcar('geral-cal', st.cal); rer(); };
      if (calAberto()) {
        view.querySelector('#gPrev').onclick = () => mudaMes(-1);
        view.querySelector('#gNext').onclick = () => mudaMes(1);
        view.querySelector('#gHoje').onclick = () => { st.ano = st.mes = null; rer(); };
      }
      view.querySelector('.mcal').addEventListener('click', (e) => {
        const b = e.target.closest('[data-dia]');
        if (b) { st.dia = b.dataset.dia; rer(); }
      });
      view.querySelector('#gObm').onchange = (e) => { st.obm = e.target.value; rer(); };
      view.querySelector('#gEsc').onchange = (e) => { st.escopo = e.target.value; st.obm = ''; rer(); };
      view.querySelector('#gLimpar').onclick = () => { Object.assign(st, { ano: null, mes: null, dia: null, obm: '', escopo: 'quadros' }); rer(); };
      view.querySelector('#rosters').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) abrir(b.dataset.id); });
    },
  };
})();
