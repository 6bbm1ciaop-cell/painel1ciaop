/* ==========================================================================
   FÉRIAS E LICENÇAS › FUNÇÕES COMUNS (window.FER)
   Abas, cor do pelotão/ala, situação do período, regras de CMT Pelotão/ADM,
   janela do período de férias e dica flutuante. Usadas por periodo.js,
   por-data.js e licencas.js (nesta pasta).
   ========================================================================== */
(function () {
  const TABS = [['ferias', 'Por período'], ['ferias-data', 'Por data'], ['licencas', 'Licenças']];
  const tabs = (at) => UI.abas('Férias e licenças', TABS, at);
  // nº do pelotão de uma OBM — a Ala PEMAD de mesmo número trabalha no mesmo dia e recebe a mesma cor
  const corDe = (o) => UI.corPel(o);
  // situação do período hoje: em curso, agendada ou concluída
  const situacao = (f) => {
    const h = DS.iso(DS.hoje());
    return f.inicio <= h && f.fim >= h ? ['Em curso', 'warn'] : f.inicio > h ? ['Agendada', 'info'] : ['Concluída', ''];
  };
  // chip da situação
  const sit = (f) => { const [t, tone] = situacao(f); return UI.chip(t, tone + ' dot'); };
  // data escolhida em Férias por data (guardada ao trocar de tela)
  const estado = { dataSel: null };
  // limites do % de FA/FP e OBMs cujos militares entram no quadro CMT Pelotão/ADM (config.js → ferias)
  const FC = () => APP_CONFIG.ferias || { limites: { verde: 0.12, vermelho: 0.15 }, maxBM: 11, cmtObms: [] };
  // cor do % de FA/FP (config.js → ferias.limites)
  const tomPct = (p) => (p < FC().limites.verde ? 'ok' : p > FC().limites.vermelho ? 'bad' : 'warn');
  // Ten ou Cap?
  const ehOficial = (m) => m.classe === 'Ten' || m.classe === 'Cap';
  // entra no quadro CMT Pelotão/ADM (não concorre no %)?
  const ehCmt = (f, m) => f.cmt || FC().cmtObms.includes(m.obm) || (ehOficial(m) && (FC().cmtOficiaisObms || []).includes(m.obm));

  // janela com o período de férias do militar (sem sair da tela)
  function periodo(f, diaRef) {
    if (!f) return;
    const m = f.m || DS.militar(f.militar), dia = diaRef || DS.hoje();
    const ret = DS.parse(f.fim); ret.setDate(ret.getDate() + 1);
    const dec = Math.round((dia - DS.parse(f.inicio)) / 864e5) + 1, rest = Math.round((DS.parse(f.fim) - dia) / 864e5);
    const outros = DS.ferias().filter((g) => g.militar === f.militar && g.id !== f.id).sort((a, b) => a.inicio.localeCompare(b.inicio));
    UI.sheet('Período de férias', `<div class="fp">
      <div><div class="mil-name" style="font-size:19px">${UI.esc(DS.guerra(m))}</div><div class="mil-sub">${UI.esc(m.obm || '')}${m.nBM ? ' / BM ' + UI.esc(m.nBM) : ''}${ehCmt(f, m) ? ' / CMT Pelotão/ADM' : ''}</div></div>
      <div class="fp-faixa"><span class="num">${UI.data(f.inicio)}</span><span class="fp-seta">→</span><span class="num">${UI.data(f.fim)}</span></div>
      <div class="fp-bar" title="${dec} de ${f.dias} dias"><span style="width:${Math.min(100, Math.max(0, dec / (f.dias || 1) * 100))}%"></span></div>
      <dl class="kv">
        <dt>Tipo</dt><dd>${UI.chip(f.tipo, f.tipo === 'FP' ? 'gold' : '')}${f.tipo === 'FA' ? ' férias anuais' : f.tipo === 'FP' ? ' férias-prêmio' : ''}</dd>
        <dt>Período</dt><dd>${UI.esc(f.periodoTxt || (f.periodo ? f.periodo + 'º' : '–'))}</dd>
        <dt>Dias</dt><dd>${f.dias}${diaRef && dec >= 1 && dec <= f.dias ? ` <span class="muted">(${dec}º dia em ${UI.dm(dia)}; ${rest > 0 ? `faltam ${rest}` : 'último dia'})</span>` : ''}</dd>
        <dt>Retorno</dt><dd class="num">${UI.SEM[ret.getDay()]}, ${UI.data(ret)}</dd>
        <dt>Exercício</dt><dd>${UI.dash(FER.exercicioTxt(f))}</dd>
        <dt>Abono</dt><dd>${f.abono ? 'Sim' : 'Não'}</dd>
        ${f.obs ? `<dt>Observações</dt><dd>${UI.esc(f.obs)}</dd>` : ''}
      </dl>
      ${outros.length ? `<div><h4 class="fp-h">Outros períodos lançados</h4><ul class="list">${outros.map((g) => `<li><span>${UI.esc(g.periodoTxt || (g.periodo ? g.periodo + 'º' : ''))} <small class="muted">${g.tipo}, ${g.dias} dias</small></span><span class="when num">${UI.dm(g.inicio)} a ${UI.data(g.fim)}</span></li>`).join('')}</ul></div>` : ''}
    </div>`);
  }

  /* dica flutuante com o período de férias */
  function dicaEl() {
    let d = document.getElementById('fdDica');
    if (!d) {
      d = document.createElement('div');
      d.id = 'fdDica';
      d.className = 'fd-dica';
      d.setAttribute('role', 'tooltip');
      d.hidden = true;
      document.body.appendChild(d);
      window.addEventListener('scroll', escondeDica, true);
    }
    return d;
  }
  // esconde a dica flutuante
  function escondeDica() { const d = document.getElementById('fdDica'); if (d) d.hidden = true; }
  // mostra a dica flutuante junto ao militar
  function mostraDica(el, f, diaRef) {
    if (matchMedia('(hover: none)').matches && !el.matches(':focus-visible')) return; // toque: a janela do clique já mostra tudo
    const d = dicaEl(), m = f.m;
    const ret = DS.parse(f.fim); ret.setDate(ret.getDate() + 1);
    const dec = diaRef ? Math.round((diaRef - DS.parse(f.inicio)) / 864e5) + 1 : 0;
    const outros = DS.ferias().filter((g) => g.militar === f.militar && g.id !== f.id && g.fim >= DS.iso(DS.hoje())).length;
    d.innerHTML = `<b>${UI.esc(DS.guerra(m))}</b><span class="muted">${UI.esc(m.obm || '')}</span>
      <div class="fd-dica-p"><span class="num">${UI.data(f.inicio)}</span> → <span class="num">${UI.data(f.fim)}</span></div>
      <div>${UI.esc(f.tipo)}${f.periodoTxt || f.periodo ? ` · ${UI.esc(f.periodoTxt || f.periodo + 'º')} período` : ''} · ${f.dias} dias${f.abono ? ' · abono' : ''}</div>
      ${dec >= 1 && dec <= f.dias ? `<div class="muted">${dec}º dia em ${UI.dm(diaRef)} · retorna ${UI.SEM[ret.getDay()]} ${UI.dm(ret)}</div>` : `<div class="muted">Retorna ${UI.SEM[ret.getDay()]}, ${UI.data(ret)}</div>`}
      ${outros ? `<div class="muted">+${outros} outro(s) período(s) a gozar</div>` : ''}`;
    d.hidden = false;
    const r = el.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
    let left = r.left + 12, top = r.bottom + 6;
    if (left + w > innerWidth - 8) left = innerWidth - w - 8;
    if (top + h > innerHeight - 8) top = r.top - h - 6;
    d.style.left = Math.max(8, left) + 'px'; d.style.top = Math.max(8, top) + 'px';
  }

  /* exercício: nas férias-prêmio (FP) o número é o quinquênio → "2º QQ"; nas FA, o ano (4.79) */
  function exercicioTxt(f) {
    const e = f && f.exercicio;
    if (e === '' || e == null) return '';
    return f.tipo === 'FP' && +e > 0 && +e < 100 ? `${+e}º QQ` : String(e);
  }
  window.FER = { tabs, corDe, situacao, sit, FC, tomPct, ehOficial, ehCmt, periodo, escondeDica, mostraDica, estado, exercicioTxt };
})();
