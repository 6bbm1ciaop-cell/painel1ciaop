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

  const linha = (x, i) => `<li><div class="emp-row"><span class="i">${i + 1}</span><span class="nm">${esc(x[0])}${x[3] ? ' <em class="disp-tag">fora</em>' : ''}${x[4] ? `<small>${esc(x[4])}</small>` : ''}</span><span class="pill st-${esc(x[2] || 'outro')}">${esc(x[1])}</span></div></li>`;
  const lista = (ls) => ls.length ? `<ol class="emp-lista">${ls.map(linha).join('')}</ol>` : '<ol class="emp-lista"><li class="muted vazio">Sem militares</li></ol>';
  const cont = (dd, nn, rot) => `<div class="emp-cont"><span class="rot">${rot}</span><span>Diurno <b class="num">${dd}</b></span><span>Noturno <b class="num">${nn}</b></span></div>`;

  function diaHtml(x, hojeIso) {
    const d = parse(x.iso), c = x.c || {}, hoje = x.iso === hojeIso;
    return `<section class="emp-dia pc${x.p} ${hoje ? 'hoje' : ''} ${x.iso === est.dia ? 'ativo' : ''}" data-dia="${x.iso}">
      <header class="emp-h"><span class="wd">${SEM_L[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}${hoje ? ' <b>(hoje)</b>' : ''}</span><b class="pel-t">${x.p}º Pelotão – SEDE</b></header>
      <div class="emp-sec">${lista(x.sede)}${x.refs.length ? `<div class="emp-sub">Reforço</div>${lista(x.refs)}` : ''}</div>
      ${cont(c.sedeD, c.sedeN, 'Militares sede')}
      <div class="emp-bloco">${x.p}ª Ala – PEMAD</div>
      <div class="emp-sec">${lista(x.pemad)}</div>
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

  function desenha(j) {
    const s = j.semana, seg = j.seg, hojeIso = isoDe(new Date());
    document.title = `Empenhos Gerais ${dmy(parse(seg))} a ${dmy(fimDe(seg))} · ${und.sigla || '1ª Cia Op'}`;
    $('#pbTit').innerHTML = `Empenhos Gerais <span class="per">${dmy(parse(seg))} a ${dmy(fimDe(seg))}</span>`;
    const i = est.semanas.indexOf(seg);
    const segHoje = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDe(d); })();
    if (!s.dias.some((x) => x.iso === est.dia)) est.dia = s.dias.some((x) => x.iso === hojeIso) ? hojeIso : s.dias[0].iso;
    const ops = est.semanas.slice().reverse().map((v) => `<option value="${v}" ${v === seg ? 'selected' : ''}>${dmy(parse(v)).slice(0, 5)} a ${dmy(fimDe(v))}${v === segHoje ? ' (esta semana)' : ''}</option>`).join('');
    $('#pbMain').innerHTML = `
      <div class="pub-barra">
        <div class="pub-nav"><button type="button" id="pbAnt" aria-label="Semana anterior" ${i <= 0 ? 'disabled' : ''}>‹</button>
          <select id="pbSel" aria-label="Semana">${ops}</select>
          <button type="button" id="pbProx" aria-label="Próxima semana" ${i >= est.semanas.length - 1 ? 'disabled' : ''}>›</button></div>
        ${est.semanas.includes(segHoje) && seg !== segHoje ? '<button type="button" class="pub-hoje" id="pbHoje">Esta semana</button>' : ''}
        <span class="pub-grav">Semana gravada${s.gravadoEm ? ` em ${quando(s.gravadoEm)}` : ''} · somente consulta</span>
      </div>
      <div class="emp-legenda">${[['op', 'Em serviço'], ['ferias', 'Férias / trânsito'], ['lic', 'Licenciado / dispensado'], ['folga', 'Folga / liberado'], ['curso', 'Curso / TPB'], ['gcif', 'GCIF'], ['missao', 'Missão'], ['outro', 'Outros']].map(([c, t]) => `<span class="pill st-${c}">${t}</span>`).join('')}</div>
      <nav class="emp-tabs" aria-label="Dia">${s.dias.map((x) => { const d = parse(x.iso); return `<button type="button" data-tab="${x.iso}" aria-selected="${x.iso === est.dia}" class="pc${x.p}"><span>${SEM[d.getDay()]}</span><b>${d.getDate()}</b><i>${x.p}º</i></button>`; }).join('')}</nav>
      <div class="emp-wrap"><div class="emp-semana">${s.dias.map((x) => diaHtml(x, hojeIso)).join('')}</div></div>`;
    $('#pbRod').textContent = `${und.sigla || '1ª Cia Op'} · ${und.batalhao || '6º BBM'} · ${und.corporacao || 'CBMMG'} — página de consulta, com as semanas gravadas da semana atual em diante${j.atualizadoEm ? `. Atualizada em ${quando(j.atualizadoEm)}` : ''}.`;
    const vai = (v) => { if (v) abre(v); };
    $('#pbSel').onchange = (e) => vai(e.target.value);
    $('#pbAnt').onclick = () => vai(est.semanas[i - 1]);
    $('#pbProx').onclick = () => vai(est.semanas[i + 1]);
    if ($('#pbHoje')) $('#pbHoje').onclick = () => vai(segHoje);
    document.querySelectorAll('.emp-tabs button').forEach((b) => (b.onclick = () => {
      est.dia = b.dataset.tab;
      document.querySelectorAll('.emp-tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
      document.querySelectorAll('.emp-dia').forEach((x) => x.classList.toggle('ativo', x.dataset.dia === est.dia));
    }));
    // computador: rola até o dia de hoje
    const h = document.querySelector('.emp-dia.hoje'), w = document.querySelector('.emp-wrap');
    if (h && innerWidth > 900) w.scrollLeft = Math.max(0, h.offsetLeft - w.offsetLeft - 8);
  }

  async function abre(seg) {
    try {
      let j = est.cache.get(seg);
      if (!j) {
        if (est.seg) $('#pbSel').disabled = true;
        j = await pede(seg);
        est.semanas = j.semanas || [];
        if (j.semana) est.cache.set(j.seg, j);
      }
      if (!j.semana) { msg('Ainda não há semana gravada para mostrar.'); return; }
      est.seg = j.seg;
      const u = new URL(location.href); u.searchParams.set('s', j.seg); history.replaceState(null, '', u);
      desenha(j);
    } catch (e) {
      if (e.codigo === 'CODIGO') msg('<b>Link inválido ou desatualizado.</b><br>Peça o link novo ao comando da 1ª Cia Op.');
      else if (e.codigo === 'DESLIGADO') msg('<b>A página pública dos empenhos está desligada.</b>');
      else msg('Não foi possível carregar os empenhos agora. Verifique a conexão e tente de novo em instantes.');
    }
  }

  if (!codigo) msg('<b>Link incompleto.</b><br>Use o link enviado pelo comando da 1ª Cia Op.');
  else abre(url.searchParams.get('s') || '');
})();
