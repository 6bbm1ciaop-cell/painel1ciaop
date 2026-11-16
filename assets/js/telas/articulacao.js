/* ==========================================================================
   TELAS › MAPAS (#articulacao, #conservacao, #inundacoes, #balnearios)
   Só o mapa (My Maps), como no Data Studio, com botões para trocar de mapa.
   Cada mapa carrega uma vez e fica guardado. URLs em config.js → mapas.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const MAPAS = [
    { id: 'articulacao', chave: 'articulacao', titulo: 'Área de articulação da 1ª Cia Op', curto: 'Área de articulação' },
    { id: 'conservacao', chave: 'conservacao', titulo: 'Unidades de conservação', curto: 'Unidades de conservação' },
    { id: 'inundacoes', chave: 'inundacoes', titulo: 'Manchas de inundação do Rio Doce', curto: 'Manchas de inundação Rio Doce' },
    { id: 'balnearios', chave: 'balnearios', titulo: 'Balneários da região', curto: 'Balneários' },
  ];

  // o mapa ocupa toda a altura que sobra na tela (descontando topo, faixa de aviso e barra inferior do celular)
  function ajusta() {
    const box = document.querySelector('.map-tela .map-box');
    if (!box) return;
    const bn = document.getElementById('bottomNav');
    const baixo = bn && getComputedStyle(bn).display !== 'none' ? bn.getBoundingClientRect().height : 0;
    const topo = box.getBoundingClientRect().top + window.scrollY;
    const z = (window.APP && APP.zoom) || 1;   // com o layout ajustado, a altura em CSS é dividida pelo zoom
    box.style.height = Math.max(360 / z, (window.innerHeight - topo - baixo - 16) / z) + 'px';
  }
  window.addEventListener('resize', ajusta);

  /* Mapas guardados: cada mapa é carregado uma vez e fica aberto (escondido) enquanto o painel estiver aberto.
     Ao voltar a um mapa, ele aparece na hora, sem baixar tudo de novo. Os mapas também são
     pré-carregados em segundo plano alguns segundos depois de abrir o painel (no computador). */
  let caixa = null; const frames = {}; let atual = null, obs = null;
  // área onde os mapas ficam guardados depois de carregados
  function cache() {
    if (!caixa) {
      caixa = document.createElement('div');
      caixa.className = 'map-cache';
      caixa.setAttribute('aria-hidden', 'true');
      document.body.appendChild(caixa);
    }
    return caixa;
  }
  // iframe de um mapa (criado uma vez)
  function frame(m) {
    const url = C.mapas && C.mapas[m.chave]; if (!url) return null;
    if (!frames[m.id]) {
      const f = document.createElement('iframe');
      f.src = url; f.title = m.titulo; f.allowFullscreen = true; f.referrerPolicy = 'no-referrer-when-downgrade'; f.className = 'map-fr';
      f.addEventListener('load', () => {
        f.dataset.ok = '1';
        const ld = document.querySelector('.map-tela .map-carregando');
        if (ld && atual === m.id) ld.hidden = true;
      });
      cache().appendChild(f); frames[m.id] = f;
    }
    return frames[m.id];
  }
  // coloca o mapa guardado exatamente sobre o quadro da tela (ou esconde, fora das telas de mapa)
  function posiciona() {
    const box = document.querySelector('.map-tela .map-box'), c = cache();
    if (!box || !atual) { c.classList.remove('ativo'); Object.values(frames).forEach((f) => f.classList.remove('on')); return; }
    const r = box.getBoundingClientRect();
    Object.assign(c.style, { top: r.top + window.scrollY + 'px', left: r.left + window.scrollX + 'px', width: r.width + 'px', height: r.height + 'px' });
    c.classList.add('ativo');
    Object.entries(frames).forEach(([id, f]) => f.classList.toggle('on', id === atual));
    const ld = box.querySelector('.map-carregando'); if (ld) ld.hidden = !!(frames[atual] && frames[atual].dataset.ok);
  }
  window.addEventListener('resize', () => requestAnimationFrame(posiciona));
  window.addEventListener('painel-ajuste', () => requestAnimationFrame(() => { ajusta(); posiciona(); }));
  window.addEventListener('scroll', () => { if (atual) posiciona(); }, { passive: true });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).split(/[?&]/)[0];
    if (!MAPAS.some((m) => m.id === id)) { atual = null; posiciona(); }
  });
  // pré-carrega os mapas em segundo plano (não no celular nem com economia de dados)
  function preCarrega() {
    const con = navigator.connection || {};
    if (window.innerWidth <= 900 || con.saveData || /2g/.test(con.effectiveType || '')) return;
    MAPAS.forEach((m, i) => setTimeout(() => frame(m), i * 2500));
  }
  window.addEventListener('load', () => setTimeout(preCarrega, 6000));

  // imagens de consulta rápida do mapa (config.js → mapasExtras), na "cortina" da seta ▾
  const extrasDe = (m) => ((C.mapasExtras || {})[m.chave] || []).filter((x) => x && x.img);
  function cortina(extras) {
    return `<div class="map-cortina" id="mapCortina" hidden>
      <div class="map-cort-lista" role="menu">${extras.map((x, i) => `<button type="button" class="map-cort-item" role="menuitem" data-i="${i}">${ICON('eye')}<span><b>${UI.esc(x.titulo)}</b>${x.descricao ? `<small>${UI.esc(x.descricao)}</small>` : ''}</span></button>`).join('')}
        <p class="map-cort-dica"><span class="so-mouse">Passe o mouse para ver · clique para fixar</span><span class="so-toque">Toque para ver ou esconder</span></p></div>
      <figure class="map-cort-img" hidden><img alt="" referrerpolicy="no-referrer"><figcaption><span></span><a target="_blank" rel="noopener">${ICON('link')}Abrir em tamanho grande</a></figcaption></figure>
    </div>`;
  }
  function ligaCortina(view, extras) {
    const seta = view.querySelector('#mapMais'), box = view.querySelector('#mapCortina');
    if (!seta || !box) return;
    const fig = box.querySelector('.map-cort-img'), img = fig.querySelector('img');
    let fixo = null;
    const mostra = (i) => {
      const x = extras[i]; if (!x) { fig.hidden = true; return; }
      if (img.getAttribute('src') !== x.img) img.src = x.img;
      img.alt = x.titulo;
      fig.querySelector('figcaption span').textContent = x.titulo;
      fig.querySelector('a').href = x.img;
      fig.hidden = false;
      box.querySelectorAll('.map-cort-item').forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
    };
    const abre = (sim) => {
      box.hidden = !sim; seta.setAttribute('aria-expanded', String(sim));
      if (sim) {
        // a cortina abre embaixo do botão do mapa selecionado, alinhada à direita da barra
        const bar = view.querySelector('.map-bar').getBoundingClientRect(), tab = seta.closest('.map-tab').getBoundingClientRect();
        const z = (window.APP && APP.zoom) || 1;
        box.style.top = (tab.bottom - bar.top) / z + 6 + 'px';
      } else { fixo = null; fig.hidden = true; }
    };
    seta.onclick = (e) => { e.preventDefault(); abre(box.hidden); };
    box.querySelectorAll('.map-cort-item').forEach((b) => {
      const i = +b.dataset.i;
      b.addEventListener('mouseenter', () => mostra(i));
      b.addEventListener('mouseleave', () => { if (fixo === null) { fig.hidden = true; b.classList.remove('on'); } else mostra(fixo); });
      b.onclick = () => { fixo = fixo === i ? null : i; mostra(i); b.classList.toggle('fixo', fixo === i); };
    });
    // fecha clicando fora ou com Esc
    const fora = (e) => { if (!box.hidden && !box.contains(e.target) && !seta.contains(e.target)) abre(false); };
    const esc = (e) => { if (e.key === 'Escape' && !box.hidden) abre(false); };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    window.addEventListener('hashchange', () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc); }, { once: true });
  }

  // desenha a tela de um mapa
  function tela(view, mapa) {
    const url = C.mapas && C.mapas[mapa.chave];
    const extras = extrasDe(mapa);
    view.innerHTML = `<div class="page map-tela">
      <div class="map-bar">
        <h1>${UI.esc(mapa.titulo)}</h1>
        <nav class="seg" aria-label="Mapas">${MAPAS.map((m) => {
          const sel = m.id === mapa.id, mais = sel && extras.length;
          const a = `<a href="#${m.id}" role="tab" aria-selected="${sel}">${UI.esc(m.curto)}</a>`;
          // mapa selecionado com imagens de consulta: seta ▾ que abre a cortina
          return mais ? `<span class="map-tab" aria-selected="true">${a}<button type="button" class="map-mais" id="mapMais" aria-expanded="false" aria-haspopup="menu" title="Consultas rápidas deste mapa (ex.: ${UI.esc(extras[0].titulo)})" aria-label="Consultas rápidas deste mapa">${ICON('chevronD')}</button></span>` : a;
        }).join('')}</nav>
        ${url ? `<a class="btn ghost map-abrir" href="${UI.esc(url.replace('/embed?', '/viewer?'))}" target="_blank" rel="noopener" title="Abrir no Google My Maps">${ICON('link')}<span>Abrir no Google</span></a>` : ''}
        ${extras.length ? cortina(extras) : ''}
      </div>
      ${url ? `<div class="map-box"><div class="map-carregando">${ICON('map')}<span>Carregando o mapa…</span></div></div>`
        : `<div class="map-slot"><div>${ICON('map')}<b>Mapa não configurado</b><span>Informe a URL de incorporação em <code>config.js → mapas.${mapa.chave}</code>.</span></div></div>`}
    </div>`;
    ajusta();
    ligaCortina(view, extras);
    atual = url ? mapa.id : null;
    if (url) frame(mapa);
    posiciona();
    requestAnimationFrame(() => { ajusta(); posiciona(); });
    const box = view.querySelector('.map-box');
    if (obs) obs.disconnect();
    if (box && window.ResizeObserver) { obs = new ResizeObserver(() => posiciona()); obs.observe(box); }
    // no celular as abas rolam de lado: deixa a aba atual visível
    const seg = view.querySelector('.map-bar .seg'), at = seg && seg.querySelector('[aria-selected="true"]');
    if (at && seg.scrollWidth > seg.clientWidth) seg.scrollLeft = at.offsetLeft - (seg.clientWidth - at.offsetWidth) / 2;
  }

  MAPAS.forEach((m) => { PAGES[m.id] = { title: m.curto, render: (view) => tela(view, m) }; });
})();
