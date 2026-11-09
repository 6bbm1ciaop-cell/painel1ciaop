/* ==========================================================================
   TELA › TESTAR PLANILHAS (#teste)
   Carrega os .xlsx exportados das planilhas (Respostas, Férias, DDQOD, Horas,
   Licenças, Viaturas) e mostra como o painel leu cada uma.
   Tudo acontece no navegador; nada é enviado nem salvo.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  let erros = [];
  const TIPOS = [
    ['efetivo', 'Respostas (efetivo)', 'Respostas', [['geral', 'Geral'], ['dados', 'Dados completos']]],
    ['ferias', 'Plano de Férias', 'Plano de Férias da 1ª Companhia Operacional', [['ferias', 'Férias']]],
    ['ddqod', 'DDQOD', 'DDQOD 1ª Cia Op', [['ddqod', 'DDQOD']]],
    ['horas', 'Controle de horas', 'Novo Controle de horas 1ª Cia. Op. 2026', [['empenhos-horas', 'Horas excedentes']]],
    ['viaturas', 'Viaturas', 'VIATURAS 1ª CIA. OP', [['viaturas', 'Viaturas']]],
    ['licencas', 'Licenças e dispensas', 'LICENÇAS E DISPENSAS POR MOTIVO DE SAÚDE (respostas)', [['licencas', 'Licenças e dispensas']]],
  ];

  // área para soltar/escolher os arquivos
  function areaDeEnvio() {
    const arqs = DS.arquivos || {};
    return `<section class="panel"><div class="panel-h"><h3>Carregar planilhas</h3></div><div class="panel-b grid" style="gap:14px">
      <ol class="steps">
        <li>No Google Planilhas, abra cada planilha e vá em <b>Arquivo → Fazer download → Microsoft Excel (.xlsx)</b>.</li>
        <li>Arraste os arquivos para a área abaixo, um de cada vez ou todos juntos. O painel reconhece cada planilha e escolhe a aba certa.</li>
      </ol>
      <div class="tipos-arq">${TIPOS.map(([k, nome, planilha]) => `<div class="tipo-arq ${arqs[k] ? 'on' : ''}"><span class="chk">${arqs[k] ? '✓' : ''}</span><span><b>${nome}</b><small>${arqs[k] ? `${UI.esc(arqs[k].nome)} › ${UI.esc(arqs[k].aba)} (${arqs[k].linhas.length} linhas)` : `aba ${UI.esc(C.abas[k])}`}</small></span>${arqs[k] ? `<button class="reveal" type="button" data-tirar="${k}">remover</button>` : ''}</div>`).join('')}</div>
      <label class="drop" id="tDrop" for="tArq">
        ${ICON('file')}
        <b>Arraste os arquivos aqui</b>
        <span class="muted">ou toque para escolher (.xlsx, .ods ou .csv)</span>
        <input id="tArq" type="file" accept=".xlsx,.xlsm,.xls,.ods,.csv" multiple class="sr">
      </label>
      <p class="muted" style="font-size:13px">Os arquivos são lidos só neste navegador. Nada é enviado nem salvo: ao recarregar a página, o painel volta aos dados de demonstração. As fotos não aparecem neste teste, porque continuam no Drive.</p>
      ${erros.map((e) => `<p class="chip bad" style="height:auto;padding:8px 10px;white-space:normal">${UI.esc(e)}</p>`).join('')}
    </div></section>`;
  }

  // botões para abrir as telas com os dados do arquivo
  const atalhos = () => {
    const arqs = DS.arquivos || {};
    const links = TIPOS.filter(([k]) => arqs[k]).flatMap(([, , , l]) => l);
    return links.length ? `<div class="btn-row">${links.map(([id, t], i) => `<a class="btn ${i === 0 ? 'primary' : ''}" href="#${id}">Abrir ${t}</a>`).join('')}</div>` : '';
  };

  /* ---------- relatório do efetivo ---------- */
  function relEfetivo() {
    const r = DS.relatorios && DS.relatorios.efetivo;
    if (!r) return '';
    const achadas = r.mapa.filter((x) => x.coluna).length;
    return `<h3 class="sec-t">Respostas (efetivo)</h3>
      <div class="kpis">
        ${UI.kpi('Linhas lidas', r.linhas)}
        ${UI.kpi('Militares', r.militares, { sub: 'nº BM diferentes' })}
        ${UI.kpi('Respostas repetidas', r.repetidas, { sub: 'vale a mais recente', tone: r.repetidas ? 'gold' : '' })}
        ${UI.kpi('Colunas reconhecidas', achadas, { small: `/ ${r.mapa.length}`, tone: achadas < r.mapa.length ? 'warn' : 'ok', meter: achadas / r.mapa.length })}
      </div>
      ${r.obmsDesconhecidas.length || r.postosDesconhecidos.length || r.semNBM ? UI.panel(ICON('alert') + 'Pontos para conferir', `<ul class="notes">
        ${r.obmsDesconhecidas.length ? `<li><div><b>OBMs fora da lista do painel:</b> ${r.obmsDesconhecidas.map((o) => UI.chip(o, 'warn')).join(' ')}<br><span class="muted">Militares dessas OBMs não entram nos quadros da Geral. Corrija o nome na planilha ou me diga o nome certo para eu incluir no painel.</span></div></li>` : ''}
        ${r.postosDesconhecidos.length ? `<li><div><b>Postos/graduações não reconhecidos:</b> ${r.postosDesconhecidos.map((o) => UI.chip(o, 'warn')).join(' ')}</div></li>` : ''}
        ${r.semNBM ? `<li><div><b>${r.semNBM} resposta(s) sem nº BM.</b> Elas aparecem, mas não dá para juntar respostas repetidas desses militares.</div></li>` : ''}
      </ul>`) : ''}
      <div class="grid g-2">
        <section class="panel"><div class="panel-h"><h3>Quadros da aba Geral</h3></div><div id="tQuadros"></div></section>
        <section class="panel"><div class="panel-h"><h3>Colunas que o painel procura <span class="count">${achadas} de ${r.mapa.length}</span></h3></div><div id="tMapa"></div>
          <div class="panel-note">"Preenchida" conta as linhas com valor, sem mostrar os dados. Colunas da planilha que o painel não usa: ${r.naoUsadas.length ? r.naoUsadas.map((t) => UI.esc(t)).join(', ') : 'nenhuma'}.</div></section>
      </div>`;
  }

  /* ---------- relatório das outras planilhas ---------- */
  const semEfetivo = () => !(DS.arquivos && DS.arquivos.efetivo);
  // OBMs da planilha que não estão em config.js
  const obmsFora = (lista) => [...new Set(lista.map((x) => x.obm).filter((o) => o && !DS.OBM_ORDEM.includes(o)))];

  // relatório da leitura das férias
  function relFerias() {
    const r = DS.relatorios && DS.relatorios.ferias;
    if (!r) return '';
    const fs = DS.ferias(), hoje = DS.feriasEm(DS.hoje()).length;
    const tipos = {}; fs.forEach((f) => { tipos[f.tipo] = (tipos[f.tipo] || 0) + 1; });
    const fora = obmsFora(fs.map((f) => DS.militar(f.militar)));
    return `<h3 class="sec-t">Plano de Férias</h3>
      <div class="kpis">
        ${UI.kpi('Períodos lidos', r.validas, { sub: `${r.linhas} linhas na aba` })}
        ${UI.kpi('De férias hoje', hoje, { tone: hoje ? 'warn' : '' })}
        ${UI.kpi('Por tipo', Object.entries(tipos).map(([t, n]) => `${n} ${UI.esc(t)}`).join(', ') || '–', { sub: 'FA, FP e outros' })}
        ${UI.kpi('Militares fora do efetivo', semEfetivo() ? '–' : r.avulsos, { sub: semEfetivo() ? 'carregue a planilha Respostas' : 'nº BM não achado em Respostas', tone: !semEfetivo() && r.avulsos ? 'warn' : '' })}
      </div>
      ${r.linhas > r.validas ? `<p class="muted">${r.linhas - r.validas} linha(s) sem data de início ou sem militar ficaram de fora.</p>` : ''}
      ${fora.length ? UI.panel(ICON('alert') + 'OBMs fora da lista do painel', `<p>${fora.map((o) => UI.chip(o, 'warn')).join(' ')}</p>`) : ''}`;
  }

  // relatório da leitura do DDQOD
  function relDdqod() {
    const r = DS.relatorios && DS.relatorios.ddqod;
    if (!r) return '';
    const dd = DS.ddqod();
    const P = dd.reduce((s, g) => s + g.previsto, 0), E = dd.reduce((s, g) => s + g.existente, 0);
    const novas = r.fracoes.filter((f) => !f.conhecida);
    return `<h3 class="sec-t">DDQOD</h3>
      <div class="kpis">
        ${UI.kpi('Frações', r.fracoes.length)}
        ${UI.kpi('Previsto', P)}
        ${UI.kpi('Existente', E)}
        ${UI.kpi('Claro', P - E, { tone: 'bad', sub: P ? UI.pct((P - E) / P, 2) + ' do previsto' : '' })}
      </div>
      ${novas.length ? UI.panel(ICON('alert') + 'Frações sem nome configurado', `<p>${novas.map((f) => UI.chip(f.planilha, 'warn')).join(' ')}</p><p class="muted" style="margin-top:6px">Aparecem com o nome da planilha. Me diga o nome de exibição e as OBMs dessas frações para eu incluir.</p>`) : ''}`;
  }

  // relatório da leitura das horas
  function relHoras() {
    const r = DS.relatorios && DS.relatorios.horas;
    if (!r) return '';
    const hs = DS.horas(), tot = hs.reduce((s, h) => s + h.he, 0);
    const fora = obmsFora(hs);
    return `<h3 class="sec-t">Controle de horas</h3>
      <div class="kpis">
        ${UI.kpi('Militares lidos', r.validas, { sub: `${r.ignoradas} linha(s) vazias ou #N/A ignoradas` })}
        ${UI.kpi('Total de HE', UI.num(tot), { small: 'h', tone: 'gold' })}
        ${UI.kpi('Com saldo', hs.filter((h) => h.he > 0).length)}
        ${UI.kpi('Fora do efetivo', semEfetivo() ? '–' : r.avulsos, { sub: semEfetivo() ? 'carregue a planilha Respostas' : 'nome de guerra não achado em Respostas', tone: !semEfetivo() && r.avulsos ? 'warn' : '' })}
      </div>
      ${fora.length ? UI.panel(ICON('alert') + 'OBMs fora da lista do painel', `<p>${fora.map((o) => UI.chip(o, 'warn')).join(' ')}</p>`) : ''}`;
  }

  // relatório da leitura das licenças
  function relLicencas() {
    if (!DS.ligada('licencas') || DS.fonte === 'mock') return '';
    const ls = DS.licencas(), d = ls.filter((l) => l.categoria === 'Dispensa');
    const h = DS.iso(DS.hoje()), vig = ls.filter((l) => l.inicio <= h && l.fim >= h);
    return `<h3 class="sec-t">Licenças e dispensas</h3>
      <div class="kpis">
        ${UI.kpi('Registros lidos', ls.length)}
        ${UI.kpi('Licenças', ls.length - d.length)}
        ${UI.kpi('Dispensas', d.length, { sub: `${d.filter((x) => x.itens.length).length} com itens informados` })}
        ${UI.kpi('Em vigor hoje', vig.length, { tone: vig.length ? 'warn' : '' })}
        ${UI.kpi('Fora do efetivo', semEfetivo() ? '–' : ls.filter((l) => (DS.militar(l.militar) || {}).avulso).length, { sub: semEfetivo() ? 'carregue a planilha Respostas' : 'nº BM não achado em Respostas' })}
      </div>`;
  }

  // relatório da leitura das viaturas
  function relViaturas() {
    const r = DS.relatorios && DS.relatorios.viaturas;
    if (!r) return '';
    const vs = DS.viaturas(), ok = vs.filter((v) => v.situacao === 'Operante').length;
    const porObm = [...new Set(vs.map((v) => v.obmTxt + '→' + v.obm))].map((x) => x.split('→'));
    return `<h3 class="sec-t">Viaturas</h3>
      <div class="kpis">
        ${UI.kpi('Viaturas lidas', r.validas, { sub: `${r.vazias} linha(s) vazias ignoradas` })}
        ${UI.kpi('OK (disponíveis)', ok, { tone: 'ok' })}
        ${UI.kpi('Baixadas', vs.filter((v) => v.situacao === 'Baixada').length, { tone: 'bad' })}
        ${UI.kpi('Sem tipo', r.semTipo.length, { sub: r.semTipo.join(', ') || 'nenhuma', tone: r.semTipo.length ? 'warn' : '' })}
      </div>
      ${UI.panel('Como cada OBM da planilha foi entendida', `<dl class="kv">${porObm.map(([a, b]) => `<dt>${UI.esc(a || '(vazia)')}</dt><dd>${UI.esc(b)}</dd>`).join('')}</dl>`, { note: 'A OBM define em qual quadro da carta de situação a viatura aparece (config.js → viaturas.quadros).' })}`;
  }

  PAGES.teste = {
    title: 'Testar planilhas',
    render(view) {
      const carregado = DS.fonte === 'arquivo';
      view.innerHTML = `<div class="page">
        ${UI.pageHead('Testar as planilhas', 'Confira como o painel lê as planilhas da 1ª Cia Op antes de ligar o Apps Script.')}
        ${DS.fonte === 'sheets' ? (relEfetivo() + relFerias() + relDdqod() + relHoras() + relViaturas() + relLicencas() || UI.vazio('Nenhum relatório disponível.')) : areaDeEnvio()}
        ${carregado ? atalhos() + relEfetivo() + relFerias() + relDdqod() + relHoras() + relViaturas() + relLicencas() : ''}
      </div>`;

      const r = DS.relatorios && DS.relatorios.efetivo;
      if (r) {
        UI.table(view.querySelector('#tQuadros'), {
          cols: [{ key: 'obm', label: 'Quadro', cls: 'name', render: (q) => UI.obm(q.obm), sort: (q) => DS.ordem(q.obm) },
            { key: 'n', label: 'Militares', cls: 'n', render: (q) => (q.n ? q.n : UI.chip('vazio', 'warn')) }],
          rows: C.obms.quadrosGeral.map((o) => ({ id: o, obm: o, n: DS.militares().filter((m) => m.obm === o).length })), index: false, compact: true,
        });
        UI.table(view.querySelector('#tMapa'), {
          cols: [
            { key: 'procura', label: 'Coluna procurada', cls: 'name', render: (x) => `<b>${UI.esc(x.procura)}</b>` },
            { key: 'coluna', label: 'Encontrada', render: (x) => (x.coluna ? (x.coluna === x.procura ? UI.chip('igual', 'ok') : UI.esc(x.coluna)) : UI.chip('Não encontrada', 'bad')), sort: (x) => (x.coluna ? 1 : 0) },
            { key: 'preenchidas', label: 'Preenchida', cls: 'n', render: (x) => (x.coluna ? `${x.preenchidas} de ${r.linhas}` : '–') },
          ],
          rows: r.mapa.map((x, i) => ({ ...x, id: 'c' + i })).sort((a, b) => (a.coluna ? 1 : 0) - (b.coluna ? 1 : 0)), index: false, compact: true, maxH: true,
        });
      }

      view.querySelectorAll('[data-tirar]').forEach((b) => b.addEventListener('click', () => {
        const arqs = Object.assign({}, DS.arquivos); delete arqs[b.dataset.tirar];
        if (Object.keys(arqs).length) DS.usarArquivos(arqs); else DS.usarDemo();
        APP.atualizarCasca(); PAGES.teste.render(view);
      }));

      const inp = view.querySelector('#tArq');
      if (!inp) return;
      const drop = view.querySelector('#tDrop');
      const carregar = async (files) => {
        files = [...(files || [])];
        if (!files.length) return;
        erros = [];
        drop.classList.add('busy'); drop.querySelector('b').textContent = `Lendo ${files.length} arquivo(s)…`;
        const arqs = Object.assign({}, DS.fonte === 'arquivo' ? DS.arquivos : {});
        for (const f of files) {
          try {
            const res = await ARQUIVO.ler(f);
            if (!res.linhas.length) throw new Error(`"${f.name}": a aba ${res.aba} não tem linhas com dados.`);
            arqs[res.tipo] = res;
          } catch (e) { console.error(e); erros.push(e.message || `Não foi possível ler "${f.name}".`); }
        }
        if (Object.keys(arqs).length) {
          DS.usarArquivos(arqs);
          APP.atualizarCasca();
          UI.toast(`${Object.keys(arqs).length} planilha(s) carregada(s)`);
        }
        PAGES.teste.render(view);
      };
      inp.onchange = () => carregar(inp.files);
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => carregar(e.dataTransfer.files));
    },
  };
})();
