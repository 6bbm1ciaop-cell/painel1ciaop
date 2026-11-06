/* ==========================================================================
   INTERFACE › EXPORTAÇÃO (UI.exp)
   Lista filtrada para planilha (CSV que abre no Excel e no Google Planilhas),
   relatório em PDF (impressão → "Salvar como PDF") e PDF da tela atual,
   encaixado para caber o máximo possível em uma folha A4.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  // protege texto para HTML
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  // data e hora para o nome do arquivo
  const agora = () => {
    const d = new Date();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // "Gerado em dd/mm/aaaa hh:mm" do rodapé dos relatórios
  const carimbo = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  // nome de arquivo sem acentos
  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  // texto "limpo" de uma célula: chips e listas viram "A, B, C"; ícones e setas de ordenação saem
  function textoCelula(td) {
    const c = td.cloneNode(true);
    c.querySelectorAll('svg, .sr-only, button.icon-btn').forEach((x) => x.remove());
    const chips = c.querySelectorAll('.chips > *');
    if (chips.length) return [...chips].map((x) => x.textContent.trim()).filter(Boolean).join(', ');
    return c.textContent.replace(/\s+/g, ' ').replace(/[▲▼]/g, '').trim().replace(/^[–-]$/, '');
  }
  // lê a tabela exatamente como está na tela (já filtrada e ordenada)
  function dadosDaTabela(el) {
    const t = el && (el.tagName === 'TABLE' ? el : el.querySelector('table'));
    if (!t) return { cab: [], linhas: [] };
    const ths = [...t.querySelectorAll('thead th')];
    const usa = ths.map((th, i) => i).filter((i) => !ths[i].classList.contains('idx') && ths[i].textContent.trim() !== '');
    const cab = usa.map((i) => ths[i].textContent.replace(/[▲▼]/g, '').trim());
    const linhas = [...t.querySelectorAll('tbody tr')].filter((tr) => !tr.querySelector('td[colspan]'))
      .map((tr) => { const tds = [...tr.children]; return usa.map((i) => (tds[i] ? textoCelula(tds[i]) : '')); });
    return { cab, linhas };
  }

  // baixa um arquivo gerado no navegador
  function baixa(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // CSV com ";" e BOM: abre direto no Excel (pt-BR) e importa no Google Planilhas
  function planilha(titulo, { cab, linhas }) {
    const q = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '﻿' + [cab, ...linhas].map((l) => l.map(q).join(';')).join('\r\n');
    baixa(`${slug(titulo)}-${carimbo()}.csv`, csv, 'text/csv;charset=utf-8');
  }


  /* ---------- caber o máximo possível em uma página ----------
     Área útil da folha A4 em px de tela (96 px por polegada), descontadas as margens de 8 mm. */
  const MM = 96 / 25.4, MARGEM = 8;
  const FOLHA = { retrato: { w: (210 - 2 * MARGEM) * MM, h: (297 - 2 * MARGEM) * MM }, paisagem: { w: (297 - 2 * MARGEM) * MM, h: (210 - 2 * MARGEM) * MM } };
  const ZMIN = 0.5;   // abaixo disso a letra fica pequena demais: o conteúdo segue para a página seguinte
  const FOLGA = 0.97; // pequena sobra para não "vazar" uma linha para a 2ª página
  // mede o conteúdo em várias larguras e devolve a combinação (orientação, largura, zoom) que deixa a letra maior cabendo em 1 página
  function melhorEncaixe(mede, larguras, orientacoes = ['paisagem', 'retrato']) {
    let melhor = null;
    for (const o of orientacoes) {
      const F = FOLHA[o];
      for (const L of larguras(F)) {
        const H = mede(L, o);
        const z = Math.min(1, F.w / L, (F.h * FOLGA) / H);
        if (!melhor || z > melhor.z + 0.005) melhor = { o, L, z, H };
      }
    }
    melhor.z = Math.max(ZMIN, melhor.z);
    return melhor;
  }
  // tamanho e orientação da folha (A4 em pé ou deitada)
  function estiloPagina(doc, o) {
    let st = doc.getElementById('pgEncaixe');
    if (!st) { st = doc.createElement('style'); st.id = 'pgEncaixe'; doc.head.appendChild(st); }
    st.textContent = `@page { size: A4 ${o === 'paisagem' ? 'landscape' : 'portrait'}; margin: ${MARGEM}mm; }`;
  }
  // relatório (lista): mesma tabela, letra reduzida até caber na folha
  function cabeEmUmaPagina(doc) {
    const b = doc.body;
    const mede = (L) => { b.style.zoom = 1; b.style.width = L + 'px'; return b.scrollHeight; };
    const r = melhorEncaixe(mede, (F) => [F.w, F.w * 1.25, F.w * 1.5, F.w * 1.8].map(Math.round));
    b.style.width = r.L + 'px'; b.style.zoom = r.z;
    estiloPagina(doc, r.o);
    return r;
  }

  // relatório para impressão / PDF, com cabeçalho institucional e filtros aplicados
  function relatorio(titulo, { cab, linhas }, { filtros = '', subtitulo = '' } = {}) {
    const u = C.unidade || {};
    const brasao = u.brasao ? new URL(u.brasao, location.href).href : '';
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)} – ${carimbo()}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 10.5pt/1.35 Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
  header img { width: 46px; height: 46px; object-fit: contain; }
  header .u { font-size: 9pt; color: #333; text-transform: uppercase; letter-spacing: .04em; }
  h1 { font-size: 14pt; margin: 2px 0 0; text-transform: uppercase; letter-spacing: .02em; }
  .meta { display: flex; justify-content: space-between; gap: 12px; font-size: 9pt; color: #333; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  thead { display: table-header-group; }
  th { background: #e6e8ea; text-align: left; font-weight: 700; border: 1px solid #9aa0a6; padding: 4px 5px; }
  td { border: 1px solid #c4c8cc; padding: 3px 5px; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f6f7; }
  tr { page-break-inside: avoid; }
  td.n { width: 28px; text-align: right; color: #555; }
  footer { margin-top: 8px; font-size: 8.5pt; color: #444; display: flex; justify-content: space-between; }
</style></head><body>
<header>${brasao ? `<img src="${esc(brasao)}" alt="">` : ''}<div><div class="u">${esc([u.corporacao, u.batalhao, u.nome].filter(Boolean).join(' – '))}</div><h1>${esc(titulo)}</h1></div></header>
<div class="meta"><span>${subtitulo ? esc(subtitulo) + ' · ' : ''}${filtros ? 'Filtros: ' + esc(filtros) : 'Sem filtros'}</span><span>Emitido em ${agora()}</span></div>
<table><thead><tr><th>Nº</th>${cab.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${linhas.length ? linhas.map((l, i) => `<tr><td class="n">${i + 1}</td>${l.map((v) => `<td>${esc(v) || '–'}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cab.length + 1}">Nenhum registro nos filtros escolhidos.</td></tr>`}</tbody></table>
<footer><span>Total: ${linhas.length} registro(s)</span><span>${esc(u.sigla || '')} · Painel de Gestão Operacional</span></footer>
</body></html>`;
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    Object.assign(fr.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(fr);
    // o iframe precisa ter tamanho para medir o conteúdo (fica fora da tela)
    Object.assign(fr.style, { left: '-20000px', top: '0', right: 'auto', bottom: 'auto', width: '1200px', height: '800px' });
    const d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    const imprime = () => { try {
      cabeEmUmaPagina(d);
      fr.contentWindow.focus();
      fr.contentWindow.print();
    } finally { setTimeout(() => fr.remove(), 60000); } };
    const img = d.querySelector('img');
    if (img && !img.complete) { img.onload = img.onerror = () => setTimeout(imprime, 50); } else setTimeout(imprime, 100);
  }

  // prepara a tela atual para impressão: esconde menu/topo/botões, escolhe largura, orientação e zoom
  // para caber em uma página (até o limite de leitura). Devolve a função que desfaz tudo.
  // A medição é feita numa cópia da tela com a largura da folha, porque na impressão o navegador
  // aplica as regras de layout pela largura do papel, e não pela largura do monitor.
  async function preparaTela(titulo) {
    const antigo = document.title, root = document.documentElement, tema = root.dataset.theme, ajustado = root.classList.contains('ajustado');
    const v = document.getElementById('view');
    const estilos = [...document.querySelectorAll('style, link[rel="stylesheet"]')].filter((e) => e.id !== 'pgEncaixe').map((e) => e.outerHTML).join('');
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    Object.assign(fr.style, { position: 'fixed', left: '-30000px', top: '0', width: '1100px', height: '900px', border: '0' });
    document.body.appendChild(fr);
    const d = fr.contentDocument;
    d.open(); d.write(`<!doctype html><html lang="pt-BR" data-theme="light"><head><meta charset="utf-8"><base href="${esc(location.href)}">${estilos}</head><body class="imprimindo"><div class="app"><div class="main"><main class="content" id="view">${v.innerHTML}</main></div></div></body></html>`); d.close();
    await new Promise((ok) => (d.readyState === 'complete' ? ok() : fr.addEventListener('load', ok, { once: true })));
    try { await Promise.race([d.fonts.ready, new Promise((ok) => setTimeout(ok, 1500))]); } catch (e) { /* */ }
    const cv = d.getElementById('view');
    const mede = (L, o) => { fr.style.width = Math.round(FOLHA[o].w) + 'px'; cv.style.width = L + 'px'; return cv.scrollHeight; };
    const r = melhorEncaixe(mede, (F) => [Math.round(F.w), 1100, 1300, 1500, 1700, 1900].filter((L) => L >= F.w - 1));
    fr.remove();

    document.title = `${titulo} – ${carimbo()}`;
    root.dataset.theme = 'light';            // papel branco, mesmo com o painel no tema escuro
    root.classList.remove('ajustado');       // o encaixe na folha substitui o "Ajustar layout à tela"
    document.body.classList.add('imprimindo');
    v.style.width = r.L + 'px'; v.style.zoom = r.z;
    estiloPagina(document, r.o);
    let feito = false;
    return () => {
      if (feito) return; feito = true;
      document.body.classList.remove('imprimindo'); v.style.width = ''; v.style.zoom = '';
      document.title = antigo; if (tema) root.dataset.theme = tema; else delete root.dataset.theme;
      if (ajustado) root.classList.add('ajustado');
      const st = document.getElementById('pgEncaixe'); if (st) st.remove();
    };
  }
  // imprime a tela atual; o nome sugerido do PDF vem do título
  async function imprimirTela(titulo) {
    const desfaz = await preparaTela(titulo);
    const fim = () => { window.removeEventListener('afterprint', fim); desfaz(); };
    window.addEventListener('afterprint', fim);
    setTimeout(() => { window.print(); setTimeout(fim, 500); }, 80);
  }

  // botões padrão: "Planilha" e "PDF" (lista) ou só "PDF" (tela)
  const btnLista = (id) => `<div class="exp-btns no-print"><button type="button" class="btn ghost sm" data-exp="csv" data-alvo="${id}" title="Baixar a lista filtrada como planilha (abre no Excel e no Google Planilhas)">${ICON('sheet')}<span>Planilha</span></button><button type="button" class="btn ghost sm" data-exp="pdf" data-alvo="${id}" title="Relatório da lista filtrada para imprimir ou salvar em PDF">${ICON('printer')}<span>PDF</span></button></div>`;
  // botão "PDF da tela"
  const btnTela = (id = 'telaPdf') => `<button type="button" class="btn ghost no-print" id="${id}" title="Imprimir esta tela ou salvar em PDF">${ICON('printer')}<span>Exportar PDF</span></button>`;

  // liga os botões de lista de uma tela: info() devolve { titulo, filtros }
  function ligaLista(view, info) {
    view.querySelectorAll('[data-exp]').forEach((b) => (b.onclick = () => {
      const dados = dadosDaTabela(view.querySelector('#' + b.dataset.alvo));
      const { titulo, filtros, subtitulo } = info();
      if (b.dataset.exp === 'csv') planilha(titulo, dados); else relatorio(titulo, dados, { filtros, subtitulo });
    }));
  }

  Object.assign(window.UI, { exp: { dadosDaTabela, planilha, relatorio, imprimirTela, preparaTela, cabeEmUmaPagina, btnLista, btnTela, ligaLista } });
})();
