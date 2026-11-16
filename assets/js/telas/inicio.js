/* ==========================================================================
   TELA › INÍCIO (#inicio)
   Tela de entrada no modelo da home do Data Studio: faixa com os brasões,
   situação do serviço em uma linha ("Disponível – Sede e PEMAD"), atalhos,
   considerações e a barra "Ajustar layout à tela".
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const ATALHOS = [
    ['geral', 'grid', 'Geral'],
    ['dados', 'user', 'Dados completos'],
    ['cursos', 'badge', 'Cursos operacionais'],
    ['calendario', 'calendar', 'Calendário amplo'],
    ['ferias', 'plane', 'Férias'],
    ['licencas', 'file', 'Licenças'],
    ['empenhos', 'clock', 'Empenhos semanais'],
    ['empenhos-horas', 'clock', 'Horas excedentes'],
    ['ddqod', 'chart', 'DDQOD'],
    ['viaturas', 'truck', 'Viaturas'],
    ['aniversariantes', 'cake', 'Aniversariantes do mês'],
    ['articulacao', 'map', 'Área de articulação / mapas'],
  ];
  const CONSIDERACOES = [
    'Clique nos botões para abrir a tela correspondente. O menu lateral dá acesso a todas as telas.',
    'Os dados são atualizados automaticamente a partir das planilhas Google da 1ª Cia Op.',
    'Férias têm duas telas: por período (geral) e por data.',
    'Use os filtros de cada tela. "Limpar filtros" volta à visão completa.',
    'No DDQOD, clique em um posto/graduação para filtrar todos os gráficos.',
    'A busca no topo encontra o militar pelo nome, nome de guerra ou nº BM.',
    'Na tela Geral, clique no militar para ver a ficha com foto.',
    'Painel otimizado para Google Chrome, no computador e no celular.',
  ];

  PAGES.inicio = {
    title: 'Painel de Gestão Operacional',
    render(view) {
      const U = C.unidade;
      const hoje = DS.hoje();
      const feriasHoje = DS.ligada('ferias') ? DS.feriasEm(hoje).length : null;
      const anivMes = DS.militares().filter((m) => m.nascimento && DS.parse(m.nascimento).getMonth() === hoje.getMonth()).length;
      const img = (src, alt, cls) => (src ? `<img class="${cls}" src="${src}" alt="${UI.esc(alt)}">` : '<span></span>');

      view.innerHTML = `<div class="page home">
        <header class="home-band">
          ${img(U.brasao, 'Brasão do CBMMG', 'hb-cb')}
          <h2>Painel de Gestão Operacional</h2>
          ${img(U.brasaoBatalhao, 'Brasão do ' + U.batalhao, 'hb-bbm')}
        </header>
        <div class="home-sub"><h3>${UI.esc(U.sigla.replace('Cia Op', 'Cia. Operacional'))}</h3></div>

        <div class="home-status" id="homeStatus"></div>

        <div class="ajuste-bar" id="ajusteBar">
          <span>${ICON('grid')} Ajustar layout à tela</span>
          <div class="seg" role="group" aria-label="Ajustar layout à tela">${[['', 'Desligado'], ['auto', 'Automático'], ['0.9', '90%'], ['0.8', '80%'], ['0.7', '70%']].map(([k, t]) => `<button type="button" data-ajuste="${k}" aria-pressed="${APP.ajuste.modo() === k}">${t}</button>`).join('')}</div>
          <span class="muted">${APP.zoom < 1 ? `Letras e espaços em ${Math.round(APP.zoom * 100)}% em todas as telas.` : 'Diminui letras e espaços para ver mais sem rolar a tela.'}</span>
        </div>

        <div class="home-grid">
          <nav class="atalhos" aria-label="Telas do painel">
            ${ATALHOS.map(([id, ic, t]) => `<a class="atalho" href="#${id}"><span class="at-ic">${ICON(ic)}</span><span>${t}</span></a>`).join('')}
          </nav>
          <section class="consid">
            <h3>Considerações</h3>
            <ul>${CONSIDERACOES.map((t) => `<li>${t}</li>`).join('')}</ul>
          </section>
        </div>
      </div>`;

      view.querySelectorAll('[data-ajuste]').forEach((b) => (b.onclick = () => { APP.ajuste.define(b.dataset.ajuste); PAGES.inicio.render(view); }));
      const tick = () => {
        const el = document.getElementById('homeStatus'); if (!el) { clearInterval(PAGES.inicio._t); return; }
        const n = new Date(), s = DS.servicoAgora(n);
        el.innerHTML = `
          <div class="hs-item hs-hora"><b class="num">${UI.hora(n)}</b><span>${UI.SEM[n.getDay()]}, ${UI.data(n)}</span></div>
          <a class="hs-item" href="#calendario" style="--pc:var(--p${s.pel})"><small>Serviço agora</small><span><i class="sw"></i><b>${s.pel}º Pel</b> + ${s.pel}ª Ala PEMAD</span></a>
          ${(() => { const r = window.EMP ? EMP.resumoDia(s.inicio) : null, v = window.VTR ? VTR.disponiveis() : null; return `<a class="hs-item hs-disp" href="#empenhos" title="Militares em plantão operacional (já descontadas férias, licenças e lançamentos dos Empenhos) e viaturas não baixadas (sem as motos MO), só da Sede e do PEMAD">
            <small>Disponível – Sede e PEMAD</small>
            <span><b class="num">${r ? r.total.disp : '–'}</b> militares · <b class="num">${v ? v.total : '–'}</b> viaturas</span>
            <span class="muted hs-det">Sede ${r ? r.sede.disp : '–'} / ${v ? v.sede : '–'} · PEMAD ${r ? r.pemad.disp : '–'} / ${v ? v.pemad : '–'} <small>(mil./vtr)</small></span></a>`; })()}
          ${feriasHoje != null ? `<a class="hs-item" href="#ferias-data"><small>De férias hoje</small><span><b class="num">${feriasHoje}</b> militar(es)</span></a>` : ''}
          <a class="hs-item" href="#aniversariantes"><small>Aniversariantes do mês</small><span><b class="num">${anivMes}</b></span></a>`;
      };
      clearInterval(PAGES.inicio._t); tick(); PAGES.inicio._t = setInterval(tick, 20000);
    },
  };
})();
