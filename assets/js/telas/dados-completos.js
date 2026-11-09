/* ==========================================================================
   TELA › DADOS COMPLETOS (#dados)
   Ficha individual do militar com todas as respostas do formulário,
   filtros (OBM, posto, idade, tempo de serviço), lista retrátil e PDF da tela.
   Fonte: planilha "Respostas" › "Respostas ao formulário 1".
   ========================================================================== */
(function () {
  const st = { id: null, q: '', obm: '', posto: '', idade: { op: '', a: '', b: '' }, tempo: { op: '', a: '', b: '' }, ordem: '', lista: null };
  // lista de militares retrátil (estado lembrado neste navegador)
  const listaAberta = () => { if (st.lista == null) st.lista = PREFS.ligado('dc-lista', true); return st.lista; };

  /* filtros numéricos: idade e tempo de serviço com ≥, >, =, ≤, <, entre */
  const OPS = [['', 'Qualquer'], ['>=', '≥ (a partir de)'], ['>', '> (mais de)'], ['=', '= (exatamente)'], ['<=', '≤ (até)'], ['<', '< (menos de)'], ['entre', 'entre']];
  // idade pela data de nascimento (ou coluna IDADE)
  const idadeDe = (m) => (m.nascimento ? UI.anos(m.nascimento) : m.idade);
  // tempo de serviço pela data de inclusão
  const tempoDe = (m) => (m.inclusao ? UI.anos(m.inclusao) : m.tempoServico != null ? Math.floor(m.tempoServico) : null);
  // filtro numérico preenchido?
  const ativo = (f) => f.op && f.a !== '' && !isNaN(+f.a);
  // valor passa no filtro numérico (≥, >, =, ≤, <, entre)?
  function passa(v, f) {
    if (!ativo(f)) return true;
    if (v == null || v === '–' || isNaN(v)) return false;
    const a = +f.a, b = f.b === '' ? a : +f.b;
    return { '>=': v >= a, '>': v > a, '=': v === a, '<=': v <= a, '<': v < a, entre: v >= Math.min(a, b) && v <= Math.max(a, b) }[f.op];
  }
  // HTML do filtro numérico
  const numFiltro = (id, label, f) => `<div class="field num-f"><label for="${id}Op">${label}</label><div class="num-row">
      <select class="select" id="${id}Op" aria-label="Comparação de ${label.toLowerCase()}">${OPS.map(([v, t]) => `<option value="${v}" ${f.op === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      ${f.op ? `<input class="input" id="${id}A" type="number" min="0" max="99" inputmode="numeric" value="${UI.esc(f.a)}" placeholder="anos" aria-label="${label} (anos)">` : ''}
      ${f.op === 'entre' ? `<span class="muted">e</span><input class="input" id="${id}B" type="number" min="0" max="99" inputmode="numeric" value="${UI.esc(f.b)}" placeholder="anos" aria-label="${label} até (anos)">` : ''}
    </div></div>`;
  // texto do filtro numérico aplicado
  const descr = (f, rot) => (ativo(f) ? `${rot} ${f.op === 'entre' ? `entre ${f.a} e ${f.b || f.a}` : { '>=': '≥', '>': '>', '=': '=', '<=': '≤', '<': '<' }[f.op] + ' ' + f.a} anos` : '');
  const n = UI.norm;

  // chip colorido do estado de um EPI (ótimo/bom, regular, ruim)
  const estado = (v) => {
    if (!v) return UI.dash('');
    const t = /otimo|bom/.test(n(v)) ? 'ok' : /razoavel|regular/.test(n(v)) ? 'warn' : /pessimo|ruim/.test(n(v)) ? 'bad' : '';
    return UI.chip(v, t + ' dot');
  };
  // Sim / Não / –
  const sn = (v) => (v == null ? UI.dash('') : v ? 'Sim' : 'Não');
  // lista "rótulo: valor"
  const kv = (pares) => `<dl class="kv">${pares.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  // esconde parte do dado sensível (clique em "mostrar" revela)
  const mask = (v, vis = 2) => {
    const s = String(v || '');
    if (!s || s === '-') return UI.dash('');
    const oculto = s.slice(0, -vis).replace(/[0-9A-Za-z@._]/g, '•');
    return `<span class="masked" data-full="${UI.esc(s)}">${UI.esc(oculto + s.slice(-vis))}</span><button class="reveal" type="button">mostrar</button>`;
  };
  // validade com destaque se vencida ou perto de vencer
  const validade = (d) => {
    if (!d) return UI.dash('');
    const dias = (DS.parse(d) - DS.hoje()) / 864e5;
    const chip = dias < 0 ? UI.chip('Vencida', 'bad') : dias <= 90 ? UI.chip(`Vence em ${Math.ceil(dias)} d`, 'warn') : UI.chip('Válida', 'ok');
    return `<span class="num">${UI.data(d)}</span> ${chip}`;
  };
  // número de anos com 1 casa quando não for inteiro
  const anos = (v) => (v == null || v === '' || isNaN(v) ? '–' : UI.num(v, Number.isInteger(+v) ? 0 : 1));

  PAGES.dados = {
    title: 'Dados completos',
    render(view, params) {
      if (params.id) { st.id = params.id; st.q = ''; st.obm = ''; st.posto = ''; }
      let lista = DS.ordenar(DS.militares().filter((m) => (!st.obm || m.obm === st.obm) && (!st.posto || m.posto === st.posto) && (!st.q || n(m.nome + ' ' + m.nomeGuerra + ' ' + m.guerraCompleto + ' ' + m.nBM).includes(n(st.q)))
        && passa(idadeDe(m), st.idade) && passa(tempoDe(m), st.tempo)));
      if (st.ordem === 'tempo') lista = lista.slice().sort((a, b) => (tempoDe(b) ?? -1) - (tempoDe(a) ?? -1));
      if (st.ordem === 'idade') lista = lista.slice().sort((a, b) => (idadeDe(b) ?? -1) - (idadeDe(a) ?? -1));
      const filtroNum = [descr(st.tempo, 'Tempo de serviço'), descr(st.idade, 'Idade')].filter(Boolean).join(' e ');
      const extra = (x) => [ativo(st.tempo) || st.ordem === 'tempo' ? `${anos(tempoDe(x))} anos de serviço` : '', ativo(st.idade) || st.ordem === 'idade' ? `${anos(idadeDe(x))} anos de idade` : ''].filter(Boolean).join(', ');
      if (!st.id || !DS.militar(st.id)) st.id = lista[0]?.id || DS.militares()[0]?.id;
      const m = DS.militar(st.id);
      if (!m) {
        view.innerHTML = `<div class="page">${UI.pageHead('Dados completos dos militares', '')}${UI.vazio('Nenhum militar na planilha.')}</div>`;
        return;
      }

      const hoje = DS.hoje();
      const ferias = DS.feriasEm(hoje).find((f) => f.militar === m.id);
      const respondido = m.respondidoEm ? DS.parse(m.respondidoEm) : null;
      const velho = respondido && (hoje - respondido) / 864e5 > 365;
      const tempo = m.inclusao ? UI.anos(m.inclusao) : m.tempoServico;
      const idade = m.nascimento ? UI.anos(m.nascimento) : m.idade;
      const c = m.contato, p = m.pessoais, d = m.diaria, e = m.epi, a = m.armamento, ac = m.academico, emb = m.embarcacao;
      const endereco = [c.logradouro, c.numero].filter(Boolean).join(', ') + (c.complemento && c.complemento !== '-' ? ' – ' + c.complemento : '');

      const secoes = [
        UI.panel(ICON('badge') + 'Formação operacional', kv([
          ['Formação / aperfeiçoamento', UI.dash(m.formacao)],
          ['Data de inclusão', UI.data(m.inclusao)],
          ['Posição no almanaque', m.almanaque ? m.almanaque + 'º' : UI.dash('')],
          ['Posição no pelotão', m.posicaoPel ? m.posicaoPel + 'º' : UI.dash('')],
          ['Cursos de qualificação', m.cursos.length ? `<div class="chips">${m.cursos.map((x) => UI.chip(x, 'course')).join('')}</div>` : UI.dash('')],
        ])),
        UI.panel(ICON('wheel') + 'CNH e credenciamento', kv([
          ['Categoria da CNH', UI.dash(m.cnh)],
          ['Validade da CNH', validade(m.cnhValidade)],
          ['Nº de registro da CNH', mask(m.cnhRegistro, 3)],
          ['Motorista credenciado', sn(m.motorista)],
          ['Credenciado em', UI.dash(m.credenciado)],
          ['Curso de condutor de VE (CVE)', UI.simNao(m.cve)],
        ])),
        UI.panel(ICON('anchor') + 'Condução de embarcações', kv(emb ? [
          ['É condutor', 'Sim'],
          ['Curso/habilitação', UI.dash(emb.hab)],
          ['Nº do registro', UI.dash(emb.registro)],
          ['Validade', validade(emb.validade)],
        ] : [['É condutor', 'Não']])),
        UI.panel(ICON('phone') + 'Plano de chamada', kv([
          ['Celular', `<span class="num">${UI.dash(c.celular)}</span>`],
          c.celular2 && c.celular2 !== '-' ? ['Segundo celular', `<span class="num">${UI.esc(c.celular2)}</span>`] : null,
          c.telefone && c.telefone !== '-' ? ['Telefone residencial', `<span class="num">${UI.esc(c.telefone)}</span>`] : null,
          ['E-mail', UI.dash(c.email)],
          c.email2 && c.email2 !== '-' ? ['Segundo e-mail', UI.esc(c.email2)] : null,
          ['Endereço', UI.dash(endereco)],
          ['Bairro', UI.dash(c.bairro)],
          ['Município', UI.dash(c.municipio)],
          ['CEP', `<span class="num">${UI.dash(c.cep)}</span>`],
        ])),
        UI.panel(ICON('user') + 'Dados pessoais', kv([
          ['Data de nascimento', m.nascimento ? `${UI.data(m.nascimento)} <span class="muted">(${idade} anos)</span>` : UI.dash('')],
          ['Tipo sanguíneo e fator RH', UI.dash(m.tipoSanguineo)],
          ['Estado civil', UI.dash(p.estadoCivil)],
          ['Filhos', p.possuiFilhos === false ? 'Não' : p.filhos ? String(p.filhos) : sn(p.possuiFilhos)],
          ['Filiação', UI.dash(p.filiacao)],
          ['Identidade (RG)', mask(p.rg, 3)],
          ['CPF', mask(p.cpf, 2)],
        ])),
        UI.panel(ICON('wallet') + 'Empenho de diária', kv([
          ['Banco', UI.dash(d.banco)],
          ['Agência', mask(d.agencia, 2)],
          ['Tipo da conta', UI.dash(d.tipoConta)],
          ['Número da conta', mask(d.conta, 3)],
          ['Chave PIX', d.pixTipo ? `<span class="muted">${UI.esc(d.pixTipo)}</span> ${mask(d.pix, 4)}` : UI.dash('')],
          ['Quinquênio / ADE', UI.dash(d.quinquenio)],
        ]), { note: 'Dados sensíveis ficam mascarados até você tocar em "mostrar".' }),
        UI.panel(ICON('helmet') + 'EPI de incêndio urbano (CIURB)', kv([
          ['Capacete', e.possuiCapacete === false ? 'Não possui' : `${estado(e.capacete)} <span class="muted">${UI.esc(e.corCapacete || '')}</span>`],
          ['Capacete condiz com o posto', sn(e.capaceteCondiz)],
          ['Conjunto (capa + calça)', e.possuiConjunto === false ? 'Não possui' : e.conjunto ? `Cor ${UI.esc(e.conjunto.toLowerCase())}` : sn(e.possuiConjunto)],
          ['Capa', estado(e.capa)],
          ['Calça', estado(e.calca)],
          ['Bota', e.possuiBota === false ? 'Não possui' : estado(e.bota)],
          ['Luva', e.possuiLuva === false ? 'Não possui' : estado(e.luva)],
          ['Balaclava', sn(e.balaclava)],
          ['Nº do patrimônio', UI.dash(e.patrimonio)],
        ])),
        UI.panel(ICON('gun') + 'Armamento', kv(a.possui ? [
          ['Possui armamento', UI.chip('Sim', 'ok dot') + (a.quantos ? ` <span class="muted">${a.quantos} arma(s)</span>` : '')],
          ...a.armas.map((x, i) => [`Armamento ${i + 1}`, `${UI.dash(x.desc)}${x.reg && x.reg !== '-' ? `<br><small class="muted">Registro</small> ${mask(x.reg, 3)}` : ''}`]),
          a.demais ? ['Demais armamentos', UI.esc(a.demais)] : null,
        ] : [['Possui armamento', 'Não']])),
        UI.panel(ICON('book') + 'Formação acadêmica', kv([
          ['Técnico de nível médio', ac.tecnico ? UI.esc(ac.tecnico) : sn(ac.possuiTecnico)],
          ['Nível superior', ac.curso ? UI.esc(ac.curso) : (ac.superior ? 'Sim' : 'Não')],
          ['Pós-graduação', ac.pos ? `${ac.tipoPos ? `<span class="muted">${UI.esc(ac.tipoPos)}</span> ` : ''}${UI.esc(ac.pos)}` : sn(ac.possuiPos)],
        ])),
      ];
      if (DS.ligada('ferias')) {
        const fs = DS.ferias().filter((f) => f.militar === m.id).sort((x, y) => x.inicio.localeCompare(y.inicio));
        secoes.push(UI.panel(ICON('plane') + 'Férias registradas', fs.length ? `<ul class="list">${fs.map((f) => `<li><span>${f.periodoTxt ? UI.esc(f.periodoTxt) + ' período' : f.periodo ? f.periodo + 'º período' : 'Período'} <small class="muted">(${f.tipo}, ${f.dias} dias)</small></span><span class="when">${UI.dm(f.inicio)} a ${UI.data(f.fim)}</span></li>`).join('')}</ul>` : UI.vazio('Sem férias lançadas.'), { flush: true }));
      }

      const pos = lista.findIndex((x) => x.id === m.id);
      const ant = pos > 0 ? lista[pos - 1] : null, prox = pos >= 0 && pos < lista.length - 1 ? lista[pos + 1] : null;
      view.innerHTML = `<div class="page">
        ${UI.pageHead('Dados completos dos militares', 'Ficha montada a partir do formulário do efetivo.', UI.linkPlanilha('efetivo') + UI.exp.btnTela())}
        <div class="filters dc-filtros">
          ${UI.input('dQ', 'Buscar', st.q, { placeholder: 'Nome, guerra ou nº BM' })}
          ${UI.select('dObm', 'OBM', DS.obms(), st.obm)}
          ${UI.select('dPosto', 'Posto/graduação', DS.postos(), st.posto)}
          ${numFiltro('dTempo', 'Tempo de serviço', st.tempo)}
          ${numFiltro('dIdade', 'Idade', st.idade)}
          ${UI.select('dOrdem', 'Ordenar por', [['tempo', 'Mais tempo de serviço'], ['idade', 'Mais velhos']], st.ordem, { todos: 'Hierarquia e OBM' })}
        </div>
        <div class="dc-nav">
          <button type="button" class="btn ${listaAberta() ? '' : 'primary'}" id="dToggle" aria-expanded="${listaAberta()}" aria-controls="dListaPanel">${ICON(listaAberta() ? 'collapse' : 'menu')}${listaAberta() ? 'Recolher lista' : 'Mostrar lista'} <span class="count">${lista.length}</span></button>
          ${UI.btnLimpar('dLimpar')}
          ${filtroNum ? `<span class="chip info" style="height:auto;white-space:normal">${UI.esc(filtroNum)}</span>` : ''}
          <div class="dc-pag">
            <button type="button" class="icon-btn" id="dAnt" ${ant ? '' : 'disabled'} aria-label="Militar anterior" title="${ant ? UI.esc(DS.guerra(ant)) : ''}">${ICON('chevronL')}</button>
            <span class="num">${pos >= 0 ? `${pos + 1} de ${lista.length}` : `fora do filtro (${lista.length})`}</span>
            <button type="button" class="icon-btn" id="dProx" ${prox ? '' : 'disabled'} aria-label="Próximo militar" title="${prox ? UI.esc(DS.guerra(prox)) : ''}">${ICON('chevron')}</button>
          </div>
        </div>
        <div class="dc-layout ${listaAberta() ? '' : 'sem-lista'}">
          <section class="panel dc-lista" id="dListaPanel" ${listaAberta() ? '' : 'hidden'}>
            <div class="panel-h"><h3>Militares <span class="count">${lista.length}</span></h3></div>
            <div class="tbl-wrap scroll-y" id="dScroll">
              <div id="dLista">${lista.map((x) => `<button class="mil-pick" type="button" data-id="${x.id}" aria-current="${x.id === m.id}"><span class="photo av">${UI.iniciais(x)}</span><span class="tx"><b>${UI.esc(DS.guerra(x))}</b><small>${UI.esc(x.obm)}${extra(x) ? ' / ' + extra(x) : ''}</small></span><span class="when num">${UI.esc(x.nBM)}</span></button>`).join('') || UI.vazio('Nenhum militar encontrado.')}</div>
            </div>
          </section>

          <div class="grid" id="dFicha">
            <section class="panel"><div class="panel-b">
              <div class="dc-head">
                ${UI.fotoBox(m)}
                <div class="grid" style="gap:10px">
                  <div><div class="mil-name" style="font-size:clamp(20px,2.4vw,27px)">${UI.esc(m.nome)}</div><div class="mil-sub">${UI.esc(DS.guerra(m))}</div></div>
                  <div class="chips">${UI.obm(m.obm)}${UI.chip('BM ' + m.nBM)}${ferias ? UI.chip('De férias até ' + UI.dm(ferias.fim), 'warn') : UI.chip('Em atividade', 'ok dot')}${m.tipoSanguineo ? UI.chip(m.tipoSanguineo, 'bad') : ''}</div>
                  <div class="dc-kpis">
                    ${UI.kpi('Tempo de serviço', anos(tempo), { small: anos(tempo) === '–' ? '' : 'anos' })}
                    ${UI.kpi('Idade', anos(idade), { small: anos(idade) === '–' ? '' : 'anos' })}
                    ${UI.kpi('Almanaque', m.almanaque ? m.almanaque + 'º' : '–')}
                    ${DS.ligada('horas') ? UI.kpi('Horas excedentes', UI.num((DS.horas().find((h) => h.militar === m.id) || { he: 0 }).he), { small: 'h', tone: 'gold' }) : ''}
                    ${UI.kpi('Quinquênio / ADE', `<span style="font-size:20px">${UI.esc(m.diaria.quinquenio || '–')}</span>`)}
                  </div>
                  ${respondido ? `<small class="${velho ? 'stale' : 'muted'}">Formulário respondido em ${UI.data(respondido)}${velho ? '. Peça ao militar para atualizar o formulário.' : ''}</small>` : ''}
                </div>
              </div>
            </div></section>
            <div class="dc-sections">${secoes.join('')}</div>
          </div>
        </div>
      </div>`;

      if (!lista.length) view.querySelector('#dFicha').innerHTML = UI.panel('Nenhum militar encontrado', '<p>Nenhum militar atende a todos os filtros. Ajuste os valores ou toque em "Limpar filtros".</p>');
      UI.carregaFotos(view);
      const rer = () => PAGES.dados.render(view, {});
      view.querySelector('#telaPdf').onclick = () => UI.exp.imprimirTela('Dados completos – ' + DS.guerra(m));
      UI.ligaBusca(view, 'dQ', st, rer, 220);
      view.querySelector('#dObm').onchange = (ev) => { st.obm = ev.target.value; st.id = null; rer(); };
      view.querySelector('#dPosto').onchange = (ev) => { st.posto = ev.target.value; st.id = null; rer(); };
      view.querySelector('#dOrdem').onchange = (ev) => { st.ordem = ev.target.value; st.id = null; rer(); };
      view.querySelector('#dLimpar').onclick = () => {
        Object.assign(st, { q: '', obm: '', posto: '', ordem: '', id: null, idade: { op: '', a: '', b: '' }, tempo: { op: '', a: '', b: '' } });
        rer();
      };
      [['dTempo', 'tempo'], ['dIdade', 'idade']].forEach(([id, k]) => {
        view.querySelector('#' + id + 'Op').onchange = (ev) => {
          st[k].op = ev.target.value;
          st.id = null;
          rer();
          const a = view.querySelector('#' + id + 'A');
          if (a && st[k].op && st[k].a === '') a.focus();
        };
        ['A', 'B'].forEach((s) => {
          const el = view.querySelector('#' + id + s); if (!el) return;
          el.oninput = () => {
            st[k][s.toLowerCase()] = el.value;
            st.id = null;
            clearTimeout(st._tn);
            st._tn = setTimeout(() => { rer(); const ne = view.querySelector('#' + id + s); if (ne) { ne.focus(); } }, 350);
          };
        });
      });
      view.querySelector('#dLista').addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-id]'); if (!b) return;
        st.id = b.dataset.id; const sc = view.querySelector('#dScroll').scrollTop; rer();
        view.querySelector('#dScroll').scrollTop = sc;
        if (innerWidth <= 1100) view.querySelector('#dFicha').scrollIntoView({ behavior: 'smooth' });
      });
      // mantém o militar selecionado visível na lista
      const atual = view.querySelector('#dLista [aria-current="true"]'), sc = view.querySelector('#dScroll');
      if (atual && sc && listaAberta()) {
        const top = atual.offsetTop - sc.offsetTop;
        if (top < sc.scrollTop || top > sc.scrollTop + sc.clientHeight - atual.offsetHeight) sc.scrollTop = top - sc.clientHeight / 2;
      }
      view.querySelector('#dToggle').onclick = () => { st.lista = !listaAberta(); PREFS.marcar('dc-lista', st.lista); rer(); };
      const vai = (x) => { if (!x) return; st.id = x.id; const y = window.scrollY; rer(); window.scrollTo({ top: y }); };
      view.querySelector('#dAnt').onclick = () => vai(ant);
      view.querySelector('#dProx').onclick = () => vai(prox);
      view.querySelectorAll('.reveal').forEach((b) => b.addEventListener('click', () => {
        const s = b.previousElementSibling;
        s.textContent = s.dataset.full;
        b.remove();
      }));
    },
  };
})();
