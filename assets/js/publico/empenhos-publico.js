/* ==========================================================================
   PÁGINA PÚBLICA DOS EMPENHOS (empenhos.html?c=CÓDIGO)
   Sem login: pede ao Apps Script (ação "publico") as semanas gravadas e mostra a
   "cópia pública" de cada uma (montada pelo painel; ver dados/publico.js).
   Só leitura. Código errado ou trocado → aviso para pedir o link novo.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const SEM_L = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const parse = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
  const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dmy = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const fimDe = (seg) => { const d = parse(seg); d.setDate(d.getDate() + 6); return d; };
  const quando = (t) => { const m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` às ${m[4]}:${m[5]}` : ''}` : ''; };

  // preferências deste navegador: tema (o mesmo do painel) e zoom da página pública
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* */ } };
  const root = document.documentElement;
  const tema = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const SVG_SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const SVG_LUA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';
  /* ajuste à tela (botões como "Ajustar layout à tela" da tela Início):
     'largura' = os 7 dias ocupam toda a largura (padrão no computador); 'tela' = semana inteira cabe na tela;
     '0.9' / '0.8' / '0.7' = tamanho fixo; '' = normal (no celular, uma aba por dia) */
  const salvo = lsGet('painel-publico-zoom');
  const zoom = { modo: salvo != null ? salvo : (innerWidth > 900 ? 'largura' : ''), pct: 100 };
  if (/^\d{2,3}$/.test(zoom.modo)) zoom.modo = String(Math.max(0.5, Math.min(1.5, +zoom.modo / 100)));   // 4.70/4.71 guardavam "90"
  const AJUSTES = [['', 'Normal'], ['largura', 'Largura da tela'], ['tela', 'Semana inteira'], ['0.9', '90%'], ['0.8', '80%'], ['0.7', '70%']];
  // "Só totais": recolhe as listas de militares (lembrado no navegador)
  let recolhido = lsGet('painel-publico-recolher') === '1';
  const MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const SVG_GRADE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  const SVG_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>', SVG_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  const url = new URL(location.href);
  const codigo = url.searchParams.get('c') || '';
  const est = { semanas: [], seg: '', cache: new Map(), dia: '' };

  // brasões e unidade (config.js)
  const und = C.unidade || {};
  [['#pbCbmmg', und.brasao], ['#pbBbm', und.brasaoBatalhao]].forEach(([s, src]) => { const im = $(s); if (src) im.src = src; else im.hidden = true; });
  $('#pbUnd').textContent = `${und.batalhao || '6º BBM'} · ${(und.nome || '1ª Companhia Operacional').replace('Companhia', 'Cia')}`;

  async function pede(seg) {
    if (!C.appsScriptUrl) throw new Error('Endereço do Apps Script não configurado.');
    const r = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ acao: 'publico', c: codigo, seg: seg || '' }) });
    const j = await r.json();
    if (!j.ok) throw Object.assign(new Error(j.erro || 'erro'), { codigo: j.erro });
    return j;
  }

  function msg(html) { $('#pbMain').innerHTML = `<p class="pub-msg">${html}</p>`; }

  const linha = (x, i) => `<li><div class="emp-row ${x[2] === 'op' ? '' : 'fora r-' + esc(x[2] || 'outro')}"><span class="i">${i + 1}</span><span class="nm">${esc(x[0])}${x[3] ? `<small class="ext-org" title="Reforço de outra OBM">${esc(x[3] === 1 ? 'outra OBM' : x[3])}</small>` : ''}${x[4] ? `<small>${esc(x[4])}</small>` : ''}</span><span class="pill st-${esc(x[2] || 'outro')}">${esc(x[1])}</span></div></li>`;
  const lista = (ls) => ls.length ? `<ol class="emp-lista">${ls.map(linha).join('')}</ol>` : '<ol class="emp-lista"><li class="muted vazio">Sem militares</li></ol>';
  const cont = (dd, nn, rot) => `<div class="emp-cont"><span class="rot">${rot}</span><span>Diurno <b class="num">${dd}</b></span><span>Noturno <b class="num">${nn}</b></span></div>`;

  function diaHtml(x, hojeIso) {
    const d = parse(x.iso), c = x.c || {}, hoje = x.iso === hojeIso;
    return `<section class="emp-dia pc${x.p} ${hoje ? 'hoje' : ''} ${x.iso === est.dia ? 'ativo' : ''}" data-dia="${x.iso}">
      <header class="emp-h"><span class="wd">${SEM_L[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}${hoje ? ' <b>(hoje)</b>' : ''}</span><b class="pel-t">${x.p}º Pelotão – SEDE</b></header>
      <div class="emp-sec">${lista(x.sede)}${x.refs.length ? `<div class="emp-sub">Reforço</div>${lista(x.refs)}` : ''}</div>
      ${cont(c.sedeD, c.sedeN, 'Militares sede')}
      <div class="emp-bloco">${x.p}ª Ala – PEMAD</div>
      <div class="emp-sec">${lista(x.pemad)}${x.refsP && x.refsP.length ? `<div class="emp-sub">Reforço</div>${lista(x.refsP)}` : ''}</div>
      ${cont(c.pemD, c.pemN, 'Militares PEMAD')}
      <div class="emp-total"><span class="rot">Total geral (sede + PEMAD)</span><span class="t-${esc(c.tD)}">Diurno <b class="num">${c.totD}</b></span><span class="t-${esc(c.tN)}">Noturno <b class="num">${c.totN}</b></span></div>
      <div class="pub-obs"><span>Observação do dia</span>${x.obsDia ? esc(x.obsDia) : '<i class="vazio">—</i>'}</div>
      <dl class="emp-resumo">
        <dt>${x.p}º Pelotão</dt><dd>Sub/Sgt <b>${c.pelSgt}</b></dd><dd>Cb/Sd <b>${c.pelCb}</b></dd>
        <dt>${x.p}ª Ala</dt><dd>Sub/Sgt <b>${c.alaSgt}</b></dd><dd>Cb/Sd <b>${c.alaCb}</b></dd>
        <dt title="Sede + PEMAD">Mot. cat. D</dt><dd class="mp t-${esc(c.tMP)}">MP <b>${c.mp}</b></dd>
      </dl>
    </section>`;
  }

  // abas das semanas (como na tela Empenhos semanais): "02/11 – 08/11", com o mês entre as abas
  function abasHtml(seg, segHoje) {
    let mesAnt = -1;
    return est.semanas.map((v) => {
      const s0 = parse(v), s6 = fimDe(v), m = s6.getMonth();
      const sep = m !== mesAnt ? `<span class="st-sep">${MES3[m]}${s6.getFullYear() !== new Date().getFullYear() ? ' ' + s6.getFullYear() : ''}</span>` : ''; mesAnt = m;
      const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const c = est.cache.get(v), prev = c && c.semana && !c.semana.versao;   // não gravada: prévia automática
      return `${sep}<button type="button" class="st-tab ${v === seg ? 'on' : ''} ${v === segHoje ? 'atual' : ''} ${prev ? 'pub-prev' : 'grav'}" data-seg="${v}" aria-pressed="${v === seg}" title="Semana de ${dmy(s0)} a ${dmy(s6)}${prev ? ' – ainda não gravada (prévia automática)' : ' – gravada'}">${dm(s0)} – ${dm(s6)}</button>`;
    }).join('');
  }

  function desenha(j) {
    const s = j.semana, seg = j.seg, hojeIso = isoDe(new Date());
    document.title = `Empenhos Gerais ${dmy(parse(seg))} a ${dmy(fimDe(seg))} · ${und.sigla || '1ª Cia Op'}`;
    $('#pbTit').innerHTML = `Empenhos Gerais <span class="per">${dmy(parse(seg))} a ${dmy(fimDe(seg))}</span>`;
    const i = est.semanas.indexOf(seg);
    const segHoje = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDe(d); })();
    if (!s.dias.some((x) => x.iso === est.dia)) est.dia = s.dias.some((x) => x.iso === hojeIso) ? hojeIso : s.dias[0].iso;
    $('#pbMain').innerHTML = `
      <div class="sheet-tabs pub-semanas" role="toolbar" aria-label="Semanas gravadas">
        <button class="st-nav" id="pbAnt" type="button" aria-label="Semana anterior" title="Semana anterior" ${i <= 0 ? 'disabled' : ''}>${SVG_L}</button>
        <div class="st-scroll" id="pbScroll">${abasHtml(seg, segHoje)}</div>
        <button class="st-nav" id="pbProx" type="button" aria-label="Próxima semana" title="Próxima semana" ${i >= est.semanas.length - 1 ? 'disabled' : ''}>${SVG_R}</button>
        ${est.semanas.includes(segHoje) ? `<button class="st-hoje" id="pbHoje" type="button" title="Ir para a semana atual">Esta semana</button>` : ''}
      </div>
      <div class="pub-barra">
        <div class="pub-ajuste"><span>${SVG_GRADE} Ajustar à tela</span>
          <div class="seg" role="group" aria-label="Ajustar à tela">${AJUSTES.map(([k, t]) => `<button type="button" data-ajuste="${k}" aria-pressed="${zoom.modo === k}">${t}</button>`).join('')}</div>
          <span class="pub-zpct num" id="pbZPct"></span></div>
        <button type="button" class="pub-btn" id="pbRecolhe" aria-pressed="${recolhido}" title="${recolhido ? 'Mostra de novo os militares de cada dia' : 'Recolhe as listas e mostra só os totais de pelotão, ala e geral'}">${recolhido ? 'Mostrar militares' : 'Só totais'}</button>
        <button type="button" class="pub-tema" id="pbTema" aria-label="${tema() === 'dark' ? 'Modo dia' : 'Modo noite'}" title="${tema() === 'dark' ? 'Modo dia (claro)' : 'Modo noite (escuro)'}">${tema() === 'dark' ? SVG_SOL : SVG_LUA}</button>
        <span class="pub-grav">${s.versao ? `Gravada${s.gravadoEm ? ` em ${quando(s.gravadoEm)}` : ''} · somente consulta` : 'Prévia · semana ainda não gravada'}</span>
      </div>
      ${s.versao ? '' : '<p class="pub-aviso-prev"><b>Semana ainda não gravada.</b> Prévia montada automaticamente com o efetivo de cada pelotão e ala, as férias e as licenças; trocas, folgas e reforços só aparecem depois que a semana for gravada.</p>'}
      <div class="emp-legenda">${[['op', 'Em serviço'], ['ferias', 'Férias / trânsito'], ['lic', 'Licenciado / dispensado'], ['folga', 'Folga / liberado'], ['curso', 'Curso / TPB'], ['gcif', 'GCIF'], ['missao', 'Missão'], ['outro', 'Outros']].map(([c, t]) => `<span class="pill st-${c}">${t}</span>`).join('')}</div>
      <nav class="emp-tabs" aria-label="Dia">${s.dias.map((x) => { const d = parse(x.iso); return `<button type="button" data-tab="${x.iso}" aria-selected="${x.iso === est.dia}" class="pc${x.p}"><span>${SEM[d.getDay()]}</span><b>${d.getDate()}</b><i>${x.p}º</i></button>`; }).join('')}</nav>
      <div class="emp-wrap"><div class="emp-semana">${s.dias.map((x) => diaHtml(x, hojeIso)).join('')}</div></div>`;
    $('#pbRod').textContent = `${und.sigla || '1ª Cia Op'} · ${und.batalhao || '6º BBM'} · ${und.corporacao || 'CBMMG'} — página de consulta: a semana atual e as 8 seguintes (as não gravadas aparecem como prévia)${j.atualizadoEm ? `. Atualizada em ${quando(j.atualizadoEm)}` : ''}.`;
    const vai = (v) => { if (v) abre(v); };
    $('#pbAnt').onclick = () => vai(est.semanas[i - 1]);
    $('#pbProx').onclick = () => vai(est.semanas[i + 1]);
    document.querySelectorAll('#pbScroll .st-tab').forEach((b) => (b.onclick = () => vai(b.dataset.seg)));
    const sc = $('#pbScroll'), on = sc.querySelector('.st-tab.on');
    if (on) { const rs = sc.getBoundingClientRect(), rt = on.getBoundingClientRect(); sc.scrollLeft += rt.left - rs.left - (rs.width - rt.width) / 2; }
    document.body.classList.toggle('emp-recolhido', recolhido);
    $('#pbRecolhe').onclick = () => { recolhido = !recolhido; lsSet('painel-publico-recolher', recolhido ? '1' : null); desenha(j); };
    document.querySelectorAll('[data-ajuste]').forEach((b) => (b.onclick = () => { zoom.modo = b.dataset.ajuste; lsSet('painel-publico-zoom', zoom.modo); aplicaZoom(); }));
    if ($('#pbHoje')) $('#pbHoje').onclick = () => vai(segHoje);
    document.querySelectorAll('.emp-tabs button').forEach((b) => (b.onclick = () => {
      est.dia = b.dataset.tab;
      document.querySelectorAll('.emp-tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
      document.querySelectorAll('.emp-dia').forEach((x) => x.classList.toggle('ativo', x.dataset.dia === est.dia));
    }));
    $('#pbTema').onclick = () => { root.dataset.theme = tema() === 'dark' ? 'light' : 'dark'; lsSet('painel-tema', root.dataset.theme); desenha(j); };
    aplicaZoom();
    // computador: rola até o dia de hoje
    const h = document.querySelector('.emp-dia.hoje'), w = document.querySelector('.emp-wrap');
    if (h && innerWidth > 900 && !document.body.classList.contains('pub-fit')) w.scrollLeft = Math.max(0, h.offsetLeft - w.offsetLeft - 8);
  }

  /* zoom da semana: "Semana na tela" calcula o tamanho para os 7 dias caberem na largura e na altura
     da janela; − e + mudam de 10 em 10% (e saem do modo automático) */
  function aplicaZoom() {
    const sem = document.querySelector('.emp-semana'), wrap = document.querySelector('.emp-wrap');
    if (!sem) return;
    const ativo = zoom.modo !== '';
    document.body.classList.toggle('pub-fit', ativo);
    sem.style.zoom = 1;
    if (zoom.modo === 'tela' || zoom.modo === 'largura') {
      // tamanho natural da semana (zoom 1) × espaço livre da janela
      const larg = sem.scrollWidth, alt = sem.scrollHeight;
      const livreL = wrap.clientWidth, livreA = innerHeight - wrap.getBoundingClientRect().top - 12;
      const k = zoom.modo === 'largura' ? livreL / larg : Math.min(livreL / larg, Math.max(livreA, 200) / alt);
      zoom.pct = Math.max(15, Math.min(zoom.modo === 'largura' ? 250 : 100, Math.floor(k * 1000) / 10));
    } else if (ativo) zoom.pct = Math.max(25, Math.min(150, (+zoom.modo || 1) * 100));
    else zoom.pct = 100;
    sem.style.zoom = zoom.pct / 100;
    document.querySelectorAll('[data-ajuste]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ajuste === zoom.modo));
    const p = $('#pbZPct'); if (p) p.textContent = ativo ? Math.round(zoom.pct) + '%' : '';
  }
  let tz = 0;
  addEventListener('resize', () => { clearTimeout(tz); tz = setTimeout(() => { if (zoom.modo === 'tela' || zoom.modo === 'largura') aplicaZoom(); }, 120); });

  /* Carregamento (4.77):
     - o Apps Script 5.12 manda todas as semanas públicas de uma vez: trocar de semana não faz novo pedido;
     - a última resposta fica guardada neste navegador: a página abre na hora com ela e se atualiza sozinha
       quando chega a resposta nova (alguns segundos depois). */
  const KEY_CACHE = 'painel-publico-cache';
  function guardaResp(j) {
    if (j.todas) Object.keys(j.todas).forEach((k) => est.cache.set(k, { ok: true, semanas: j.semanas, seg: k, semana: j.todas[k].semana, atualizadoEm: j.todas[k].atualizadoEm }));
    else if (j.semana) est.cache.set(j.seg, j);
    est.semanas = j.semanas || [];
  }
  function mostra(seg) {
    const j = est.cache.get(seg) || est.cache.get(est.semanas.includes(est.seg) ? est.seg : est.semanas[0]);
    if (!j || !j.semana) { msg('Ainda não há semana gravada para mostrar.'); return; }
    est.seg = j.seg;
    const u = new URL(location.href); u.searchParams.set('s', j.seg); history.replaceState(null, '', u);
    desenha(j);
  }
  const avisoCarregando = (sim) => { const g = $('.pub-grav'); if (g) g.textContent = sim ? 'Carregando…' : g.textContent; document.body.classList.toggle('pub-carregando', !!sim); };

  async function abre(seg) {
    if (est.cache.has(seg)) { mostra(seg); return; }   // já está aqui: troca na hora
    avisoCarregando(true);
    try {
      const j = await pede(seg);
      guardaResp(j);
      if (j.todas) { try { localStorage.setItem(KEY_CACHE, JSON.stringify({ c: codigo, j })); } catch (e) { /* cheio ou sem armazenamento */ } }
      if (!j.semana) { msg('Ainda não há semana gravada para mostrar.'); return; }
      mostra(seg && est.cache.has(seg) ? seg : j.seg);
    } catch (e) {
      if (e.codigo === 'CODIGO') { try { localStorage.removeItem(KEY_CACHE); } catch (x) { /* */ } msg('<b>Link inválido ou desatualizado.</b><br>Peça o link novo ao comando da 1ª Cia Op.'); }
      else if (e.codigo === 'DESLIGADO') msg('<b>A página pública dos empenhos está desligada.</b>');
      else if (est.seg) { avisoCarregando(false); const g = $('.pub-grav'); if (g) g.textContent = 'Sem conexão agora: mostrando a última consulta'; }
      else msg('Não foi possível carregar os empenhos agora. Verifique a conexão e tente de novo em instantes.');
    } finally { document.body.classList.remove('pub-carregando'); }
  }

  // abertura: mostra a última consulta guardada (se houver) e já pede a atualizada
  async function inicio() {
    const pedida = url.searchParams.get('s') || '';
    let antes = null;
    try { const c = JSON.parse(localStorage.getItem(KEY_CACHE) || 'null'); if (c && c.c === codigo && c.j) antes = c.j; } catch (e) { /* */ }
    if (antes) {
      // semanas que já passaram saem da lista guardada
      const segHoje = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDe(d); })();
      antes.semanas = (antes.semanas || []).filter((s) => s >= segHoje);
      if (antes.semanas.length) { guardaResp(antes); mostra(antes.semanas.includes(pedida) ? pedida : antes.semanas[0]); }
    }
    const atual = est.seg || pedida;
    try {
      const j = await pede(pedida);
      est.cache.clear();   // troca a consulta guardada pela nova
      guardaResp(j);
      try { localStorage.setItem(KEY_CACHE, JSON.stringify({ c: codigo, j })); } catch (e) { /* */ }
      if (!j.semana) { msg('Ainda não há semana gravada para mostrar.'); return; }
      mostra(atual && est.cache.has(atual) ? atual : j.seg);
    } catch (e) {
      if (e.codigo === 'CODIGO') { try { localStorage.removeItem(KEY_CACHE); } catch (x) { /* */ } msg('<b>Link inválido ou desatualizado.</b><br>Peça o link novo ao comando da 1ª Cia Op.'); }
      else if (e.codigo === 'DESLIGADO') msg('<b>A página pública dos empenhos está desligada.</b>');
      else if (antes && est.seg) { const g = $('.pub-grav'); if (g) g.textContent = 'Sem conexão agora: mostrando a última consulta'; }
      else msg('Não foi possível carregar os empenhos agora. Verifique a conexão e tente de novo em instantes.');
    }
  }

  if (!codigo) msg('<b>Link incompleto.</b><br>Use o link enviado pelo comando da 1ª Cia Op.');
  else inicio();
})();
