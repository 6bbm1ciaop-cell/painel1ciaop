/* ==========================================================================
   INTERFACE › LISTA DE SELEÇÃO MÚLTIPLA (filtros de OBM, posto, habilitação…)
   Abre ao clicar; marque quantos quiser. "Todos" limpa, "Pronto" fecha.
   Uso:
     html += UI.multiSel(estado, 'cObm', 'obm', 'OBM', DS.obms());   // estado.obm = []
     UI.ligaMultiSel(view, estado, redesenha);                        // depois de montar a tela
   A lista que estava aberta continua aberta depois de redesenhar (estado._aberto).
   ========================================================================== */
(function () {
  const { esc } = UI;
  // texto do campo fechado: "Todos", "1º Pel, 2º Pel" ou "3 selecionados"
  const resumo = (sel) => (!sel.length ? 'Todos' : sel.length <= 2 ? sel.join(', ') : `${sel.length} selecionados`);

  // toque/clique fora de uma lista aberta fecha a lista ("pointerdown" funciona também no iPhone,
  // onde tocar numa área sem botão não gera "click")
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.msel')) document.querySelectorAll('.msel[open]').forEach((o) => { o.open = false; });
  });

  // no computador, se a lista aberta passar da borda direita da tela, desloca para a esquerda
  // (no celular ela vira um painel fixo na parte de baixo da tela; veja componentes.css)
  function cabeNaTela(d) {
    const pop = d.querySelector('.multi-pop');
    pop.style.left = '';
    if (matchMedia('(max-width: 720px)').matches) return;
    const r = pop.getBoundingClientRect(), sobra = r.right - (document.documentElement.clientWidth - 8);
    if (sobra > 0) pop.style.left = -sobra + 'px';
  }

  Object.assign(UI, {
    /** HTML do campo. estado[campo] é a lista de valores marcados; opcoes: valores ou pares [valor, texto]. */
    multiSel(st, id, campo, label, opcoes) {
      const marcados = st[campo];
      // cada opção: 'valor' ou ['valor', 'texto mostrado'] (ex.: ['UR', 'UR – Unidade de Resgate'])
      const itens = opcoes.map((o) => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<label><input type="checkbox" value="${esc(v)}" ${marcados.includes(v) ? 'checked' : ''}><span class="msel-t">${esc(t)}</span></label>`;
      }).join('');
      return `<div class="field"><span class="lbl" id="${id}Lbl">${label}</span>
    <details class="multi msel" id="${id}" data-campo="${campo}" ${st._aberto === id ? 'open' : ''}>
      <summary class="select ${marcados.length ? 'tem' : ''}" aria-labelledby="${id}Lbl" title="${esc(marcados.join(', ') || 'Todos')}">${esc(resumo(marcados))}</summary>
      <div class="multi-pop"><div class="multi-tit">${label}</div><div class="multi-list">${itens}</div>
        <div class="multi-foot"><button class="btn ghost" type="button" data-msel-limpa>Todos</button><button class="btn" type="button" data-msel-ok>Pronto</button></div></div>
    </details></div>`;
    },

    /** Liga todas as listas .msel da tela ao estado; cada marcação redesenha a tela (rer). */
    ligaMultiSel(view, st, rer) {
      view.querySelectorAll('.msel').forEach((d) => {
        const campo = d.dataset.campo;
        if (d.open) cabeNaTela(d);
        // só uma lista aberta por vez
        d.addEventListener('toggle', () => {
          if (d.open) {
            view.querySelectorAll('.msel[open]').forEach((o) => { if (o !== d) o.open = false; });
            st._aberto = d.id;
            cabeNaTela(d);
          } else if (st._aberto === d.id) st._aberto = null;
        });
        d.querySelectorAll('input[type=checkbox]').forEach((cb) => cb.addEventListener('change', () => {
          const rolagem = d.querySelector('.multi-list').scrollTop;
          st[campo] = [...d.querySelectorAll('input:checked')].map((x) => x.value);
          st._aberto = d.id;
          rer();
          const nova = view.querySelector('#' + d.id + ' .multi-list');
          if (nova) nova.scrollTop = rolagem;   // a lista não volta ao topo
        }));
        d.querySelector('[data-msel-limpa]').onclick = () => { st[campo] = []; st._aberto = d.id; rer(); };
        d.querySelector('[data-msel-ok]').onclick = () => { st._aberto = null; d.open = false; };
      });
    },
  });
})();
