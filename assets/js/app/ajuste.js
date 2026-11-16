/* ==========================================================================
   APP › AJUSTAR LAYOUT À TELA — zoom de todo o painel (APP.ajuste)
   Reduz letras e espaços para caber mais na tela do computador.
   modo: '' = desligado, 'auto' = conforme a altura da janela, ou '0.9' / '0.8' / '0.7'.
   Avisa as telas pelo evento 'painel-ajuste' (ex.: mapas e quadros de viaturas).
   ========================================================================== */
(function () {
  // objeto global do app (criado aqui se ainda não existir; app/app.js completa)
  const APP = (window.APP = window.APP || {});
  const root = document.documentElement;

  let ajModo = PREFS.ler('ajuste', '');
  // zoom automático conforme a altura da janela (entre 0,7 e 0,95)
  const ajAuto = () => Math.max(0.7, Math.min(0.95, Math.round((innerHeight / 1080) * 0.95 * 20) / 20));
  // aplica o zoom em todo o painel e avisa as telas (evento "painel-ajuste")
  function aplicaAjuste() {
    const z = ajModo === 'auto' ? ajAuto() : (+ajModo || 1);
    root.style.setProperty('--z', z);
    root.classList.toggle('ajustado', z < 1);
    APP.zoom = z;
    const tb = document.querySelector('.topbar'); if (tb) root.style.setProperty('--stick', (tb.offsetHeight + 16) + 'px');
    window.dispatchEvent(new Event('painel-ajuste'));
  }
  APP.zoom = 1;
  APP.ajuste = {
    modo: () => ajModo,
    nivel: () => APP.zoom,
    define(m) { ajModo = m || ''; PREFS.gravar('ajuste', ajModo); aplicaAjuste(); },
  };
  aplicaAjuste();
  window.addEventListener('resize', () => { if (ajModo === 'auto') aplicaAjuste(); });
})();
