/* ==========================================================================
   INTERFACE › TABELA com ordenação por coluna e modo "ficha" no celular
   UI.table(elemento, { cols, rows, sort, onRow, rowCls, selected, maxH, compact, ... })
   selected: id da linha marcada (ou função que devolve o id)
   cols: [{ key, label, cls, render(linha) → html, sort(linha) → valor, full, nosort }]
   ========================================================================== */
(function () {
  const { esc } = UI;
  Object.assign(UI, {
    // desenha a tabela dentro de el e liga ordenação e clique nas linhas
    table(el, { cols, rows, sort = null, dir = 1, index = true, onRow = null, rowCls = null, selected = null, empty = 'Nenhum registro para os filtros escolhidos.', compact = false, stack = true, maxH = false }) {
      const st = { sort, dir };
      const draw = () => {
        // selected pode ser o id da linha marcada ou uma função que devolve o id (vale a marcação atual ao reordenar)
        const selId = typeof selected === 'function' ? selected() : selected;
        let data = rows.slice();
        if (st.sort) {
          const c = cols.find((x) => x.key === st.sort);
          const f = c.sort || ((r) => r[c.key]);
          data.sort((a, b) => { const x = f(a), y = f(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
        }
        const head = (index ? '<th class="idx"><span class="sr">Nº</span></th>' : '') + cols.map((c) => `<th class="${c.cls || ''} ${st.sort === c.key ? 'sorted' : ''}" ${c.nosort ? '' : `data-sort="${c.key}"`} scope="col">${esc(c.label)}${c.nosort ? '' : `<span class="arr">${st.sort === c.key ? (st.dir > 0 ? '▲' : '▼') : '▲'}</span>`}</th>`).join('');
        const body = data.length ? data.map((r, i) => `<tr class="${onRow ? 'click' : ''} ${onRow && selId && selId === r.id ? 'sel' : ''} ${rowCls ? rowCls(r) || '' : ''}" ${onRow ? `data-id="${esc(r.id)}" tabindex="0"` : ''}>${index ? `<td class="idx">${i + 1}.</td>` : ''}${cols.map((c) => `<td class="${c.cls || ''} ${c.full ? 'full' : ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : UI.dash(r[c.key])}</td>`).join('')}</tr>`).join('')
          : `<tr><td colspan="${cols.length + (index ? 1 : 0)}" class="full"><div class="empty">${empty}</div></td></tr>`;
        el.innerHTML = `<div class="tbl-wrap ${maxH ? 'scroll-y' : ''}"><table class="tbl ${stack ? 'stack' : ''} ${compact ? 'compact' : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
        el.querySelectorAll('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
          const k = th.dataset.sort;
          st.dir = st.sort === k ? -st.dir : 1;
          st.sort = k;
          draw();
        }));
        if (onRow) el.querySelectorAll('tr[data-id]').forEach((tr) => {
          tr.addEventListener('click', (e) => { if (e.target.closest('button,a')) return; onRow(tr.dataset.id); });
          tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') onRow(tr.dataset.id); });
        });
      };
      draw();
    },
  });
})();
