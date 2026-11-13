/* ==========================================================================
   TELA › CALENDÁRIO AMPLO (#calendario)
   Escala anual dos pelotões (24×72), feriados e, com a chave ligada,
   o resumo do efetivo à disposição ao clicar no dia.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  let ano = null;
  // "Resumo ao clicar": liga/desliga o popup com o efetivo à disposição no dia (lembrado neste navegador)
  let resumo = null;
  // chave "Resumo ao clicar no dia" (lembrada no navegador)
  const resumoLigado = () => { if (resumo == null) resumo = PREFS.ligado('cal-resumo'); return resumo; };

  // janela com o resumo do dia (à disposição, férias, licenças)
  function popup(d) {
    if (!window.EMP) return;
    const x = EMP.resumoDia(d), t = x.total, ok = DS.ligada('efetivo') || DS.fonte !== 'sheets';
    const linha = (rot, v, cls = '') => `<div class="rd-l ${cls}"><span>${rot}</span><b class="num">${v}</b></div>`;
    const outros = Object.entries(x.outrosLista.reduce((o, s) => ((o[s] = (o[s] || 0) + 1), o), {})).map(([s, n]) => `${n} ${s}`).join(', ');
    UI.sheet(`${UI.SEM[d.getDay()]}, ${UI.data(d)}`, `<div class="rd">
      <div class="rd-esc">${UI.pelChip(x.p)}<span>+ ${x.p}ª Ala PEMAD</span><span class="muted">troca às ${UI.pad(C.escala.trocaHora)}h${UI.pad(C.escala.trocaMinuto || 0)}</span></div>
      ${ok ? `<div class="rd-box">
        ${linha('À disposição Sede', x.sede.disp)}
        ${linha('À disposição PEMAD', x.pemad.disp)}
        ${linha('Total à disposição', t.disp, 'tot tom-' + x.tom)}
        ${linha('Férias', t.ferias, t.ferias ? 'warn' : '')}
        ${linha('LM / licenças', t.lic, t.lic ? 'warn' : '')}
        ${linha('Motoristas cat. D (MP)', x.mp, 'tom-' + x.tomMP)}
        ${t.outros ? linha('Outros afastamentos', t.outros) : ''}
      </div>
      <p class="rd-nota">Efetivo do ${x.p}º Pel (${x.sede.efetivo}${x.refs ? `, com ${x.refs} reforço(s)` : ''}) e da ${x.p}ª Ala PEMAD (${x.pemad.efetivo}${x.refsP ? `, com ${x.refsP} reforço(s)` : ''}).${outros ? ` Outros: ${UI.esc(outros)}.` : ''} Considera férias, licenças e os lançamentos dos Empenhos semanais.</p>`
      : UI.vazio('Planilha de efetivo não ligada.')}
      <button type="button" class="btn" id="rdEmp">${ICON('clock')}Abrir nos Empenhos semanais</button>
    </div>`);
    const b = document.getElementById('rdEmp'); if (b) b.onclick = () => { UI.fechaSheet(); EMP.irPara(d); };
  }

  PAGES.calendario = {
    title: 'Calendário amplo',
    render(view) {
      const hoje = DS.hoje();
      if (ano == null) ano = hoje.getFullYear();
      const fer = DS.feriados(ano);
      const ferMap = new Map(fer.map((f) => [f.data, f.nome]));
      const hIso = DS.iso(hoje);

      const mes = (m) => {
        const first = new Date(ano, m, 1), dow = first.getDay(), n = new Date(ano, m + 1, 0).getDate();
        let cells = UI.SEM.map((s) => `<span class="wh">${s.slice(0, 3)}</span>`).join('');
        for (let i = dow; i > 0; i--) { const d = new Date(ano, m, 1 - i); cells += `<span class="d out">${d.getDate()}</span>`; }
        for (let i = 1; i <= n; i++) {
          const d = new Date(ano, m, i), k = DS.iso(d), p = DS.pelotaoDoDia(d), h = ferMap.get(k);
          cells += resumoLigado()
            ? `<button type="button" class="d pc${p} ${h ? 'hol' : ''} ${k === hIso ? 'today' : ''}" style="--pc:var(--p${p})" data-dia="${k}" title="${UI.data(d)} – ${p}º Pel${h ? ' – ' + UI.esc(h) : ''} (clique para o resumo)">${i}</button>`
            : `<span class="d pc${p} ${h ? 'hol' : ''} ${k === hIso ? 'today' : ''}" style="--pc:var(--p${p})" title="${UI.data(d)} – ${p}º Pel${h ? ' – ' + UI.esc(h) : ''}">${i}</span>`;
        }
        const tail = (7 - ((dow + n) % 7)) % 7;
        for (let i = 1; i <= tail; i++) cells += `<span class="d out">${i}</span>`;
        return `<div class="month ${ano === hoje.getFullYear() && m === hoje.getMonth() ? 'current' : ''}"><h4>${UI.MESES[m]}</h4><div class="mgrid">${cells}</div></div>`;
      };

      view.innerHTML = `<div class="page">
        ${UI.pageHead(`Calendário operacional ${ano}`, 'Escala 24×72 dos pelotões da sede. Cada dia mostra o pelotão que assume o serviço na troca da manhã.',
          `<button class="btn" id="cPrev" type="button" aria-label="Ano anterior">${ICON('chevronL')}${ano - 1}</button><button class="btn" id="cHoje" type="button">Hoje</button><button class="btn" id="cNext" type="button" aria-label="Próximo ano">${ano + 1}${ICON('chevron')}</button>`)}
        <div class="cal-bar">
          <div class="legend">${[1, 2, 3, 4].map((p) => UI.pelChip(p, p + 'º Pel. Operacional')).join('')}<span class="muted">● feriado nacional</span></div>
          <label class="sw-tg" title="Ao clicar em um dia, mostra o efetivo à disposição do serviço"><input type="checkbox" id="cResumo" ${resumoLigado() ? 'checked' : ''}><span class="sw-tr" aria-hidden="true"></span><span>Resumo ao clicar no dia</span></label>
        </div>
        <div class="cal-grid ${resumoLigado() ? 'clicavel' : ''}">${Array.from({ length: 12 }, (_, m) => mes(m)).join('')}</div>
        ${UI.panel('Feriados nacionais', `<div class="holidays">${fer.map((f) => {
          const d = DS.parse(f.data);
          return `<div><b>${UI.dm(d)}</b><span>${UI.esc(f.nome)} <span class="muted">(${UI.SEM[d.getDay()]}, ${DS.pelotaoDoDia(d)}º Pel)</span></span></div>`;
        }).join('')}</div>
          <div class="signature" style="margin-top:14px"><b>${UI.esc(C.unidade.comandante)}, ${UI.esc(C.unidade.comandantePosto)}</b>Comandante da ${UI.esc(C.unidade.nome)}</div>`)}
      </div>`;

      view.querySelector('#cResumo').onchange = (e) => {
        resumo = e.target.checked;
        PREFS.marcar('cal-resumo', resumo);
        const y = window.scrollY;
        PAGES.calendario.render(view);
        window.scrollTo({ top: y });
        UI.toast(resumo ? 'Resumo do dia ligado: clique em um dia' : 'Resumo do dia desligado');
      };
      view.querySelector('.cal-grid').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-dia]');
        if (b && resumoLigado()) popup(DS.parse(b.dataset.dia));
      });
      view.querySelector('#cPrev').onclick = () => { ano--; PAGES.calendario.render(view); };
      view.querySelector('#cNext').onclick = () => { ano++; PAGES.calendario.render(view); };
      view.querySelector('#cHoje').onclick = () => {
        ano = hoje.getFullYear();
        PAGES.calendario.render(view);
        view.querySelector('.month.current')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
    },
  };
})();
