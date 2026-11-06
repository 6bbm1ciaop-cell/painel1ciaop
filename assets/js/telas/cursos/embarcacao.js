/* ==========================================================================
   TELA › CONDUTORES DE EMBARCAÇÃO (#embarcacao)
   Só habilitações náuticas (Motonauta, Arrais-Amador, ETSP…); KPIs clicáveis,
   filtro de habilitação múltiplo e quadro "Como a planilha foi lida".
   ========================================================================== */
(function () {
  const { C, base, filtrosTxt, filtrosBase, bindBase, colsBase } = CUR;
  /* ---------------- Condutores de embarcação ---------------- */
  const se = { obm: [], posto: [], q: '', cond: '', hab: [], status: '' };
  // situação da habilitação: válida, a vencer, vencida ou sem validade
  const statusHab = (m) => {
    if (!m.embarcacao) return { k: 'nao', t: 'Não habilitado', tone: '' };
    if (!m.embarcacao.validade) return { k: 'sem', t: m.embarcacao.validadeTxt ? 'Data não reconhecida' : 'Sem validade', tone: 'info' };
    const dv = DS.parse(m.embarcacao.validade); if (!dv || isNaN(dv)) return { k: 'sem', t: 'Data não reconhecida', tone: 'info' };
    const dias = (dv - DS.hoje()) / 864e5;
    if (dias < 0) return { k: 'vencida', t: 'Vencida', tone: 'bad' };
    if (dias <= 90) return { k: 'avencer', t: `Vence em ${Math.ceil(dias)} d`, tone: 'warn' };
    return { k: 'valida', t: 'Válida', tone: 'ok' };
  };
  PAGES.embarcacao = {
    title: 'Condutores de embarcação',
    render(view) {
      // mesma estrutura de "Motoristas credenciados": lista todo o efetivo, condutores contados pela habilitação
      const todos = DS.militares().filter((m) => base(se, m));
      const cond = todos.filter((m) => m.embarcacao);
      const cnt = (k) => cond.filter((m) => statusHab(m).k === k).length;
      const habsDe = (m) => (m.embarcacao.habs || [m.embarcacao.hab]);
      const habs = [...new Set(cond.flatMap(habsDe))].sort();
      const porHab = habs.map((h) => ({ key: h, label: h, v: cond.filter((m) => habsDe(m).includes(h)).length })).sort((a, b) => b.v - a.v);
      const rows = DS.ordenar(todos.filter((m) => (se.cond === 'sim' ? m.embarcacao : se.cond === 'nao' ? !m.embarcacao : true)
        && (!se.hab.length || (m.embarcacao && habsDe(m).some((h) => se.hab.includes(h)))) && (!se.status || statusHab(m).k === se.status)));

      view.innerHTML = `<div class="page">
        ${UI.pageHead('Condutores de embarcação', 'Habilitação náutica (Motonauta, Arrais-Amador, Mestre-Amador, ETSP…), registro e validade. Habilitações vencidas ou a vencer em 90 dias aparecem destacadas.', UI.stamp(C.atualizacoes.embarcacao))}
        <div class="filters">${filtrosBase(se, 'e')}
          ${UI.multiSel(se, 'eHab', 'hab', 'Habilitação', [...new Set(habs.concat(se.hab))].sort())}
          <div class="field"><label for="eCond">É condutor de embarcação?</label><select class="select" id="eCond"><option value="">Todos</option><option value="sim" ${se.cond === 'sim' ? 'selected' : ''}>Sim</option><option value="nao" ${se.cond === 'nao' ? 'selected' : ''}>Não</option></select></div>
          ${UI.btnLimpar('eLimpar')}</div>
        <div class="kpis">
          ${UI.kpi('Condutores de embarcação', cond.length, { sub: `de ${todos.length} militares`, meter: cond.length / (todos.length || 1), click: 'cond', on: se.cond === 'sim' && !se.status })}
          ${UI.kpi('Habilitação válida', cnt('valida'), { tone: 'ok', click: 'valida', on: se.status === 'valida' })}
          ${UI.kpi('Vencem em 90 dias', cnt('avencer'), { tone: cnt('avencer') ? 'warn' : '', click: 'avencer', on: se.status === 'avencer' })}
          ${UI.kpi('Vencidas', cnt('vencida'), { tone: cnt('vencida') ? 'bad' : '', click: 'vencida', on: se.status === 'vencida' })}
          ${UI.kpi('Sem validade informada', cnt('sem'), { click: 'sem', on: se.status === 'sem' })}
        </div>
        <div class="tabs" role="tablist">${[['', 'Todas'], ['valida', 'Válidas'], ['avencer', 'A vencer'], ['vencida', 'Vencidas'], ['sem', 'Sem validade']].map(([k, t]) => `<button role="tab" type="button" data-st="${k}" aria-selected="${se.status === k}">${t}</button>`).join('')}</div>
        <section class="panel" id="eLista"><div class="panel-h"><h3>Militares <span class="count">${rows.length}</span></h3>${UI.exp.btnLista('eTbl')}
          ${porHab.length ? `<div class="emb-habs">${porHab.map((h) => `<button type="button" class="emb-hab ${se.hab.includes(h.key) ? 'on' : ''}" aria-pressed="${se.hab.includes(h.key)}" data-key="${UI.esc(h.key)}">${UI.esc(h.label)} <b>${h.v}</b></button>`).join('')}</div>` : ''}</div><div id="eTbl"></div></section>
        ${(() => { // quais colunas da planilha Respostas foram lidas e como
          const rel = DS.relatorios && DS.relatorios.efetivo && DS.relatorios.efetivo.embarcacao;
          if (!rel) return '';
          const tit = (DS.relatorios.efetivo.titulos || []);
          const nomes = { resp: 'É condutor de embarcação?', hab: 'Curso / habilitação náutica', reg: 'Nº do registro', val: 'Validade da habilitação' };
          const tot = DS.militares(), sim = tot.filter((m) => m.condutorEmbarcacao === true).length, nao = tot.filter((m) => m.condutorEmbarcacao === false).length;
          const linhas = rel.campos.map((f) => `<tr>
              <td><b>${nomes[f.campo]}</b></td>
              <td><select class="select emb-col" data-campo="${f.campo}">
                <option value="">Automático${!f.manual && f.coluna ? '' : ''}</option>
                <option value="-" ${rel.manual[f.campo] === '-' ? 'selected' : ''}>Não usar</option>
                ${tit.map((t) => `<option value="${UI.esc(t)}" ${f.manual && rel.manual[f.campo] === t ? 'selected' : ''}>${UI.esc(t)}</option>`).join('')}
              </select>
              <div class="emb-lida">${f.coluna ? `Lendo: <b>${UI.esc(f.coluna)}</b>${f.manual ? ' (escolhida por você)' : ''}` : '<span class="bad-t">Nenhuma coluna encontrada</span>'}</div></td>
              <td class="n">${f.preenchidas}${f.datas != null ? `<div class="emb-lida">${f.datas} com data válida</div>` : ''}</td>
              <td>${f.comuns.length ? f.comuns.map(([v, n]) => `<span class="emb-val ${f.ignorados && f.ignorados.some(([x]) => x === v) ? 'ign' : ''}">${UI.esc(v)} <b>${n}</b></span>`).join(' ') : UI.dash('')}
                ${f.ignorados && f.ignorados.length ? `<div class="emb-lida">Não contam como habilitação de embarcação (riscados): ${f.ignorados.map(([v]) => UI.esc(v)).join(', ')}.</div>` : ''}</td>
            </tr>`).join('');
          return `<section class="panel" id="embLeitura"><div class="panel-h"><h3>Como a planilha Respostas foi lida</h3>
              ${Object.keys(rel.manual).length ? '<button class="btn sm" type="button" id="embAuto">Voltar ao automático</button>' : ''}</div>
            <div class="panel-b">
              <p class="emb-nota">Militares lidos: <b>${tot.length}</b>. Responderam Sim: <b>${sim}</b>, Não: <b>${nao}</b>, em branco ou outra resposta: <b>${tot.length - sim - nao}</b>.
              Só contam habilitações náuticas (Motonauta, Arrais-Amador, Mestre-Amador, Capitão-Amador, Veleiro, ETSP); outros cursos, como Transporte de produtos perigosos ou CVE, ficam de fora. Se alguma coluna abaixo estiver errada, escolha a certa na lista: o painel recarrega e passa a ler essa coluna neste computador.</p>
              <div class="tbl-wrap"><table class="tbl emb-tbl"><thead><tr><th>Informação</th><th>Coluna da planilha</th><th class="n">Preenchidas</th><th>Respostas mais comuns</th></tr></thead><tbody>${linhas}</tbody></table></div>
            </div></section>`;
        })()}
      </div>`;

      UI.table(view.querySelector('#eTbl'), {
        cols: [...colsBase,
          { key: 'cond', label: 'É condutor?', cls: 'c', render: (m) => (m.embarcacao ? '<b>Sim</b>' : m.condutorEmbarcacao === false ? 'Não' : UI.dash('')), sort: (m) => (m.embarcacao ? 0 : 1) },
          { key: 'hab', label: 'Habilitação', render: (m) => m.embarcacao ? `<b>${UI.esc(m.embarcacao.hab)}</b>` : UI.dash(''), sort: (m) => m.embarcacao ? m.embarcacao.hab : 'zz' },
          { key: 'reg', label: 'Nº do registro', render: (m) => (m.embarcacao && m.embarcacao.registro ? `<span class="num">${UI.esc(m.embarcacao.registro)}</span>` : UI.dash('')), sort: (m) => m.embarcacao?.registro || 'zz' },
          { key: 'val', label: 'Validade', cls: 'n', render: (m) => m.embarcacao && m.embarcacao.validade ? `<span class="num">${UI.data(m.embarcacao.validade)}</span>` : m.embarcacao && m.embarcacao.validadeTxt ? `<span class="muted" title="Texto da planilha que não é uma data">${UI.esc(m.embarcacao.validadeTxt)}</span>` : UI.dash(''), sort: (m) => m.embarcacao?.validade || '9999' },
          { key: 'st', label: 'Situação', render: (m) => {
            const s = statusHab(m);
            return s.k === 'nao' ? UI.dash('') : UI.chip(s.t, s.tone + ' dot');
          }, sort: (m) => ['vencida', 'avencer', 'sem', 'valida', 'nao'].indexOf(statusHab(m).k) },
        ],
        rows, maxH: true, empty: 'Nenhum militar nos filtros escolhidos.',
      });
      const rer = () => PAGES.embarcacao.render(view);
      const stNome = { valida: 'Habilitação válida', avencer: 'Vencem em 90 dias', vencida: 'Vencidas', sem: 'Sem validade informada' };
      UI.exp.ligaLista(view, () => ({ titulo: 'Condutores de embarcação', filtros: filtrosTxt(se, [se.hab.length ? 'Habilitação: ' + se.hab.join(', ') : '', se.cond ? 'É condutor: ' + (se.cond === 'sim' ? 'Sim' : 'Não') : '', se.status ? 'Situação: ' + stNome[se.status] : '']) }));
      bindBase(view, se, 'e', rer);
      view.querySelector('#eCond').onchange = (e) => { se.cond = e.target.value; rer(); };
      view.querySelector('#eLimpar').onclick = () => {
        Object.assign(se, { obm: [], posto: [], q: '', cond: '', hab: [], status: '', _aberto: null });
        rer();
      };
      view.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => { se.status = b.dataset.st; rer(); }));
      // quadros clicáveis: 1º clique filtra a lista, 2º clique desfaz
      view.querySelectorAll('[data-kpi]').forEach((b) => (b.onclick = () => {
        const k = b.dataset.kpi, ligado = b.getAttribute('aria-pressed') === 'true';
        if (k === 'cond') { se.status = ''; se.cond = ligado ? '' : 'sim'; } else { se.status = ligado ? '' : k; }
        rer();
        const lista = view.querySelector('#eLista'); if (lista && lista.getBoundingClientRect().top > innerHeight * 0.6) lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
      view.querySelectorAll('.emb-hab').forEach((b) => (b.onclick = () => {
        const k = b.dataset.key;
        se.hab = se.hab.includes(k) ? se.hab.filter((x) => x !== k) : se.hab.concat(k);
        rer();
      }));
      const salvaCols = (obj) => { PREFS.gravarJSON('colunas-emb', Object.keys(obj).length ? obj : null); location.reload(); };
      view.querySelectorAll('.emb-col').forEach((sel) => (sel.onchange = () => {
        const atual = Object.assign({}, (DS.relatorios.efetivo.embarcacao || {}).manual);
        if (sel.value) atual[sel.dataset.campo] = sel.value; else delete atual[sel.dataset.campo];
        salvaCols(atual);
      }));
      const ba = view.querySelector('#embAuto'); if (ba) ba.onclick = () => salvaCols({});
    },
  };

})();
