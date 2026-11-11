/* ==========================================================================
   TELA › VIATURAS (#viaturas)
   Carta de situação da frota em quadros por fração (modelo do Data Studio).
   Filtros: OBM, tipo, situação e idade; considerações editáveis; ficha da
   viatura selecionada; totais por tipo. Expõe window.VTR para a tela inicial.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  // obm e tipo aceitam vários valores (seleção múltipla)
  const st = { obm: [], sit: '', tipo: [], idOp: '', idA: '', idB: '', sel: null, modo: 'quadros' };
  const tone = { 'Operante': 'ok', 'Manutenção': 'warn', 'Baixada': 'bad' };
  const rotulo = { 'Operante': 'OK', 'Manutenção': 'MANUTENÇÃO', 'Baixada': 'BAIXADA' };
  const OPS = [['', 'Qualquer'], ['entre', 'Entre'], ['>=', '≥ (a partir de)'], ['>', '> (mais de)'], ['=', '= (exatamente)'], ['<=', '≤ (até)'], ['<', '< (menos de)']];
  // texto sem acentos/sinais, em maiúsculas (para comparar OBMs)
  const nrm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[º°ª.]/g, ' ').replace(/\s+/g, ' ').trim();
  const anoAtual = () => DS.hoje().getFullYear();
  // idade da viatura em anos (pelo ANO)
  const idade = (v) => { const a = parseInt(v.ano, 10); return a > 1900 ? anoAtual() - a : null; };
  const numOk = (x) => x !== '' && !isNaN(parseFloat(x));
  // passa no filtro de idade?
  const passaIdade = (v) => {
    if (!st.idOp || !numOk(st.idA)) return true;
    const i = idade(v); if (i == null) return false;
    const a = +st.idA, b = numOk(st.idB) ? +st.idB : a;
    return { '>=': i >= a, '>': i > a, '=': i === a, '<=': i <= a, '<': i < a, entre: i >= Math.min(a, b) && i <= Math.max(a, b) }[st.idOp];
  };
  // ordem nos quadros: OK, manutenção, baixada
  const ordemSit = (v) => ['Operante', 'Manutenção', 'Baixada'].indexOf(v.situacao);
  // quadros da carta de situação (config.js → viaturas.quadros)
  const QUADROS = () => (C.viaturas && C.viaturas.quadros) || [];
  // quadro em que a viatura aparece
  const quadroDe = (v) => QUADROS().find((q) => (q.obms || []).includes(v.obm) || (q.chaves || []).some((k) => nrm(v.obmTxt || v.obm).includes(nrm(k))));
  // viaturas disponíveis (OK) da sede e do PEMAD — usado na tela inicial
  window.VTR = {
    // viaturas da sede e do PEMAD para a tela inicial: todas que não estão baixadas,
    // menos os tipos de config.js → viaturas.foraDoDisponivel (ex.: MO, motocicletas)
    disponiveis() {
      const fora = (C.viaturas && C.viaturas.foraDoDisponivel) || [];
      const ok = DS.ligada('viaturas') ? DS.viaturas().filter((v) => v.situacao !== 'Baixada' && !fora.includes(v.sigla)) : null;
      if (!ok) return null;
      const sede = ok.filter((v) => quadroDe(v) === QUADROS()[0]).length;
      const pemad = ok.filter((v) => nrm(v.obmTxt || v.obm).includes('PEMAD')).length;
      return { sede, pemad, total: sede + pemad };
    },
  };

  // ficha da viatura selecionada
  function info(v) {
    if (!v) return UI.vazio('Clique em uma viatura para ver os dados.');
    const i = idade(v);
    return `<dl class="kv vtr-kv">
      <dt>OBM</dt><dd>${UI.esc(v.obmTxt || v.obm || '–')}</dd>
      <dt>Viatura</dt><dd><b>${UI.esc(v.prefixo)}</b>${v.tipo ? ` <span class="muted">${UI.esc(v.tipo)}</span>` : ''}</dd>
      <dt>Placa</dt><dd class="num">${UI.dash(v.placa)}</dd>
      <dt>Marca/modelo</dt><dd>${UI.dash(v.marca)}</dd>
      <dt>Ano</dt><dd>${UI.dash(v.ano)}</dd>
      ${v.obs ? `<dt>Observações</dt><dd>${UI.esc(v.obs)}</dd>` : ''}
      <dt>Idade</dt><dd>${i != null ? i + (i === 1 ? ' ano' : ' anos') : '–'}</dd>
      <dt>Situação</dt><dd>${UI.chip(rotulo[v.situacao], tone[v.situacao] + ' dot')}</dd>
      ${v.km ? `<dt>Km</dt><dd class="num">${UI.num(v.km)}</dd>` : ''}
      ${v.proxRevisao ? `<dt>Próx. revisão</dt><dd class="num" style="color:${v.proxRevisao - v.km < 1500 ? 'var(--warn)' : 'inherit'}">${UI.num(v.proxRevisao)} km</dd>` : ''}
      ${v.ultimaVistoria ? `<dt>Última vistoria</dt><dd>${UI.data(v.ultimaVistoria)}</dd>` : ''}
    </dl>`;
  }

  // uma tabela só: tipo × (OK, manutenção, baixada, total)
  function tabTipos(ls) {
    if (!ls.length) return UI.vazio('Nenhuma viatura.');
    const t = {}; ls.forEach((v) => {
      const x = (t[v.sigla] = t[v.sigla] || { ok: 0, man: 0, bx: 0 });
      x[v.situacao === 'Operante' ? 'ok' : v.situacao === 'Baixada' ? 'bx' : 'man'] += 1;
    });
    const lin = Object.entries(t).sort((a, b) => (b[1].ok + b[1].man + b[1].bx) - (a[1].ok + a[1].man + a[1].bx) || a[0].localeCompare(b[0]));
    const tot = lin.reduce((o, [, x]) => ({ ok: o.ok + x.ok, man: o.man + x.man, bx: o.bx + x.bx }), { ok: 0, man: 0, bx: 0 });
    const cel = (n, cls) => `<td class="n num ${n ? cls : 'zero'}">${n || '–'}</td>`;
    return `<table class="tbl compact vtr-tot"><thead><tr><th>Tipo</th><th class="n">OK</th><th class="n">Man.</th><th class="n">Baix.</th><th class="n">Total</th></tr></thead><tbody>
      ${lin.map(([k, x]) => `<tr><td><b>${UI.esc(k)}</b></td>${cel(x.ok, 'c-ok')}${cel(x.man, 'c-warn')}${cel(x.bx, 'c-bad')}<td class="n num"><b>${x.ok + x.man + x.bx}</b></td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td>${cel(tot.ok, 'c-ok')}${cel(tot.man, 'c-warn')}${cel(tot.bx, 'c-bad')}<td class="n num"><b>${tot.ok + tot.man + tot.bx}</b></td></tr></tfoot></table>`;
  }

  // quadros distribuídos em colunas: cada quadro vai para a coluna mais curta (sem vãos), mantendo a ordem de leitura
  const colunas = () => Array.from({ length: innerWidth >= 1700 ? 3 : innerWidth > 1100 ? 2 : innerWidth > 720 ? 2 : 1 }, () => []);
  // distribui os quadros nas colunas mais curtas (sem vãos)
  function distribui(gs) {
    const cols = colunas(), alt = cols.map(() => 0);
    gs.forEach((g) => { const i = alt.indexOf(Math.min(...alt)); cols[i].push(g); alt[i] += 3 + Math.max(1, g.itens.length); });
    return cols.filter((c) => c.length);
  }
  let ncols = null;
  window.addEventListener('resize', () => {
    if (location.hash.replace('#', '').split('?')[0] !== 'viaturas') return;
    const n = colunas().length; if (n === ncols) return; ncols = n;
    const v = document.getElementById('view'); if (v) PAGES.viaturas.render(v);
  });

  PAGES.viaturas = {
    title: 'Viaturas',
    render(view) {
      const all = DS.viaturas(); ncols = colunas().length;
      const rows = all.filter((v) => (!st.obm.length || st.obm.includes(v.obm)) && (!st.sit || v.situacao === st.sit) && (!st.tipo.length || st.tipo.includes(v.sigla)) && passaIdade(v));
      const c = (s) => rows.filter((v) => v.situacao === s).length;
      const revisao = rows.filter((v) => v.km && v.proxRevisao - v.km < 1500);
      const tipos = [...new Set(all.map((v) => v.sigla))].sort().map((s) => [s, `${s}${all.find((v) => v.sigla === s).tipo ? ' – ' + all.find((v) => v.sigla === s).tipo : ''}`]);
      if (st.sel && !all.some((v) => v.id === st.sel)) st.sel = null;
      const selV = all.find((v) => v.id === st.sel);

      // quadros por fração, na ordem do config; o que não casar vai para "Demais"
      const grupos = QUADROS().map((q) => ({ nome: q.nome, itens: rows.filter((v) => quadroDe(v) === q) }));
      const resto = rows.filter((v) => !quadroDe(v));
      if (resto.length) grupos.push({ nome: 'Demais', itens: resto, demais: true });
      const visiveis = grupos.filter((g) => g.itens.length || (!st.obm.length && !st.sit && !st.tipo.length && !st.idOp));

      const quadro = (g) => `<section class="panel vtr-q"><div class="panel-h"><h3>${UI.esc(g.nome)}</h3><span class="muted vtr-n">${g.itens.filter((v) => v.situacao === 'Operante').length}/${g.itens.length} OK</span></div>
        ${g.itens.length ? `<table class="tbl compact vtr-tbl"><thead><tr><th class="idx"></th><th>Viatura</th><th>Placa</th><th class="c">Situação</th></tr></thead><tbody>
          ${g.itens.slice().sort((a, b) => ordemSit(a) - ordemSit(b) || a.prefixo.localeCompare(b.prefixo)).map((v, i) => `<tr class="click sit-${tone[v.situacao]} ${st.sel === v.id ? 'sel' : ''}" data-v="${v.id}" tabindex="0" title="${UI.esc((v.tipo || v.sigla) + (v.marca ? ' – ' + v.marca : '') + (v.obs ? ' – ' + v.obs : '') + (g.demais && v.obmTxt ? ' – ' + v.obmTxt : ''))}"><td class="idx">${i + 1}.</td><td><b>${UI.esc(v.prefixo)}</b>${v.obs ? ` <small class="vtr-obs">${UI.esc(v.obs)}</small>` : ''}</td><td class="num">${UI.dash(v.placa)}</td><td class="c"><span class="vtr-sit">${rotulo[v.situacao]}</span></td></tr>`).join('')}
        </tbody></table>` : UI.vazio('Sem viaturas')}</section>`;

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Carta de situação – viaturas', 'Situação da frota da 1ª Cia Op por fração. Clique em uma viatura para ver os dados.', UI.linkPlanilha('viaturas'))}
        <div class="filters">
          ${UI.multiSel(st, 'vObm', 'obm', 'OBM', [...new Set(all.map((v) => v.obm).concat(st.obm))].sort((a, b) => DS.ordem(a) - DS.ordem(b)))}
          ${UI.multiSel(st, 'vTipo', 'tipo', 'Tipo', tipos)}
          ${UI.select('vSit', 'Situação', [['Operante', 'OK (disponível)'], ['Manutenção', 'Manutenção'], ['Baixada', 'Baixada']], st.sit)}
          <div class="field num-f"><label for="vIdOp">Idade da viatura (anos)</label><div class="num-row">
            <select class="select" id="vIdOp" aria-label="Comparação da idade">${OPS.map(([v, t]) => `<option value="${v}" ${st.idOp === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
            ${st.idOp ? `<input class="input" id="vIdA" type="number" min="0" max="80" inputmode="numeric" value="${UI.esc(st.idA)}" placeholder="anos" aria-label="Idade">` : ''}
            ${st.idOp === 'entre' ? `<span class="muted">e</span><input class="input" id="vIdB" type="number" min="0" max="80" inputmode="numeric" value="${UI.esc(st.idB)}" placeholder="anos" aria-label="Idade até">` : ''}
          </div></div>
          ${UI.btnLimpar('vLimpar')}
        </div>

        <div class="vtr-strip">
          <div class="vs-i"><small>Total</small><b class="num">${rows.length}</b>${rows.length !== all.length ? `<span class="muted">de ${all.length}</span>` : ''}</div>
          <div class="vs-i ok"><small>Disponíveis (OK)</small><b class="num">${c('Operante')}</b><span class="muted">${rows.length ? UI.pct(c('Operante') / rows.length) : ''}</span></div>
          <div class="vs-i ${c('Manutenção') ? 'warn' : ''}"><small>Manutenção</small><b class="num">${c('Manutenção')}</b></div>
          <div class="vs-i ${c('Baixada') ? 'bad' : ''}"><small>Baixadas</small><b class="num">${c('Baixada')}</b></div>
          <div class="vs-i ${revisao.length ? 'warn' : ''}" title="${UI.esc(revisao.map((v) => v.prefixo).join(', '))}"><small>Revisão ≤ 1.500 km</small><b class="num">${revisao.length}</b>${revisao.length ? `<span class="muted vs-lst">${UI.esc(revisao.map((v) => v.prefixo).join(', '))}</span>` : ''}</div>
          <div class="seg vs-seg" role="tablist" aria-label="Forma de exibição">
            <button type="button" role="tab" data-modo="quadros" aria-selected="${st.modo === 'quadros'}">Quadros</button>
            <button type="button" role="tab" data-modo="lista" aria-selected="${st.modo === 'lista'}">Lista</button>
          </div>
        </div>

        <div class="vtr-wrap">
          ${st.modo === 'quadros'
            ? (visiveis.length ? `<div class="vtr-quadros" style="--vc:${colunas().length}">${distribui(visiveis).map((col) => `<div class="vtr-col">${col.map(quadro).join('')}</div>`).join('')}</div>` : UI.vazio('Nenhuma viatura para os filtros escolhidos.'))
            : `<section class="panel"><div class="panel-h"><h3>Frota <span class="count">${rows.length}</span></h3></div><div id="vTbl"></div></section>`}
          <aside class="vtr-side">
            <section class="panel vtr-info ${selV ? '' : 'vazio'}"><div class="panel-h"><h3>Viatura selecionada</h3>${selV ? '<button type="button" class="icon-btn" id="vDesel" aria-label="Limpar seleção" title="Limpar seleção">' + ICON('x') + '</button>' : ''}</div><div class="panel-b" id="vInfo">${selV ? info(selV) : '<p class="muted" style="font-size:13px">Clique em uma viatura para ver placa, marca/modelo, ano, idade, km e revisão.</p>'}</div></section>
            <section class="panel"><div class="panel-h"><h3>Totais por tipo</h3></div><div class="panel-b flush">${tabTipos(rows)}</div></section>
            ${UI.obsQuadro('viaturas', { titulo: 'Considerações', placeholder: 'Ex.: De acordo com a Diretriz 03/2019 é previsto ter 02 ACA, 02 ASM, 03 UR, 02 ABS e 01 AT na sede do batalhão. Falta 01 ASL no PEMAD/PBRESC.' })}
          </aside>
        </div>
      </div>`;

      if (st.modo === 'lista') UI.table(view.querySelector('#vTbl'), {
        cols: [
          { key: 'prefixo', label: 'Viatura', cls: 'name', render: (v) => `<b style="font-family:var(--f-display);font-size:15px">${UI.esc(v.prefixo)}</b>` },
          { key: 'tipo', label: 'Tipo' },
          { key: 'placa', label: 'Placa', render: (v) => `<span class="num">${UI.dash(v.placa)}</span>` },
          { key: 'obm', label: 'OBM', render: (v) => UI.obm(v.obm), sort: (v) => DS.ordem(v.obm) },
          { key: 'marca', label: 'Marca/modelo' },
          { key: 'obs', label: 'Observações', render: (v) => UI.dash(v.obs) },
          { key: 'ano', label: 'Ano', cls: 'c' },
          { key: 'idade', label: 'Idade', cls: 'n', render: (v) => (idade(v) != null ? idade(v) : '–'), sort: (v) => idade(v) ?? -1 },
          { key: 'km', label: 'Km', cls: 'n', render: (v) => (v.km ? UI.num(v.km) : UI.dash('')) },
          { key: 'proxRevisao', label: 'Próx. revisão', cls: 'n', render: (v) => (v.proxRevisao ? `<span style="color:${v.proxRevisao - v.km < 1500 ? 'var(--warn)' : 'inherit'}">${UI.num(v.proxRevisao)}</span>` : UI.dash('')) },
          { key: 'situacao', label: 'Situação', render: (v) => UI.chip(rotulo[v.situacao], tone[v.situacao] + ' dot'), sort: (v) => -ordemSit(v) },
          { key: 'ultimaVistoria', label: 'Última vistoria', render: (v) => UI.data(v.ultimaVistoria) },
        ],
        rows: rows.map((v) => ({ ...v, idade: idade(v) })), sort: 'situacao', onRow: (id) => seleciona(id), selected: st.sel,
      });

      UI.ligaObs(view, 'viaturas');
      const rer = () => { const y = window.scrollY; PAGES.viaturas.render(view); window.scrollTo({ top: y }); };
      const seleciona = (id) => {
        st.sel = id;
        if (innerWidth <= 1100) { UI.sheet('Viatura', info(all.find((v) => v.id === id))); }
        rer();
      };
      view.querySelector('#vSit').onchange = (e) => { st.sit = e.target.value; rer(); };
      UI.ligaMultiSel(view, st, rer);
      view.querySelector('#vIdOp').onchange = (e) => { st.idOp = e.target.value; rer(); const a = view.querySelector('#vIdA'); if (a) a.focus(); };
      ['vIdA', 'vIdB'].forEach((id) => {
        const el = view.querySelector('#' + id);
        if (el) el.oninput = () => {
          st[id === 'vIdA' ? 'idA' : 'idB'] = el.value;
          clearTimeout(st._t);
          st._t = setTimeout(() => { rer(); const n = view.querySelector('#' + id); if (n) n.focus(); }, 350);
        };
      });
      view.querySelector('#vLimpar').onclick = () => {
        Object.assign(st, { obm: [], sit: '', tipo: [], idOp: '', idA: '', idB: '', sel: null, _aberto: null });
        rer();
      };
      const ds = view.querySelector('#vDesel'); if (ds) ds.onclick = () => { st.sel = null; rer(); };
      view.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => { st.modo = b.dataset.modo; rer(); }));
      view.querySelectorAll('tr[data-v]').forEach((tr) => {
        tr.onclick = () => seleciona(tr.dataset.v);
        tr.onkeydown = (e) => { if (e.key === 'Enter') seleciona(tr.dataset.v); };
      });
    },
  };
})();
