/* ==========================================================================
   TELA › FÉRIAS POR PERÍODO (#ferias)
   Filtros, calendário de 2 meses (período ou "dia a dia"), quadros de quem está
   de férias e tabela de períodos. Clique no militar do quadro filtra a tabela;
   clique na linha da tabela abre a janela do período.
   ========================================================================== */
(function () {
  const n = UI.norm;
  const { tabs, corDe, situacao, sit, FC, tomPct, ehCmt, periodo, escondeDica } = FER;
  /* ---------- por período ---------- */
  // de/ate = período escolhido (modo intervalo) · dias = dias marcados um a um (modo "dia a dia")
  // foco = último dia clicado (quadros de total e % ao lado do calendário) · mil = militar selecionado nos quadros
  // obm, posto, tipo e sit são listas (seleção múltipla; vazia = todos)
  const sp = { obm: [], posto: [], q: '', tipo: [], sit: [], de: '', ate: '', dias: new Set(), foco: '', mil: '', cal: null, ano: null, mes: null, diaADia: null };
  // calendário aberto/recolhido (lembrado no navegador)
  const spCal = () => { if (sp.cal == null) sp.cal = PREFS.ligado('fp-cal'); return sp.cal; };
  // chave "Dia a dia" ligada? (lembrada no navegador)
  const spDia = () => { if (sp.diaADia == null) sp.diaADia = PREFS.ligado('fp-diaadia'); return sp.diaADia; };
  // o período de férias cruza o intervalo a–b?
  const cruza = (f, a, b) => f.inicio <= b && f.fim >= a;
  PAGES.ferias = {
    title: 'Férias por período',
    render(view) {
      const hoje = DS.hoje(), hIso = DS.iso(hoje), modoDia = spDia();
      if (sp.ano == null) { const d0 = sp.de ? DS.parse(sp.de) : hoje; sp.ano = d0.getFullYear(); sp.mes = d0.getMonth(); }
      const de = sp.de, ate = sp.ate || sp.de;
      const dias = [...sp.dias].sort();
      const temPer = modoDia ? dias.length > 0 : !!de;
      const noFiltro = (f) => (modoDia ? dias.some((k) => f.inicio <= k && f.fim >= k) : cruza(f, de, ate));
      const listaDias = dias.slice(0, 5).map((k) => UI.dm(k)).join(', ') + (dias.length > 5 ? '…' : '');
      const perTxt = !temPer ? '' : modoDia ? (dias.length === 1 ? UI.data(dias[0]) : `${dias.length} dias (${listaDias})`) : de === ate ? UI.data(de) : `${UI.data(de)} a ${UI.data(ate)}`;
      const nDias = !temPer ? 0 : modoDia ? dias.length : Math.round((DS.parse(ate) - DS.parse(de)) / 864e5) + 1;
      // filtros da tela (sem situação) → base do calendário e dos quadros
      const base = DS.ferias().map((f) => ({ ...f, m: DS.militar(f.militar) }))
        .filter((f) => f.m && (!sp.obm.length || sp.obm.includes(f.m.obm)) && (!sp.posto.length || sp.posto.includes(f.m.posto)) && (!sp.tipo.length || sp.tipo.includes(f.tipo)) && (!sp.q || n(f.m.nome + ' ' + f.m.nomeGuerra + ' ' + f.m.nBM).includes(n(sp.q))));
      // militar selecionado nos quadros: a tabela mostra todos os períodos dele (filtro dinâmico)
      const milSel = sp.mil ? DS.militar(sp.mil) : null;
      if (sp.mil && !milSel) sp.mil = '';
      const rows = (milSel ? DS.ferias().filter((f) => f.militar === sp.mil).map((f) => ({ ...f, m: milSel }))
        : base.filter((f) => (!sp.sit.length || sp.sit.includes(situacao(f)[0])) && (!temPer || noFiltro(f))))
        .sort((a, b) => DS.ordem(a.m.obm) - DS.ordem(b.m.obm) || a.inicio.localeCompare(b.inicio));

      // quem está de férias: no período / dias escolhidos ou hoje
      const naJanela = temPer ? base.filter(noFiltro) : base.filter((f) => cruza(f, hIso, hIso));
      const porMil = new Map(); naJanela.forEach((f) => { if (!porMil.has(f.militar)) porMil.set(f.militar, []); porMil.get(f.militar).push(f); });
      const mils = [...porMil.keys()].map((id) => DS.militar(id));

      // calendário: o mês escolhido e o seguinte, lado a lado (períodos que viram o mês)
      const marcado = (k) => (modoDia ? sp.dias.has(k) : temPer && k >= de && k <= ate);
      const calMes = (ano, mes, nav) => {
        const nd = new Date(ano, mes + 1, 0).getDate(), pad0 = new Date(ano, mes, 1).getDay();
        const regDias = FER.confereRegras(ano, mes).dias;   // dias com regra de férias descumprida
        const fer = new Map(DS.feriados(ano).map((f) => [f.data, f.nome]));
        let cells = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((w) => `<span class="mcal-wd">${w}</span>`).join('');
        for (let k = 0; k < pad0; k++) cells += '<span class="cd-blank"></span>';
        for (let d = 1; d <= nd; d++) {
          const dt = new Date(ano, mes, d), k = DS.iso(dt), p = DS.pelotaoDoDia(dt), h = fer.get(k);
          const qt = new Set(base.filter((f) => f.inicio <= k && f.fim >= k).map((f) => f.militar)).size;
          const mk = marcado(k), ponta = !modoDia && (k === de || k === ate), rv = regDias.get(k);
          cells += `<button type="button" class="cd pc${p} ${k === hIso ? 'today' : ''} ${h ? 'hol' : ''} ${mk ? 'fp-in' : ''} ${ponta ? 'fp-ini' : ''} ${k === sp.foco ? 'fp-foco' : ''} ${rv ? 'cd-regra' : ''}" data-dia="${k}" aria-pressed="${mk}"
            title="${UI.SEM_L[dt.getDay()]}, ${UI.data(dt)} – ${qt} militar(es) de férias${h ? ' – ' + UI.esc(h) : ''}${rv ? ' – regra não cumprida: ' + UI.esc(rv.map((v) => `${v.grupo} ${v.n} (máx. ${v.max})`).join('; ')) : ''}"><span class="cd-n">${d}</span>${qt ? `<span class="cd-f fp-q">${qt}</span>` : ''}<span class="cd-p">${p}º<span class="full"> Pel</span></span></button>`;
        }
        return `<div class="mcal"><div class="month-nav fp-nav">${nav === 'prev' ? `<button class="icon-btn" id="fpPrev" type="button" aria-label="Mês anterior">${ICON('chevronL')}</button>` : '<span class="fp-nav-sp"></span>'}<strong>${UI.MESES[mes]} ${ano}</strong>${nav === 'next' ? `<button class="icon-btn" id="fpNext" type="button" aria-label="Próximo mês">${ICON('chevron')}</button>` : '<span class="fp-nav-sp"></span>'}</div><div class="mcal-grid">${cells}</div></div>`;
      };
      const m2 = new Date(sp.ano, sp.mes + 1, 1);
      const instrucao = modoDia ? 'Dia a dia: clique em um dia para ver quem está de férias nele; clique em outro para trocar ou no mesmo dia para desmarcar.'
        : !temPer ? 'Clique no dia de início e depois no dia de término.' : !sp.ate ? `Início em ${UI.data(de)}. Agora clique no dia de término (ou use só este dia).` : 'Clique em outro dia para começar um novo período.';

      // quadros ao lado: total de militares de férias e % de FA/FP no dia clicado (ou hoje)
      const foco = sp.foco || hIso, dFoco = DS.parse(foco);
      const noDia = base.filter((f) => f.inicio <= foco && f.fim >= foco);
      const Qd = APP_CONFIG.obms.quadrosGeral;
      const tipoDia = DS.ferias().filter((f) => (!sp.tipo.length || sp.tipo.includes(f.tipo)) && f.inicio <= foco && f.fim >= foco).map((f) => ({ f, m: DS.militar(f.militar) })).filter((x) => x.m);
      const sedeDia = new Set(tipoDia.filter((x) => Qd.includes(x.m.obm) && !ehCmt(x.f, x.m)).map((x) => x.m.id)).size;
      const efetivoQ = DS.militares().filter((m) => Qd.includes(m.obm) && !ehCmt({}, m)).length;
      const maxBM = FER.regrasFerias().maxBM;
      const pctDia = efetivoQ ? sedeDia / efetivoQ : 0, tomDia = tomPct(pctDia), estouraDia = maxBM != null && sedeDia > maxBM;
      const tipoTxt = sp.tipo.length ? sp.tipo.join(' e ') : 'FA e FP';
      const filtrado = sp.obm.length || sp.posto.length || sp.q || sp.tipo.length;
      const diaHtml = `<div class="fp-dia">
          <div class="fp-dia-t"><b>${UI.SEM_L[dFoco.getDay()]}, ${UI.data(dFoco)}</b>${sp.foco ? '' : ' <span class="muted">(hoje)</span>'} <span class="muted">· ${DS.pelotaoDoDia(dFoco)}º Pel de serviço</span></div>
          <div class="fd-status fp-status">
            <div class="fs-i"><small>Militares de férias no dia</small><b class="num">${new Set(noDia.map((f) => f.militar)).size}</b><span class="muted">${filtrado ? 'com os filtros da tela' : 'todas as OBMs'}</span></div>
            <div class="fs-i pct t-${tomDia}"><small>% ${UI.esc(tipoTxt)} no dia</small><b class="num">${UI.pct(pctDia, 1)}</b><span>${sedeDia} de ${efetivoQ} militares dos quadros${estouraDia ? ` · acima de ${maxBM} BM` : ''}</span></div>
          </div>
          <p class="muted fp-dia-n">O % considera FA/FP dos quadros da sede (sem CMT Pelotão/ADM), como em Férias por data. Clique em um dia para trocar.</p>
        </div>`;

      const itemMil = (comObm) => (m, i) => { const fs = porMil.get(m.id).sort((a, b) => a.inicio.localeCompare(b.inicio));
        return `<li><button type="button" data-fp="${fs[0].id}" data-mil="${m.id}" aria-pressed="${sp.mil === m.id}" title="Clique para ver todos os períodos de férias deste militar na tabela abaixo"><span class="i">${i + 1}.</span><span class="nm">${UI.esc(DS.guerra(m))}${comObm ? ` <small class="muted">${UI.esc(m.obm)}</small>` : ''}</span><span class="cr fp-datas">${fs.map((f) => `${UI.dm(f.inicio)}–${UI.dm(f.fim)}`).join(', ')}</span></button></li>`; };
      const ordMil = (a, b) => (DS.RANK[a.posto] ?? 99) - (DS.RANK[b.posto] ?? 99) || a.nomeGuerra.localeCompare(b.nomeGuerra);
      // quadros no mesmo padrão de "Férias por data": pelotões e alas, COBOM/PBRESC ao lado, CMT Pelotão/ADM e demais OBMs
      const Q = APP_CONFIG.obms.quadrosGeral, LADO = APP_CONFIG.obms.quadrosLado || ['CIAD/COBOM', 'PBRESC'];
      const fs0 = (m) => porMil.get(m.id)[0];
      const naoCmt = mils.filter((m) => !ehCmt(fs0(m), m));
      const cmtMs = mils.filter((m) => ehCmt(fs0(m), m)).sort(ordMil);
      const demaisMs = naoCmt.filter((m) => !Q.includes(m.obm)).sort(ordMil);
      const quadro = (titulo, ms, { cor = 0, comObm = false, extra = '' } = {}) => `<section class="roster ${ms.length ? 'tem' : ''} ${cor ? 'pc' + cor : ''} ${extra}"><div class="roster-h"><h4>${cor ? UI.pelChip(cor, titulo) : UI.esc(titulo)}</h4><span class="n">${ms.length}</span></div><ul>${ms.length ? ms.map(itemMil(comObm)).join('') : '<li class="muted" style="padding:6px 12px;font-size:13px">Ninguém de férias</li>'}</ul></section>`;
      const doQ = (o) => naoCmt.filter((m) => m.obm === o).sort(ordMil);
      const quadrosHtml = `<div class="fd-grid fp-grid">
          <div class="rosters sede fp-rosters">
            <div class="r-main">${Q.filter((o) => !LADO.includes(o)).map((o) => quadro(o, doQ(o), { cor: corDe(o) })).join('')}</div>
            <div class="r-side">${Q.filter((o) => LADO.includes(o)).map((o) => quadro(o, doQ(o))).join('')}</div>
          </div>
          <div class="fd-lado fp-rosters">${quadro('CMT Pelotão/ADM', cmtMs, { comObm: true, extra: 'cmt' })}${demaisMs.length ? quadro('Demais OBMs', demaisMs, { comObm: true }) : ''}</div>
        </div>`;
      if (sp.qAberto == null) sp.qAberto = PREFS.ligado('fp-quadros', true);
      const qAberto = sp.qAberto;

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Férias por período', 'Consulta individual de férias anuais (FA) e férias-prêmio (FP). Os lançamentos servem de base para publicação no SIGP.', UI.linkPlanilha('ferias'))}
        ${tabs('ferias')}
        <div class="filters">
          ${UI.multiSel(sp, 'fObm', 'obm', 'OBM', DS.obms())}${UI.multiSel(sp, 'fPosto', 'posto', 'Posto/graduação', DS.postos())}
          ${UI.input('fQ', 'Nome do militar', sp.q, { placeholder: 'Nome, guerra ou nº BM' })}
          ${UI.multiSel(sp, 'fTipo', 'tipo', 'Tipo', [...new Set(DS.ferias().map((f) => f.tipo))].sort().map((t) => [t, { FA: 'FA – férias anuais', FP: 'FP – férias-prêmio' }[t] || t]))}
          ${UI.multiSel(sp, 'fSit', 'sit', 'Situação', ['Em curso', 'Agendada', 'Concluída'])}
          ${UI.btnLimpar('fLimpar')}
        </div>

        <section class="panel cal-panel fd-cal fp-cal ${spCal() ? '' : 'fechado'}">
          <div class="panel-h">
            <button type="button" class="cal-toggle" id="fpCal" aria-expanded="${spCal()}">${ICON('chevron', 'chev')}<h3>Escolher ${modoDia ? 'dia' : 'período'} no calendário</h3></button>
            <div class="cal-resumo">${temPer ? `<b>${perTxt}</b><span class="muted">${modoDia ? '' : nDias + ' dia(s) · '}${mils.length} militar(es) de férias</span>` : `<span class="muted">nenhum ${modoDia ? 'dia escolhido' : 'período escolhido'}</span>`}</div>
            ${modoDia ? '' : `<div class="fp-datas-in"><label>De <input class="input fd-input" type="date" id="fpDe" value="${de}"></label><label>Até <input class="input fd-input" type="date" id="fpAte" value="${sp.ate}"></label></div>`}
            ${temPer ? `<button class="btn ghost" id="fpLimpa" type="button">Limpar ${modoDia ? 'dia' : 'período'}</button>` : ''}
          </div>
          <div class="panel-b" ${spCal() ? '' : 'hidden'}>
            <div class="fp-topo">
              <label class="fp-chave"><input type="checkbox" id="fpModo" ${modoDia ? 'checked' : ''}><span class="fp-sw" aria-hidden="true"></span><span><b>Dia a dia</b> <span class="muted">${modoDia ? 'ligado: um dia por vez (clique de novo no dia para desmarcar)' : 'desligado: clique no início e no fim do período'}</span></span></label>
            </div>
            <div class="cal-wrap fp-wrap">
              ${calMes(sp.ano, sp.mes, 'prev')}
              ${calMes(m2.getFullYear(), m2.getMonth(), 'next')}
              ${diaHtml}
            </div>
            <p class="fp-ajuda muted">${instrucao} O número no canto é a quantidade de militares de férias no dia.</p>
            ${modoDia ? '' : '<div class="fd-selbar"><button class="btn ghost" type="button" id="fpMes">Mês inteiro</button><button class="btn ghost" type="button" id="fpSemana">Próximos 7 dias</button><button class="btn ghost" type="button" id="fpTrinta">Próximos 30 dias</button></div>'}
          </div>
        </section>

        ${FER.painelRegras(sp.ano, sp.mes)}

        <section class="panel cal-panel fp-quadros ${qAberto ? '' : 'fechado'}"><div class="panel-h">
            <button type="button" class="cal-toggle" id="fpQuad" aria-expanded="${qAberto}">${ICON('chevron', 'chev')}<h3>${temPer ? `De férias em ${perTxt}` : 'Férias na data de hoje'} <span class="count">${mils.length} militares</span></h3></button></div>
          <div class="panel-b" ${qAberto ? '' : 'hidden'}>${quadrosHtml}</div></section>

        <section class="panel" id="fpTabela"><div class="panel-h"><h3>${milSel ? `Períodos de férias de ${UI.esc(DS.guerra(milSel))}` : `Períodos de férias${temPer ? ` em ${perTxt}` : ''}`} <span class="count">${rows.length}</span></h3>
          ${milSel ? `<button type="button" class="btn ghost sm" id="fpDesel">${ICON('x')}<span>Mostrar todos</span></button>` : ''}</div><div id="fTbl"></div></section>
      </div>`;

      UI.table(view.querySelector('#fTbl'), {
        cols: [
          { key: 'obm', label: 'OBM', render: (f) => UI.obm(f.m.obm), sort: (f) => DS.ordem(f.m.obm) },
          { key: 'bm', label: 'Nº BM', render: (f) => `<span class="num">${f.m.nBM}</span>`, sort: (f) => f.m.nBM },
          { key: 'nome', label: 'Nome de guerra', cls: 'name', render: (f) => `<b>${UI.esc(DS.guerra(f.m))}</b>`, sort: (f) => f.m.nomeGuerra },
          { key: 'periodo', label: 'Período', cls: 'c', render: (f) => UI.esc(f.periodoTxt || (f.periodo ? f.periodo + 'º' : '–')) },
          { key: 'dias', label: 'Dias', cls: 'n' },
          { key: 'inicio', label: 'Início', render: (f) => `<span class="num">${UI.data(f.inicio)}</span>` },
          { key: 'fim', label: 'Final', render: (f) => `<span class="num">${UI.data(f.fim)}</span>` },
          { key: 'exercicio', label: 'Exercício', cls: 'c' },
          { key: 'abono', label: 'Abono', cls: 'c', render: (f) => (f.abono ? 'Sim' : 'Não') },
          { key: 'tipo', label: 'Tipo', cls: 'c', render: (f) => UI.chip(f.tipo, f.tipo === 'FP' ? 'gold' : '') },
          { key: 'sit', label: 'Situação', render: sit, sort: (f) => situacao(f)[0] },
          { key: 'obs', label: 'Observações', full: true, render: (f) => UI.dash(f.obs) },
        ],
        rows, maxH: true, sort: milSel ? 'inicio' : null, empty: temPer ? 'Nenhum período de férias cruza as datas escolhidas.' : 'Nenhum período nos filtros escolhidos.',
        // clique na linha: janela com os dados do período (sem sair da tela)
        onRow: (id) => { const f = rows.find((r) => r.id === id); periodo(f, sp.foco ? DS.parse(sp.foco) : hoje); },
      });
      const rer = () => { const y = window.scrollY; PAGES.ferias.render(view); window.scrollTo({ top: y }); };
      UI.ligaMultiSel(view, sp, rer);
      FER.ligaRegras(view, rer);
      UI.ligaBusca(view, 'fQ', sp, rer);
      view.querySelector('#fLimpar').onclick = () => {
        Object.assign(sp, { obm: [], posto: [], q: '', tipo: [], sit: [], _aberto: null, de: '', ate: '', dias: new Set(), foco: '', mil: '' });
        rer();
      };
      // militar no quadro: seleciona (a tabela abaixo passa a mostrar todos os períodos dele); 2º clique desfaz. Sem janela nesta tela.
      escondeDica();
      view.querySelectorAll('[data-mil]').forEach((b) => (b.onclick = () => { sp.mil = sp.mil === b.dataset.mil ? '' : b.dataset.mil; rer(); }));
      const ds = view.querySelector('#fpDesel'); if (ds) ds.onclick = () => { sp.mil = ''; rer(); };
      // período
      const define = (a, b, manterMes) => {
        if (b && b < a) [a, b] = [b, a];
        sp.de = a || '';
        sp.ate = b && b !== a ? b : '';
        if (a && !manterMes) { const d = DS.parse(a); sp.ano = d.getFullYear(); sp.mes = d.getMonth(); }
        rer();
      };
      view.querySelector('#fpQuad').onclick = () => { sp.qAberto = !sp.qAberto; PREFS.marcar('fp-quadros', sp.qAberto); rer(); };
      view.querySelector('#fpCal').onclick = () => { sp.cal = !spCal(); PREFS.marcar('fp-cal', sp.cal); rer(); };
      const iDe = view.querySelector('#fpDe'); if (iDe) iDe.onchange = (e) => define(e.target.value, sp.ate && sp.ate >= e.target.value ? sp.ate : '');
      const iAte = view.querySelector('#fpAte'); if (iAte) iAte.onchange = (e) => define(sp.de || e.target.value, e.target.value);
      const lp = view.querySelector('#fpLimpa'); if (lp) lp.onclick = () => { if (modoDia) {
        sp.dias = new Set();
        sp.foco = '';
        rer();
      } else {
        sp.foco = '';
        define('', '');
      } };
      if (spCal()) {
        const muda = (k) => { const d = new Date(sp.ano, sp.mes + k, 1); sp.ano = d.getFullYear(); sp.mes = d.getMonth(); rer(); };
        view.querySelector('#fpPrev').onclick = () => muda(-1);
        view.querySelector('#fpNext').onclick = () => muda(1);
        view.querySelector('#fpModo').onchange = (e) => {
          sp.diaADia = e.target.checked;
          if (sp.dias.size > 1) sp.dias = new Set([sp.foco && sp.dias.has(sp.foco) ? sp.foco : [...sp.dias].sort()[0]]);
          PREFS.marcar('fp-diaadia', sp.diaADia);
          rer();
        };
        view.querySelector('.fp-wrap').addEventListener('click', (e) => { const b = e.target.closest('[data-dia]'); if (!b) return; const k = b.dataset.dia;
          // dia a dia: um único dia marcado; clicar em outro troca, clicar no mesmo desmarca (volta a não ter filtro)
          if (modoDia) { if (sp.dias.has(k)) { sp.dias = new Set(); sp.foco = ''; } else { sp.dias = new Set([k]); sp.foco = k; } rer(); return; }
          sp.foco = k;
          if (sp.de && !sp.ate && k !== sp.de) define(sp.de, k, true); else define(k, '', true); });
        view.querySelector('.fp-wrap').addEventListener('mousedown', (e) => { if (e.target.closest('[data-dia]')) e.preventDefault(); });
        const bm = view.querySelector('#fpMes'); if (bm) bm.onclick = () => define(DS.iso(new Date(sp.ano, sp.mes, 1)), DS.iso(new Date(sp.ano, sp.mes + 1, 0)), true);
        const proximos = (nd2) => { const b = new Date(hoje); b.setDate(b.getDate() + nd2 - 1); define(hIso, DS.iso(b)); };
        const b7 = view.querySelector('#fpSemana'); if (b7) b7.onclick = () => proximos(7);
        const b30 = view.querySelector('#fpTrinta'); if (b30) b30.onclick = () => proximos(30);
      }
    },
  };
})();
