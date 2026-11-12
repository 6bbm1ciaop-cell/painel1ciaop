/* ==========================================================================
   INTERFACE › GRÁFICOS em SVG/HTML puro (sem biblioteca)
   strip (faixa de dias da escala), barras agrupadas, rosca, barras horizontais.
   Os gráficos com "filtro" viram alvos clicáveis (data-<filtro>) para filtro cruzado.
   ========================================================================== */
(function () {
  const { esc, SEM } = UI;
  Object.assign(UI, {
    /* ---------- faixa de escala (dias × pelotão) ---------- */
    strip(dias) {
      const h = DS.iso(DS.hoje());
      const fer = new Set(DS.feriados(dias[0].getFullYear()).concat(DS.feriados(dias[dias.length - 1].getFullYear())).map((f) => f.data));
      return `<div class="strip">${dias.map((d) => {
        const p = DS.pelotaoDoDia(d), k = DS.iso(d);
        return `<div class="strip-d pc${p} ${k === h ? 'today' : ''} ${fer.has(k) ? 'hol' : ''}" title="${UI.data(d)} – ${p}º Pel${fer.has(k) ? ' (feriado)' : ''}"><span class="wd">${SEM[d.getDay()]}</span><span class="dd">${d.getDate()}</span><span class="pp">${p}º Pel</span></div>`;
      }).join('')}</div>`;
    },

    /* ---------- gráfico de barras agrupadas (SVG) ----------
       grupos: [{ label, valores: [n,...] }], series: [{ nome, cor }] */
    barras(grupos, series, { altura = 220, min = null, largura = 360, filtro = null, ativo = '' } = {}) {
      const W = largura, H = altura, ml = 34, mr = 8, mt = 18, mb = 26;
      const vals = grupos.flatMap((g) => g.valores);
      let max = Math.max(1, ...vals), lo = Math.min(0, min ?? Math.min(0, ...vals));
      const inteiros = vals.every((v) => Number.isInteger(v));
      const passo = inteiros ? Math.max(1, Math.round(UI._passo(max - lo))) : UI._passo(max - lo); max = Math.ceil(max / passo) * passo; lo = Math.floor(lo / passo) * passo;
      const y = (v) => mt + (H - mt - mb) * (1 - (v - lo) / (max - lo));
      const gw = (W - ml - mr) / grupos.length, bw = Math.min(30, (gw * .78) / series.length);
      let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
      for (let v = lo; v <= max + 1e-9; v += passo) s += `<line class="grid-l" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text x="${ml - 6}" y="${y(v) + 3.5}" text-anchor="end">${UI.num(v, Number.isInteger(+v.toFixed(6)) ? 0 : 1)}</text>`;
      s += `<line class="axis-l" x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}"/>`;
      if (!grupos.length) return `<div class="sem-dados">Não há dados</div>`;
      grupos.forEach((g, i) => {
        const x0 = ml + gw * i + (gw - bw * series.length) / 2;
        // filtro cruzado: cada grupo vira um alvo clicável (data-<filtro>)
        if (filtro) s += `<g class="bar-g ${ativo && ativo !== g.label ? 'apagado' : ''} ${ativo === g.label ? 'on' : ''}" data-${filtro}="${esc(g.label)}" role="button" tabindex="0" aria-pressed="${ativo === g.label}" aria-label="Filtrar por ${esc(g.label)}"><rect class="hit" x="${ml + gw * i}" y="${mt - 14}" width="${gw}" height="${H - mt + 14}" />`;
        g.valores.forEach((v, j) => {
          const x = x0 + j * bw, y1 = y(Math.max(v, 0)), y2 = y(Math.min(v, 0));
          s += `<rect x="${x + 1}" y="${y1}" width="${bw - 2}" height="${Math.max(0, y2 - y1) || 0.5}" style="fill:${series[j].cor}" rx="1"><title>${esc(g.label)} – ${esc(series[j].nome)}: ${v}</title></rect>`;
          s += `<text class="lbl-v" x="${x + bw / 2}" y="${v >= 0 ? y1 - 4 : y2 + 11}" text-anchor="middle" ${series[j].corTxt ? `style="fill:${series[j].corTxt}"` : ''}>${Number.isInteger(v) ? v : UI.num(v, 2)}</text>`;
        });
        s += `<text x="${ml + gw * i + gw / 2}" y="${H - 8}" text-anchor="middle" class="${filtro ? 'lbl-g' : ''}">${esc(g.label)}</text>`;
        if (filtro) s += '</g>';
      });
      return s + '</svg>';
    },
    // intervalo "redondo" entre as linhas de grade
    _passo(r) {
      const raw = r / 4;
      const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
      const n = raw / p;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    },

    /* ---------- rosca ---------- */
    rosca(segs, { centro = '', sub = '', filtro = null, ativo = '' } = {}) {
      const tot = segs.reduce((s, x) => s + x.v, 0) || 1, R = 70, r = 46, cx = 90, cy = 90;
      let a0 = -Math.PI / 2, s = `<svg class="chart" viewBox="0 0 180 180" role="img" style="max-width:220px;margin:auto">`;
      segs.forEach((g) => {
        if (!g.v) return;
        const a1 = a0 + (g.v / tot) * Math.PI * 2 - 0.0001, big = a1 - a0 > Math.PI ? 1 : 0;
        const p = (rad, ang) => `${cx + rad * Math.cos(ang)} ${cy + rad * Math.sin(ang)}`;
        s += `<path d="M ${p(R, a0)} A ${R} ${R} 0 ${big} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${big} 0 ${p(r, a0)} Z" style="fill:${g.cor};stroke:var(--surface)" stroke-width="1.5" ${filtro ? `class="seg ${ativo && ativo !== g.nome ? 'apagado' : ''}" data-${filtro}="${esc(g.nome)}" role="button" tabindex="0" aria-label="Filtrar por ${esc(g.nome)}"` : ''}><title>${esc(g.nome)}: ${g.v} (${UI.pct(g.v / tot)})</title></path>`;
        a0 = a1 + 0.0001;
      });
      s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" style="fill:var(--fg);font-family:var(--f-display);font-size:26px;font-weight:600">${esc(centro)}</text><text x="${cx}" y="${cy + 22}" text-anchor="middle">${esc(sub)}</text>`;
      return s + '</svg>';
    },

    /* barras clicáveis com vários itens marcados (filtro "ou") */
    barrasHMulti(itens, marcados) {
      const m = Math.max(1, ...itens.map((i) => i.v));
      return `<div class="bars-h">${itens.map((i) => `<div class="bar-h click ${marcados.has(i.key) ? 'on' : ''}" data-key="${esc(i.key)}" role="checkbox" aria-checked="${marcados.has(i.key)}" tabindex="0" title="${esc(i.title || i.label)}"><span class="lab">${marcados.has(i.key) ? '✓ ' : ''}${esc(i.label)}</span><span class="trk"><span style="width:${(i.v / m) * 100}%"></span></span><span class="v">${i.v}</span></div>`).join('')}</div>`;
    },
    // barras horizontais (clique opcional para filtrar)
    barrasH(itens, { max = null, click = false, ativo = '' } = {}) {
      const m = max || Math.max(1, ...itens.map((i) => i.v));
      return `<div class="bars-h">${itens.map((i) => `<div class="bar-h ${click ? 'click' : ''} ${ativo && ativo === i.key ? 'on' : ''}" ${click ? `data-key="${esc(i.key)}" role="button" tabindex="0"` : ''} title="${esc(i.title || i.label)}"><span class="lab">${esc(i.label)}</span><span class="trk"><span style="width:${(Math.abs(i.v) / m) * 100}%;${i.cor ? `--bc:${i.cor}` : ''}"></span></span><span class="v">${i.v}</span></div>`).join('')}</div>`;
    },
  });
})();
