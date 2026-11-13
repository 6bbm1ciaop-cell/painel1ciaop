/* ==========================================================================
   TELA › ESCALA MENSAL (#escala-mensal)
   Monta a escala operacional do mês (normalmente o seguinte) com o efetivo,
   férias e licenças; o que muda todo mês (funções, SAO, observações, canil,
   COBOM) fica livre para editar. Lançamentos ficam num rascunho neste
   navegador até "Gravar versão" (cada gravação é uma nova VERSÃO Nº).
   Partes: modelo.js (cálculos), folha.js (folha A4 e impressão), este arquivo (tela).
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const E = () => C.escalaMensal;
  const { esc } = UI;
  // compAberto: quadro da compensação de turno aberto (começa recolhido)
  const est = { mes: null, aba: 'pel', erro: null, compAberto: false };
  const ABAS = [['pel', 'Pelotões'], ['pemad', 'PEMAD'], ['obs', 'Observações'], ['pbresc', 'PBRESC'], ['cobom', 'COBOM'], ['faxina', 'Faxina e viaturas'], ['folha', 'Folha e impressão']];
  const dd = (n) => String(n).padStart(2, '0');
  // com o dedo/mouse apertado não redesenha (senão o clique num botão logo depois de editar um campo se perde)
  let apertado = false;
  document.addEventListener('pointerdown', () => { apertado = true; }, true);
  document.addEventListener('pointerup', () => { setTimeout(() => { apertado = false; }, 0); }, true);
  document.addEventListener('pointercancel', () => { apertado = false; }, true);
  const quando = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}${s.slice(10)}` : '');

  /* ---------- duas pessoas gravando ao mesmo tempo ---------- */
  const PARTE = { func: 'Função', mot: 'Motorista', afast: 'Afastamento', cor: 'Destaque', ocultos: 'Militar tirado da escala', extras: 'Linha avulsa',
    grade: 'Quadro de dias', saoPadrao: 'SAO padrão', rpaPadrao: 'Pilotos de RPA padrão', sao: 'SAO', rpa: 'Pilotos de RPA', obs: 'Observações',
    textos: 'Texto da folha', viaturas: 'Viaturas', compensacao: 'Compensação de turno', semComp: 'Compensação de turno', pbresc: 'PBRESC', cobom: 'COBOM' };
  const nomeChave = (k) => { const m = DS.todos().find((x) => DS.chaveMil(x) === k); return m ? DS.guerra(m) : null; };
  // conflito em palavras: "Função – 3º Sgt Fulano", "Quadro de dias – 1º Pel 05/11"
  function descreveConflito(c) {
    const [p, a, b] = c.cam;
    let alvo = '';
    if (p === 'grade' && a) { const [o, dia] = String(a).split('|'); alvo = `${o} ${dia ? dia.slice(8, 10) + '/' + dia.slice(5, 7) : ''}`; }
    else if (['obs', 'rpa', 'rpaPadrao'].includes(p) && a) alvo = /^\d$/.test(a) ? `${a}º Pel / ${a}ª Ala` : a;
    else if (a) alvo = nomeChave(a) || (String(a).startsWith('#') ? '' : a);
    if (p === 'pbresc' && a === 'linhas') alvo = 'linha ' + (b ? String(b).replace('#', '') : '');
    const val = (v) => (v === undefined || v === '' ? '(vazio)' : typeof v === 'string' ? v : typeof v === 'boolean' ? (v ? 'sim' : 'não') : '(alterado)');
    return `<li><b>${esc(PARTE[p] || p)}</b>${alvo ? ' – ' + esc(alvo) : ''}: seu <b>${esc(val(c.meu))}</b> × da outra pessoa <b>${esc(val(c.deles))}</b></li>`;
  }

  /* ---------- campos ---------- */
  // campo de texto ligado ao doc: ed = caminho (ver aplica), auto = valor automático (igual a ele → volta ao automático)
  const campo = (ed, valor, { auto, cls = '', lista = '', ph = '', tipo = 'text', titulo = '' } = {}) => {
    const editado = auto !== undefined && valor !== auto;
    return `<input class="es-in ${cls} ${editado ? 'ed' : ''}" type="${tipo}" data-ed="${esc(ed)}" value="${esc(valor)}" ${auto !== undefined ? `data-auto="${esc(auto)}"` : ''} ${lista ? `list="${lista}"` : ''} placeholder="${esc(ph)}" title="${esc(titulo || (editado ? `Lançado à mão. Automático: ${auto || '(vazio)'}` : ''))}" autocomplete="off">`;
  };
  const area = (ed, valor, { auto, linhas = 8, ph = '' } = {}) =>
    `<textarea class="es-area ${auto !== undefined && valor !== auto ? 'ed' : ''}" data-ed="${esc(ed)}" ${auto !== undefined ? `data-auto="${esc(auto)}"` : ''} rows="${linhas}" placeholder="${esc(ph)}">${esc(valor)}</textarea>`;
  const volta = (acao, titulo = 'Voltar ao automático') => `<button type="button" class="es-volta" data-acao="${esc(acao)}" title="${titulo}" aria-label="${titulo}">↺</button>`;

  // destaque da linha: automático (pelo afastamento) ou cor escolhida
  const NOME_TOM = { fer: 'verde', fer2: 'verde claro', lic: 'vermelho', disp: 'laranja', extra: 'amarelo', '': 'sem destaque' };
  const corSel = (ed, l) => `<select class="es-cor t-${esc(l.tom || 'nada')}" data-ed="${esc(ed)}" title="Destaque da linha na folha (Auto = ${NOME_TOM[l.tomAuto] || l.tomAuto}, pelo afastamento)" aria-label="Destaque da linha">${ESC.CORES.map(([v, t]) => `<option value="${v}" ${v === l.cor ? 'selected' : ''}>${v ? t : 'Auto'}</option>`).join('')}</select>`;

  /* ---------- seções ---------- */
  // quadro de dias de serviço: também funciona como planilha (planilha.js)
  function secGrade(M, doc) {
    const ed = doc.grade && Object.keys(doc.grade).length;
    const cab = `<tr><th></th>${M.dias.map((x, i) => `<th class="pl-colh ${x.fds ? 'fds' : ''} ${x.feriado ? 'fer' : ''}" data-col="${i}" title="${esc(x.feriado || 'Clique para selecionar o dia')}">${x.n}<small>${x.sem}</small></th>`).join('')}</tr>`;
    const linhas = [1, 2, 3, 4].map((p, r) => `<tr><th class="pl-linh" data-lin="${r}" title="Clique para selecionar a linha"><span class="pel pc${p}">${p}º Pel</span></th>${M.grade[p].map((c, i) => `<td class="pc ${M.dias[i].fds ? 'fds' : ''} ${c.v !== c.auto ? 'ed' : ''}" data-r="${r}" data-c="${i}" data-ed="${esc(`grade|${p}|${M.dias[i].iso}`)}" data-auto="${esc(c.auto)}">${esc(c.v)}</td>`).join('')}</tr>`).join('');
    return UI.panel('Dias de serviço', `<div class="es-scroll pl-wrap" data-scroll="grade"><table class="es-grade es-planilha" data-grade="dias" data-foco="grade-dias" tabindex="0" aria-label="Dias de serviço dos pelotões">${cab}${linhas}</table></div>`, {
      note: `X = dia de serviço pela escala 24×72. Sábado: ${esc(E().marcas[6] || 'X')} (faxina); domingo: ${esc(E().marcas[0] || 'X')} (limpeza de viaturas). Feriados em vermelho. Funciona como planilha: setas, digitar, Shift/arrastar para selecionar, Ctrl+C/Ctrl+V, Delete, Ctrl+Z. Célula com traço amarelo = mudada à mão.`,
      actions: ed ? `<button type="button" class="btn ghost sm" data-acao="limpa-grade">${ICON('reset')}<span>Refazer automático</span></button>` : '',
    });
  }

  function secQuadro(q) {
    const n = UI.corPel(q.obm), c = q.cont;
    const linhas = q.linhas.map((l, i) => {
      if (l.tipo === 'extra') {
        const b = `x|${q.obm}|${l.id}|`;
        // com posto/graduação no nome, a posição é automática (# só mostra); sem posto, escolhe-se o número
        const pos = (l.posAuto
          ? `<td class="es-n" title="${l.daCia ? 'Militar da companhia: posição pela antiguidade, como na tela Geral' : 'Posição automática: última colocação do posto/graduação escrito no nome'}">${i + 1}</td>`
          : `<td>${campo(b + 'pos', String(l.pos), { cls: 'pos', tipo: 'number', titulo: 'Posição da linha no quadro (escreva o posto no nome, ex.: 3º Sgt Fulano, para ficar automática)' })}</td>`).replace('<td', `<td><span class="es-arr" draggable="true" data-arr="x|${esc(l.id)}|${esc(q.obm)}|${esc(q.obm)}" data-acao="arr|x|${esc(l.id)}|${esc(q.obm)}|${esc(q.obm)}" data-nome="${esc(l.nome || 'Linha avulsa')}" title="Arraste para outro pelotão/ala (ou clique para escolher)">${ICON('move')}</span></td><td`);
        return `<tr class="es-extra ${l.tom ? 't-' + l.tom : ''}">${pos}
          <td>${campo(b + 'nome', l.nome, { ph: 'Ex.: 3º Sgt Fulano, nº BM ou CBU Rotativo' })}</td><td>${campo(b + 'afast', l.afast, { ph: '—' })}</td>
          <td>${campo(b + 'func', l.func, { lista: 'esFuncoes', cls: 'curto' })}</td><td>${campo(b + 'mot', l.mot, { lista: 'esMot', cls: 'curto mot' })}</td>
          <td>${corSel(b + 'cor', l)}</td><td><button type="button" class="es-x" data-acao="delx|${esc(q.obm)}|${esc(l.id)}" title="Apagar esta linha" aria-label="Apagar esta linha">${ICON('x')}</button></td></tr>`;
      }
      // alça para levar o militar a outro pelotão/ala (4.85): arrastar ou clicar e escolher
      const base = l.movidoDe || q.obm;
      return `<tr class="${l.tom ? 't-' + l.tom : ''}"><td><span class="es-arr" draggable="true" data-arr="m|${esc(l.k)}|${esc(base)}|${esc(q.obm)}" data-acao="arr|m|${esc(l.k)}|${esc(base)}|${esc(q.obm)}" data-nome="${esc(`${l.posto} ${l.nome}`)}" title="Arraste para outro pelotão/ala (ou clique para escolher)">${ICON('move')}</span></td><td class="es-n">${i + 1}</td>
        <td class="es-mil"><span class="muted">${esc(l.posto)}</span> ${esc(l.nome)}${l.movidoDe ? ` <button type="button" class="es-mov" data-acao="arr-volta|${esc(l.k)}" title="Na planilha está no ${esc(l.movidoDe)}. Clique para voltar.">do ${esc(l.movidoDe.replace(' PEMAD', ''))} ↩</button>` : ''}</td>
        <td><span class="es-c">${campo(`afast|${l.k}`, l.afast, { auto: l.afastAuto, ph: '—' })}${l.afastEd ? volta(`auto|afast|${l.k}`) : ''}</span></td>
        <td><span class="es-c">${campo(`func|${l.k}`, l.func, { auto: l.funcAuto, lista: 'esFuncoes', cls: 'curto' })}${l.funcEd ? volta(`auto|func|${l.k}`) : ''}</span></td>
        <td><span class="es-c">${campo(`mot|${l.k}`, l.mot, { auto: l.motAuto, lista: 'esMot', cls: 'curto mot', titulo: l.motEd ? '' : 'Automático pelo credenciamento (D/E = MP; B/C = ML; CBU = MP*). MP* não soma no total de MP.' })}${l.motEd ? volta(`auto|mot|${l.k}`) : ''}</span></td>
        <td>${corSel(`cor|${l.k}`, l)}</td><td><button type="button" class="es-x" data-acao="ocultar|${esc(l.k)}" title="Tirar ${esc(l.nome)} desta escala" aria-label="Tirar da escala">${ICON('x')}</button></td></tr>`;
    }).join('');
    const fora = q.escondidos.length ? `<p class="es-fora">Fora desta escala: ${q.escondidos.map((x) => `<button type="button" class="link" data-acao="mostrar|${esc(x.k)}" title="Voltar para a escala">${esc(x.nome)} ↩</button>`).join(', ')}</p>` : '';
    const contagem = `${q.ehPel ? `${dd(c.ten)} Ten · ${dd(c.sgt)} Sub Ten/Sgt` : `${dd(c.ten + c.sgt)} Sgt`} · ${dd(c.cbsd)} Cb/Sd · <b>${dd(c.ml)} ML · ${dd(c.mp)} MP</b>`;
    return `<section class="panel es-q ${n ? 'pc' + n : ''}" data-obm="${esc(q.obm)}"><div class="panel-h"><h3>${esc(q.titulo)}</h3><span class="es-cont">${contagem}</span></div>
      <div class="es-scroll"><table class="es-tab"><thead><tr><th class="es-arr-h" title="Arraste para outro pelotão/ala"></th><th>#</th><th>Militar</th><th>Afastamento</th><th>Função</th><th>Mot.</th><th>Destaque</th><th></th></tr></thead><tbody>${linhas || '<tr><td colspan="8" class="muted">Sem militares neste quadro.</td></tr>'}</tbody></table></div>
      <div class="es-q-pe">${q.ehPel ? `<label class="es-sao">SAO <span class="es-c">${campo(`sao|${q.obm}`, q.sao.texto, { auto: q.sao.auto, ph: 'Escolha o padrão ou escreva (ex.: Sgt Viana e Cb Marcus Soares)' })}${q.sao.ed ? volta(`auto|sao|${q.obm}`, 'Voltar aos militares padrão') : ''}</span></label>
        <button type="button" class="btn ghost sm" data-acao="saopad|${esc(q.obm)}" title="Escolher os militares que fazem o SAO deste pelotão todo mês">SAO padrão${q.sao.padrao.length ? ` (${q.sao.padrao.length})` : ''}…</button>` : ''}
        <button type="button" class="btn ghost sm" data-acao="addx|${esc(q.obm)}">+ Linha avulsa</button>${fora}</div></section>`;
  }

  function secPel(M, doc) {
    return `${secGrade(M, doc)}<div class="es-quadros">${ESC.PELS.map((o) => secQuadro(M.quadros[o])).join('')}</div>
      <p class="es-ajuda">Ordem, nomes e afastamentos vêm das planilhas (efetivo, férias e licenças). Função e motorista são sugeridos (1ª linha CBU, 2ª AUX/CH, Sgt CH, Cb/Sd CBT; CM = motorista pesado mais antigo depois do CBU e do auxiliar; motorista pelo credenciamento, com o CBU em MP*) e podem ser trocados. <b>MP*</b> não entra no total de MP (carteira vencida, CBU…): cada mês começa com as trocas do mês anterior. Campo em amarelo = lançado à mão (↺ volta ao automático).</p>`;
  }

  function secPemad(M) {
    return `${UI.panel('Título', `<label class="es-lbl">Linha do 5º Pelotão ${campo('tx|pemad', M.textos.pemad, { auto: M.textosAuto.pemad })}</label>`)}
      <div class="es-quadros">${ESC.ALAS.map((o) => secQuadro(M.quadros[o])).join('')}</div>
      ${UI.panel('Pilotos de RPA/Drone', `<div class="es-4">${[1, 2, 3, 4].map((c) => `<label class="es-lbl">${c}º Pel / ${c}ª Ala <span class="es-c">${campo(`rpa|${c}`, M.rpa[c].texto, { auto: M.rpa[c].auto, ph: 'Ninguém com curso de RPA' })}${M.rpa[c].ed ? volta(`auto|rpa|${c}`, 'Voltar aos pilotos padrão') : ''}</span>
        <button type="button" class="btn ghost sm" data-acao="rpapad|${c}" title="Escolher os pilotos padrão desta coluna">Pilotos padrão${M.rpa[c].padrao.length ? ` (${M.rpa[c].padrao.length})` : ''}…</button></label>`).join('')}</div>`,
        { note: 'Entram sozinhos na escala: os pilotos padrão escolhidos ou, sem padrão, os militares do pelotão e da ala com curso de RPA/drone na planilha do efetivo. O padrão passa para os próximos meses; dá para escrever outros nomes num mês específico.' })}`;
  }

  // chave "Compensação de turno" e o quadro para desligar a compensação de um militar
  function secCompensacao(M) {
    const cp = M.compensacao;
    const chave = `<label class="es-switch"><input type="checkbox" data-ed="comp" ${cp.ligada ? 'checked' : ''}><span class="es-sw" aria-hidden="true"></span><b>Compensação de turno</b></label>`;
    const ajuda = '<p class="es-ajuda">Ligada: quem entra de férias antes do próximo plantão "perde" folgas (até 3, na escala 24×72); elas são devolvidas depois das férias. A volta é o 1º plantão depois disso e os dias que sobram até ele viram compensação de H.E (banco de horas). Ex.: 1º Pel trabalha 05/11, FA de 06/11 a 11/11 → retorno 17/11, H.E 15/11 e 16/11.</p>';
    if (!cp.ligada) return UI.panel('Retorno de férias', chave + ajuda);
    const editadas = [1, 2, 3, 4].filter((c) => M.obs[c].ed);
    const linhas = cp.lista.map((x) => `<tr class="${x.ativo ? '' : 'es-off'}"><td><label class="es-chk"><input type="checkbox" data-ed="semcomp|${esc(x.k)}" ${x.ativo ? 'checked' : ''}> <b>${esc(x.nome)}</b></label></td>
      <td>${esc(x.obm.replace(' PEMAD', ''))}</td><td>${esc(x.periodo)}</td><td class="c">${x.ativo ? x.perdidas : '–'}</td><td class="c"><b>${esc(x.retorno)}</b></td><td>${x.he.length ? esc(x.he.join(', ')) : '<span class="muted">–</span>'}</td></tr>`).join('');
    return UI.panel('Retorno de férias', `${chave}${ajuda}
      ${cp.lista.length ? `<details class="es-comp-d" ${est.compAberto ? 'open' : ''}><summary>Militares que voltam de férias: <b>${cp.lista.filter((x) => x.ativo).length}</b> com compensação${cp.lista.some((x) => !x.ativo) ? `, <b>${cp.lista.filter((x) => !x.ativo).length}</b> sem` : ''} <span class="muted">· clique para ${est.compAberto ? 'recolher' : 'ver e alterar'}</span></summary><div class="es-scroll"><table class="es-tab es-comp"><thead><tr><th>Compensar</th><th>Quadro</th><th>Férias</th><th class="c">Folgas perdidas</th><th class="c">Retorno</th><th>Compensação de H.E</th></tr></thead><tbody>${linhas}</tbody></table></div></details>`
        : '<p class="muted">Ninguém volta de férias neste mês.</p>'}
      ${editadas.length ? `<p class="es-aviso-ed">⚠ ${editadas.map((c) => `${c}º Pel/${c}ª Ala`).join(', ')}: texto escrito à mão, que não muda sozinho. Use "Sugestões" na coluna para refazer com a compensação.</p>` : ''}`,
    { note: 'No quadro, desmarque um militar para ele voltar no 1º plantão depois das férias, sem compensação.' });
  }

  function secObs(M) {
    return `${secCompensacao(M)}
      <p class="es-ajuda">Texto livre de cada coluna. Enquanto você não mexer, ele mostra as sugestões de retorno: quem termina férias ou licença no mês (ou até ${E().retornoAte} dias depois) e o dia da volta${M.compensacao.ligada ? ', com a compensação de H.E' : ' (1º plantão do pelotão depois disso)'}. Complete com apresentações, agregações etc.</p>
      <div class="es-obs">${[1, 2, 3, 4].map((c) => {
        const o = M.obs[c];
        return UI.panel(o.titulo, area(`obs|${c}`, o.texto, { auto: o.auto, linhas: 14, ph: 'Sem retornos previstos. Escreva aqui as observações.' }), {
          cls: `pc${c}`, actions: o.ed ? `<button type="button" class="btn ghost sm" data-acao="auto|obs|${c}">${ICON('reset')}<span>Sugestões</span></button>` : '',
        });
      }).join('')}</div>`;
  }

  // grade livre (PBRESC / COBOM)
  /* grade livre (PBRESC / COBOM) que funciona como planilha (ver planilha.js):
     cada célula é <td class="pc" data-r data-c data-ed>; no PBRESC a 1ª coluna (nome) também é célula */
  function gradeLivre(M, linhas, { tipo }) {
    const pb = tipo === 'pb', d0 = pb ? 2 : 0;   // coluna da planilha onde começam os dias (PBRESC: equipe e nome antes)
    const cab = `<tr>${pb ? '<th class="pl-colh pl-eq" data-col="0" title="Letra da equipe (A ou B). As linhas ficam em ordem de equipe sozinhas.">Eq.</th><th class="pl-colh pl-nome" data-col="1">Militar</th>' : '<th>Turno</th>'}${M.dias.map((x, i) => `<th class="pl-colh ${x.fds ? 'fds' : ''} ${x.feriado ? 'fer' : ''}" data-col="${i + d0}" title="${esc(x.feriado || 'Clique para selecionar o dia')}">${x.n}<small>${x.sem}</small></th>`).join('')}${pb ? '<th></th>' : ''}</tr>`;
    const celula = (r, c, ed, v, { auto, cls = '' } = {}) => `<td class="pc ${cls}" data-r="${r}" data-c="${c}" data-ed="${esc(ed)}" ${auto !== undefined ? `data-auto="${esc(auto)}"` : ''}>${esc(v)}</td>`;
    const corpo = linhas.map((l, r) => `<tr>${pb
      ? celula(r, 0, `pb|${l.id}|eq`, l.eq, { cls: 'pl-eq' }) + celula(r, 1, `pb|${l.id}|nome`, l.nome, { cls: 'pl-nome' })
      : `<th class="pl-linh" data-lin="${r}" title="Clique para selecionar o turno">${esc(l.t)}</th>`}${l.cel.map((c, i) => (pb
      ? celula(r, i + d0, `pbd|${l.id}|${i + 1}`, c.v, { auto: c.auto, cls: `${M.dias[i].fds ? 'fds' : ''} ${c.auto && !c.ed ? 'af' : ''} ${c.ed ? 'ed' : ''}` })
      : celula(r, i, `cb|${l.t}|${i + 1}`, c, { cls: M.dias[i].fds ? 'fds' : '' }))).join('')}${pb ? `<td><button type="button" class="es-x" data-acao="pbdel|${esc(l.id)}" title="Apagar linha" aria-label="Apagar linha">${ICON('x')}</button></td>` : ''}</tr>`).join('');
    return `<div class="es-scroll pl-wrap" data-scroll="${tipo}"><table class="es-grade es-livre es-planilha" data-grade="${tipo}" data-foco="grade-${tipo}" tabindex="0" aria-label="Grade ${pb ? 'do PBRESC' : 'do COBOM'}">${cab}${corpo}</table></div>
      <p class="es-ajuda pl-dica">Funciona como planilha: setas, Tab e Enter andam; comece a digitar para escrever (F2 ou duplo clique edita); arraste ou use Shift para selecionar várias; Ctrl+C / Ctrl+V copiam e colam (também do Excel e do Google Planilhas); Delete apaga; Ctrl+Z desfaz.</p>`;
  }
  const ciclo = (tipo, padrao) => `<span class="es-ciclo"><label>Ciclo de <input class="es-in curto" type="number" min="1" max="31" id="${tipo}Ciclo" value="${padrao}"> dias</label>
    <button type="button" class="btn ghost sm" data-acao="ciclo|${tipo}" title="Repete os últimos dias do mês anterior, continuando a sequência">Continuar do mês anterior</button>
    <button type="button" class="btn ghost sm" data-acao="limpa|${tipo}">Limpar grade</button></span>`;

  function secPbresc(M) {
    const pb = M.pbresc;
    return `${UI.panel('PBRESC - Pelotão de Busca, Resgate e Salvamento com Cães', gradeLivre(M, pb.linhas, { tipo: 'pb' }), {
      actions: `<span class="btn-row"><button type="button" class="btn ghost sm" data-acao="pbadd">+ Linha</button>
        <button type="button" class="btn ghost sm" data-acao="ciclo|pb" title="Continua o ciclo 12/36 das equipes A e B: numa semana seg, qua e qui; na outra ter, qui e sex + SCA no fim de semana (alterna toda segunda)">Continuar do mês anterior</button>
        <button type="button" class="btn ghost sm" data-acao="limpa|pb">Limpar grade</button></span>`,
      note: 'Na coluna "Eq." escreva a letra da equipe (A ou B): as linhas ficam em ordem de equipe sozinhas (A primeiro, depois B), na ordem em que estão dentro de cada equipe, e a letra sai antes do nome na folha ("A) Sgt Fulano"). Grade livre: X, SCA, FA… "Continuar do mês anterior" segue o ciclo 12/36 das equipes (uma semana seg, qua e qui; na outra ter, qui, sex e SCA no fim de semana; quinta todos juntos), a partir de onde cada equipe parou no mês anterior. Férias e licenças aparecem sozinhas (em cinza) e não são apagadas.',
    })}
    <div class="es-duas">${UI.panel('Prescrições Gerais do PBRESC', area('pbp', pb.prescricoes, { linhas: 9 }))}
      ${UI.panel('Observações', area('pbo', pb.obs, { auto: pb.obsAuto, linhas: 9 }), { actions: pb.obsEd ? `<button type="button" class="btn ghost sm" data-acao="auto|pbo">${ICON('reset')}<span>Sugestão</span></button>` : '' })}</div>`;
  }

  function secCobom(M) {
    const cb = M.cobom;
    const leg = cb.legenda.map((x, i) => `<div class="es-leg">${campo(`leg|${i}|letra`, x.letra, { cls: 'letra' })}${campo(`leg|${i}|nome`, x.nome, { ph: 'Posto e nome ou nº BM' })}<button type="button" class="es-x" data-acao="legdel|${i}" title="Apagar" aria-label="Apagar">${ICON('x')}</button></div>`).join('');
    return `${UI.panel('Título', `<label class="es-lbl">Linha do COBOM/CIAD ${campo('tx|cobom', M.textos.cobom, { auto: M.textosAuto.cobom })}</label>`)}
    ${UI.panel('Grade do COBOM/CIAD', gradeLivre(M, cb.turnos, { tipo: 'cb' }), { actions: ciclo('cb', 6), note: 'Digite as letras dos despachantes/teleatendentes de cada turno (ex.: EH, AFN). A conferência avisa letra sem ninguém na legenda e militar escalado em dia de férias ou licença.' })}
    <div class="es-duas">${UI.panel('Despachante / Teleatendente', `<div class="es-legs">${leg}</div><button type="button" class="btn ghost sm" data-acao="legadd">+ Letra</button>`)}
      ${UI.panel('Observações', area('cbo', cb.obs, { auto: cb.obsAuto, linhas: 10 }), { actions: cb.obsEd ? `<button type="button" class="btn ghost sm" data-acao="auto|cbo">${ICON('reset')}<span>Sugestão</span></button>` : '' })}</div>`;
  }

  function secFaxina(M) {
    const T = M.textos, ta = M.textosAuto;
    const vtr = (q) => M.viaturas[q].map(([iso, v]) => `<label class="es-vt"><span>${UI.dm(iso)}</span>${campo(`vt|${q}|${iso}`, v, { lista: 'esVtr', ph: 'Viatura' })}</label>`).join('');
    return `<div class="es-duas">
      ${UI.panel('Item 1', `<label class="es-lbl">Título ${campo('tx|faxinaTitulo', T.faxinaTitulo, { auto: ta.faxinaTitulo })}</label>${area('tx|faxina', T.faxina, { auto: ta.faxina, linhas: 12 })}`)}
      ${UI.panel('Item 2', `<label class="es-lbl">Título ${campo('tx|limpezaTitulo', T.limpezaTitulo, { auto: ta.limpezaTitulo })}</label>${area('tx|limpeza', T.limpeza, { auto: ta.limpeza, linhas: 12 })}`)}
    </div>
    ${UI.panel('Viaturas para limpeza (domingos)', `<div class="es-duas"><div><h4 class="es-h4">Sede</h4>${vtr('sede')}</div><div><h4 class="es-h4">PEMAD/PBRESC</h4>${vtr('pemad')}</div></div>`, { note: 'A lista sugere as viaturas da planilha de viaturas; dá para digitar qualquer texto.' })}`;
  }

  function secFolha(M, info, editavel) {
    const T = M.textos, ta = M.textosAuto;
    const campos = editavel ? UI.panel('Cabeçalho e assinatura', `<div class="es-4">
      <label class="es-lbl">Título ${campo('tx|titulo', T.titulo, { auto: ta.titulo })}</label>
      <label class="es-lbl">Linha do comandante ${campo('tx|cmtCia', T.cmtCia, { auto: ta.cmtCia })}</label>
      <label class="es-lbl">Local ${campo('tx|local', T.local, { auto: ta.local })}</label>
      <label class="es-lbl">Data ${campo('tx|data', T.data, { tipo: 'date' })}</label>
      <label class="es-lbl">Assinatura ${campo('tx|assinatura', T.assinatura, { auto: ta.assinatura })}</label>
      <label class="es-lbl">Cargo ${campo('tx|cargo', T.cargo, { auto: ta.cargo })}</label></div>`) : '';
    return `${campos}<div class="es-previa-bar"><span class="muted">Prévia das 3 folhas (A4 paisagem).</span>
        <button type="button" class="btn sm" id="esCheia" title="Ver as folhas em tela cheia, sem gerar o PDF">${ICON('expand')}<span>Ver em tela cheia</span></button></div>
      <div class="es-previa" id="esPrevia" title="Clique para ver em tela cheia">${ESC.folha(M, info)}</div>`;
  }

  /* ---------- conferência ---------- */
  function secAvisos(M) {
    if (!M.avisos.length) return '<div class="es-avisos ok">✓ Conferência: nada a apontar.</div>';
    const ic = { bad: '✖', warn: '⚠', info: 'ℹ' };
    const ordem = { bad: 0, warn: 1, info: 2 };
    const lista = M.avisos.slice().sort((a, b) => ordem[a.tom] - ordem[b.tom]);
    return `<details class="es-avisos" ${est.avisosFechados ? '' : 'open'}><summary>Conferência: ${lista.length} ponto(s) para olhar</summary>
      <ul>${lista.map((a) => `<li class="t-${a.tom}"><span aria-hidden="true" class="${a.ic ? 'av-anc' : ''}">${a.ic === 'ancora' ? UI.ancora(a.tom) : ic[a.tom]}</span> ${esc(a.txt)}</li>`).join('')}</ul></details>`;
  }

  /* ---------- alterações no doc ---------- */
  const define = (obj, k, v, auto) => { if (auto !== undefined && v === auto) delete obj[k]; else obj[k] = v; };
  function aplica(doc, M, ed, v, auto) {
    const p = ed.split('|');
    const linhaPb = (id) => {
      doc.pbresc = doc.pbresc || {};
      if (!doc.pbresc.linhas) doc.pbresc.linhas = M.pbresc.linhas.map((l) => ({ id: l.id, k: l.k, eq: l.eq, nome: l.nome }));
      const l = doc.pbresc.linhas.find((x) => x.id === id);
      if (l && l.eq == null) Object.assign(l, ESC.equipeDe(l));   // linha antiga: letra no nome
      return l;
    };
    switch (p[0]) {
      case 'grade': define(doc.grade = doc.grade || {}, `${p[1]}|${p[2]}`, v.toUpperCase(), auto); break;
      case 'cor': { const o = doc.cor = doc.cor || {}; if (v) o[p[1]] = v; else delete o[p[1]]; break; }
      case 'comp': if (v) doc.compensacao = true; else delete doc.compensacao; break;
      case 'semcomp': { const o = doc.semComp = doc.semComp || {}; if (v) delete o[p[1]]; else o[p[1]] = true; break; }
      case 'afast': case 'func': case 'mot': define(doc[p[0]] = doc[p[0]] || {}, p[1], p[0] === 'afast' ? v : v.toUpperCase(), auto); break;
      case 'x': {
        const x = ((doc.extras || {})[p[1]] || []).find((y) => y.id === p[2]);
        if (x && p[3] === 'nome') {
          // nº BM digitado → nome do militar; nome e posto de um só militar da companhia → guarda o nº BM dele
          const r = ESC.milPorTexto(v), q = r ? null : ESC.postoDaLinha(v);
          x.nome = r ? r.nome : v;
          const m = r ? r.m : q.m;
          if (m) x.mk = DS.chaveMil(m); else delete x.mk;
        } else if (x) x[p[3]] = p[3] === 'pos' ? Math.max(1, parseInt(v, 10) || 1) : p[3] === 'func' || p[3] === 'mot' ? v.toUpperCase() : v;
        break;
      }
      case 'sao': case 'rpa': define(doc[p[0]] = doc[p[0]] || {}, p[1], v, auto); break;
      case 'obs': define(doc.obs = doc.obs || {}, p[1], v, auto); break;
      case 'tx': define(doc.textos = doc.textos || {}, p[1], v, auto); break;
      case 'pb': {
        const l = linhaPb(p[1]);
        if (!l) break;
        if (p[2] === 'eq') l.eq = (String(v).trim().match(/[A-Za-z]/) || [''])[0].toUpperCase();   // só a letra
        else { const x = ESC.equipeDe({ nome: v }); l.nome = x.nome; if (x.eq) l.eq = x.eq; }       // "A) Sgt Fulano" também preenche a equipe
        break;
      }
      case 'pbd': { const l = linhaPb(p[1]); if (l) define(l.dias = l.dias || {}, p[2], v.toUpperCase(), auto); break; }
      case 'pbp': (doc.pbresc = doc.pbresc || {}).prescricoes = v; break;
      case 'pbo': define(doc.pbresc = doc.pbresc || {}, 'obs', v, auto); break;
      case 'cb': {
        const t = ((doc.cobom = doc.cobom || {}).turnos = doc.cobom.turnos || {});
        const o = t[p[1]] = t[p[1]] || {};
        if (v.trim()) o[p[2]] = v.toUpperCase().trim(); else delete o[p[2]];
        break;
      }
      case 'leg': {
        doc.cobom = doc.cobom || {};
        if (!doc.cobom.legenda) doc.cobom.legenda = M.cobom.legenda.map((x) => ({ letra: x.letra, nome: x.nome, k: x.k || '' }));
        const x = doc.cobom.legenda[+p[1]];
        if (x && p[2] === 'nome') {
          // nº BM digitado → nome do militar; senão, um só militar do COBOM com esse nome → guarda o nº BM dele
          const r = ESC.milPorTexto(v), cand = r ? [r.m] : ESC.citados(v, DS.militares().filter((m) => /COBOM/i.test(m.obm)));
          x.nome = r ? r.nome : v;
          if (cand.length === 1) x.k = DS.chaveMil(cand[0]); else delete x.k;
        } else if (x) x[p[2]] = p[2] === 'letra' ? v.toUpperCase().trim() : v;
        break;
      }
      case 'cbo': define(doc.cobom = doc.cobom || {}, 'obs', v, auto); break;
      case 'vt': { const q = ((doc.viaturas = doc.viaturas || {})[p[1]] = doc.viaturas[p[1]] || {}); if (v.trim()) q[p[2]] = v; else delete q[p[2]]; break; }
    }
  }

  // repete os últimos "n" dias do mês anterior (grade do PBRESC ou do COBOM)
  function continuaCiclo(doc, M, tipo, n, Mant) {
    if (tipo === 'pb') {
      // PBRESC: ciclo 12/36 das equipes A e B (modelo.js → continuaPbresc)
      doc.pbresc = doc.pbresc || {};
      if (!doc.pbresc.linhas) doc.pbresc.linhas = M.pbresc.linhas.map((l) => ({ id: l.id, k: l.k, eq: l.eq, nome: l.nome }));
      const r = ESC.continuaPbresc(M, Mant);
      doc.pbresc.linhas.forEach((l) => { if (r.dias[l.id]) l.dias = r.dias[l.id]; });
      return { feitas: Object.keys(r.dias).length, sem: r.sem };
    }
    doc.cobom = doc.cobom || {};
    doc.cobom.turnos = {};
    let feitas = 0;
    Mant.cobom.turnos.forEach((t) => {
      const seq = t.cel.slice(-n);
      if (!seq.some(Boolean)) return;
      const o = doc.cobom.turnos[t.t] = {};
      M.dias.forEach((x, i) => { if (seq[i % seq.length]) o[x.n] = seq[i % seq.length]; });
      feitas++;
    });
    return feitas;
  }

  /* ---------- tela ---------- */
  PAGES['escala-mensal'] = {
    title: 'Escala mensal',
    render(view) {
      if (!est.mes) est.mes = ESC.mesPadrao();
      const mes = est.mes, ant = ESC.somaMes(mes, -1);
      const rer = () => PAGES['escala-mensal'].render(view);

      // com o Apps Script: busca as escalas gravadas deste mês e do anterior
      if (!DS.escalaPronta(mes) || !DS.escalaPronta(ant)) {
        view.innerHTML = `<div class="page">${UI.pageHead('Escala mensal – ' + ESC.nomeMes(mes), '')}${est.erro
          ? UI.panel('Não foi possível ler a escala gravada', `<p>${esc(est.erro)}</p><button type="button" class="btn" id="esDeNovo">Tentar de novo</button>`)
          : '<div class="empty">Carregando a escala gravada…</div>'}</div>`;
        const b = view.querySelector('#esDeNovo');
        if (b) { b.onclick = () => { est.erro = null; rer(); }; return; }
        DS.carregaEscalas([mes, ant]).then(() => { est.erro = null; if (location.hash.slice(1) === 'escala-mensal' && est.mes === mes) rer(); })
          .catch((e) => { est.erro = e.message || String(e); if (location.hash.slice(1) === 'escala-mensal') rer(); });
        return;
      }
      // meses vizinhos em segundo plano: trocar de mês (‹ ›) fica imediato
      setTimeout(() => DS.carregaEscalas([ESC.somaMes(mes, 1), ESC.somaMes(mes, -2), ESC.somaMes(mes, 2)]).catch(() => { /* busca ao abrir */ }), 300);

      const grav = DS.escalaGravada(mes), rasc = DS.escalaRascunho(mes);
      const editavel = DS.podeEditarEscala();
      const docAnt = DS.escalaRascunho(ant) || DS.escalaGravada(ant);
      const doc = ESC.clone(editavel ? rasc || grav || ESC.novoDoc(mes, docAnt) : grav || { mes });
      delete doc.anteriores;
      const M = ESC.montar(mes, doc);
      const versao = grav ? grav.versao : 0;
      // número que vai na folha: o escrito à mão (campo "Versão nº") ou o da gravação
      const nf = (d, n) => (d && d.textos && d.textos.versao) || dd(n);
      const proxima = rasc || !grav;
      // próxima versão: segue o número da folha da versão gravada (se escreveu 03, a próxima é 04)
      const prox = dd((parseInt(nf(grav, versao), 10) || 0) + 1);
      const info = { versao: proxima ? versao + 1 : versao, versaoTxt: proxima ? (doc.textos && doc.textos.versao) || prox : nf(grav, versao), rascunho: !!rasc };

      // meses no seletor: 6 para trás e 6 para frente, mais os que têm escala gravada
      const meses = new Set(Array.from({ length: 13 }, (_, i) => ESC.somaMes(ESC.mesDe(DS.hoje()), i - 6)));
      meses.add(mes);
      Object.keys((DS.escalasCompartilhadas() ? DS.escServidor : DS._escLocais()) || {}).forEach((m) => meses.add(m));
      const opcoes = [...meses].sort().map((m) => { const r = DS.escalaResumo(m); return `<option value="${m}" ${m === mes ? 'selected' : ''}>${ESC.nomeMes(m)}${r ? ' ✓ gravada' : ''}</option>`; }).join('');

      const ondeFica = DS.escalasCompartilhadas() ? 'A versão gravada vale para todos os usuários; as alterações ficam neste navegador até gravar.'
        : DS.fonte === 'sheets' ? 'Por enquanto, a escala gravada fica só neste navegador (publique o Code.gs 4.7 para valer para todos).'
          : 'Modo de teste: a escala gravada fica só neste navegador.';
      // outra pessoa gravou uma versão depois que este rascunho começou
      const outraGravou = rasc && grav && DS.baseEscala(rasc) !== grav.versao;
      const situacao = rasc
        ? `<b class="es-pend">Alterações não gravadas</b> <span class="muted">· ${grav ? `versão nº ${esc(nf(grav, versao))} gravada em ${esc(quando(grav.gravadoEm))}` : 'ainda sem versão gravada'}</span>${outraGravou ? `<span class="es-outra">${ICON('alert')} Outra pessoa gravou a versão nº ${esc(nf(grav, versao))} (${esc(quando(grav.gravadoEm))}) depois que você começou estas alterações. Ao gravar, as suas alterações serão juntadas às dela.</span>` : ''}`
        : grav ? `<b class="es-okt">✓ Versão nº ${esc(nf(grav, versao))} gravada</b> em ${esc(quando(grav.gravadoEm))}${grav.por ? ` <span class="muted">(${esc(grav.por)})</span>` : ''}`
          : '<b>Ainda não gravada</b> <span class="muted">· montada com o efetivo, férias e licenças de agora</span>';
      const botoes = editavel ? `${proxima ? `<label class="es-ver" title="Número que sai na folha (VERSÃO Nº). Em branco = ${prox}">Versão nº ${campo('tx|versao', info.versaoTxt, { auto: prox, cls: 'curto' })}</label>
          <button type="button" class="btn primary sm" id="esGravar" title="Guarda esta escala (as versões anteriores ficam guardadas)">${ICON('file')}<span>Gravar versão nº ${esc(info.versaoTxt)}</span></button>` : ''}
        ${rasc ? `<button type="button" class="btn ghost sm" id="esDescartar">${ICON('reset')}<span>Descartar alterações</span></button>` : ''}
        ${grav ? `<button type="button" class="btn ghost sm" id="esExcluir" title="Apaga a versão gravada; a escala volta para a versão anterior">${ICON('x')}<span>Excluir versão nº ${esc(nf(grav, versao))}</span></button>` : ''}
        ${doc.fixo ? '<button type="button" class="btn ghost sm" id="esAtualizar" title="Refaz os quadros e os afastamentos com o efetivo e as férias de agora (o que foi lançado à mão continua)">' + ICON('refresh') + '<span>Atualizar pelo efetivo e férias</span></button>' : ''}` : '';
      const barra = `<div class="es-barra ${rasc ? 'pend' : grav ? 'ok' : ''}"><span>${situacao}</span><span class="btn-row">${botoes}
        <button type="button" class="btn sm" id="esImprimir" ${!editavel && !grav ? 'disabled' : ''}>${ICON('printer')}<span>Imprimir / PDF</span></button></span></div>`;

      const nav = `<div class="es-nav"><button type="button" class="st-nav" id="esAnt" aria-label="Mês anterior" title="Mês anterior">${ICON('chevronL')}</button>
        <select class="select" id="esMes" aria-label="Mês da escala">${opcoes}</select>
        <button type="button" class="st-nav" id="esProx" aria-label="Próximo mês" title="Próximo mês">${ICON('chevron')}</button></div>`;

      let corpo;
      if (!editavel) {
        corpo = grav ? secFolha(M, info, false) : UI.vazio(`A escala de ${ESC.nomeMes(mes)} ainda não foi gravada pelo administrador.`);
      } else {
        const sec = { pel: () => secPel(M, doc), pemad: () => secPemad(M), obs: () => secObs(M), pbresc: () => secPbresc(M), cobom: () => secCobom(M), faxina: () => secFaxina(M), folha: () => secFolha(M, info, true) }[est.aba] || (() => secPel(M, doc));
        corpo = `${secAvisos(M)}
          <nav class="tabs es-abas" aria-label="Partes da escala">${ABAS.map(([id, t]) => `<button type="button" data-aba="${id}" aria-selected="${id === est.aba}">${t}</button>`).join('')}</nav>
          ${sec()}`;
      }
      const vtrs = DS.ligada('viaturas') ? [...new Set(DS.viaturas().filter((v) => v.situacao !== 'Baixada').map((v) => v.prefixo))].sort() : [];
      view.innerHTML = `<div class="page es">
        ${UI.pageHead('Escala mensal – ' + ESC.nomeMes(mes), editavel ? 'Escala operacional do mês montada com o efetivo, as férias e as licenças. Funções, SAO, observações, canil e COBOM ficam livres. ' + ondeFica : 'Escala operacional gravada pelo administrador.')}
        ${nav}${barra}${corpo}
        <datalist id="esFuncoes">${E().funcoes.map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
        <datalist id="esMot">${E().motoristas.map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
        <datalist id="esVtr">${vtrs.map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
      </div>`;

      /* prévia da folha: cabe na largura da tela */
      const prev = view.querySelector('#esPrevia');
      if (prev) {
        const ef = prev.querySelector('.ef');
        const ajusta = () => {
          ef.style.transform = ''; prev.style.height = '';
          ESC.encaixa(ef);
          const s = Math.min(1, prev.clientWidth / ef.offsetWidth);
          ef.style.transform = `scale(${s})`;
          prev.style.height = ef.offsetHeight * s + 'px';
        };
        ajusta();
        const img = ef.querySelector('img'); if (img && !img.complete) img.addEventListener('load', ajusta);
        // tela cheia: pelo botão ou clicando na prévia
        const cheia = () => ESC.telaCheia(M, info);
        view.querySelector('#esCheia').onclick = cheia;
        prev.onclick = cheia;
      }

      /* navegação entre meses */
      const vai = (m) => { est.mes = m; est.erro = null; ESC.planilha.zera(); rer(); };
      view.querySelector('#esAnt').onclick = () => vai(ESC.somaMes(mes, -1));
      view.querySelector('#esProx').onclick = () => vai(ESC.somaMes(mes, 1));
      view.querySelector('#esMes').onchange = (e) => vai(e.target.value);
      view.querySelector('#esImprimir').onclick = () => ESC.imprimir(M, info);
      view.querySelectorAll('[data-aba]').forEach((b) => (b.onclick = () => { est.aba = b.dataset.aba; rer(); }));
      const cd = view.querySelector('details.es-comp-d');
      if (cd) cd.addEventListener('toggle', () => {
        est.compAberto = cd.open;
        const dica = cd.querySelector('summary .muted'); if (dica) dica.textContent = `· clique para ${cd.open ? 'recolher' : 'ver e alterar'}`;
      });
      const av = view.querySelector('details.es-avisos');
      if (av) av.addEventListener('toggle', () => { est.avisosFechados = !av.open; });
      if (!editavel) return;

      /* gravar, descartar, atualizar */
      const bG = view.querySelector('#esGravar');
      if (bG) bG.onclick = async () => {
        const volta = UI.ocupado(bG, 'Gravando…');
        view.querySelectorAll('.es-barra button').forEach((b) => { b.disabled = true; });
        try {
          let d = doc, base = DS.baseEscala(doc), versaoTxt = info.versaoTxt, juntou = null;
          const digitado = doc.textos && doc.textos.versao;
          for (let tent = 0; ; tent++) {
            // grava o número que sai na folha junto (a próxima versão continua dele)
            const nova = ESC.paraGravar(d, d === doc ? M : ESC.montar(mes, d)); nova.textos.versao = versaoTxt;
            const r = await DS.gravarEscala(mes, nova, base);
            if (!r.conflito) { rer(); UI.toast(juntou ? `Escala gravada: versão nº ${nf(r, r.versao)}. Outra pessoa tinha gravado a versão nº ${nf(juntou, juntou.versao)} enquanto você editava: as alterações das duas foram juntadas.` : `Escala gravada: versão nº ${nf(r, r.versao)}`); return; }
            if (tent >= 4) throw new Error('outras pessoas estão gravando esta escala agora; tente de novo em instantes');
            // outra pessoa gravou depois que este rascunho começou: junta as alterações das duas e grava de novo
            const [atual, daBase] = await Promise.all([DS.buscaEscala(mes), base ? DS.buscaEscala(mes, base) : null]);
            if (!atual) { base = 0; continue; }          // a versão dela foi excluída: grava a minha
            const b0 = daBase || ESC.novoDoc(mes, docAnt);
            let j = ESC.junta(b0, d, atual);
            if (j.conflitos.length) {
              const qual = await UI.escolha('Outra pessoa também alterou esta escala', `<p>Enquanto você editava, outra pessoa gravou a <b>versão nº ${esc(nf(atual, atual.versao))}</b> (${esc(quando(atual.gravadoEm))}). O resto foi juntado; só ${j.conflitos.length === 1 ? 'este ponto ficou diferente' : `estes ${j.conflitos.length} pontos ficaram diferentes`}:</p>
                <ul class="emp-lista-sem">${j.conflitos.slice(0, 12).map(descreveConflito).join('')}${j.conflitos.length > 12 ? `<li class="muted">… e mais ${j.conflitos.length - 12}</li>` : ''}</ul>`,
              [['meu', 'Manter os meus', true], ['deles', 'Manter os da outra pessoa'], ['', 'Cancelar']]);
              if (!qual) { DS.salvaRascunhoEscala(mes, { ...j.doc, _base: atual.versao }); rer(); UI.toast('Não gravada. As alterações da outra pessoa já estão juntadas às suas no rascunho; confira e grave quando quiser.', 7000); return; }
              if (qual === 'deles') j = ESC.junta(b0, d, atual, 'deles');
            }
            d = { ...j.doc, _base: atual.versao };
            if (!d.textos) d.textos = {};
            // número da folha: o escrito à mão, se for maior que o da versão dela; senão o seguinte ao dela
            const dela = parseInt(nf(atual, atual.versao), 10) || 0;
            versaoTxt = digitado && (parseInt(digitado, 10) || 0) > dela ? digitado : dd(dela + 1);
            if (digitado) d.textos.versao = digitado;
            DS.salvaRascunhoEscala(mes, d);             // se a gravação falhar, o rascunho já está juntado
            base = atual.versao; juntou = atual;
          }
        } catch (e) { volta(); view.querySelectorAll('.es-barra button').forEach((b) => { b.disabled = false; }); UI.toast('Não foi possível gravar: ' + (e.message || e), 6000); }
      };
      const bD = view.querySelector('#esDescartar');
      if (bD) bD.onclick = () => {
        UI.sheet('Descartar alterações', `<div class="grid" style="gap:12px"><p>Apagar as alterações ainda não gravadas da escala de <b>${ESC.nomeMes(mes)}</b>?</p>
          <p class="muted" style="font-size:13.5px">${grav ? `A escala volta a ser a versão nº ${dd(versao)} gravada.` : 'A escala volta a ser a montada automaticamente.'}</p>
          <div class="btn-row"><button type="button" class="btn primary" id="dConf">Descartar</button><button type="button" class="btn ghost" data-close>Cancelar</button></div></div>`);
        document.getElementById('dConf').onclick = () => { DS.salvaRascunhoEscala(mes, null); UI.fechaSheet(); rer(); UI.toast('Alterações descartadas'); };
      };

      const bX = view.querySelector('#esExcluir');
      if (bX) bX.onclick = () => {
        UI.sheet('Excluir versão gravada', `<div class="grid" style="gap:12px"><p>Excluir a <b>versão nº ${esc(nf(grav, versao))}</b> da escala de <b>${ESC.nomeMes(mes)}</b>, gravada em ${esc(quando(grav.gravadoEm))}?</p>
          <p class="muted" style="font-size:13.5px">A escala volta para a versão gravada anterior; se não houver, fica sem versão gravada.${rasc ? ' As alterações ainda não gravadas deste navegador continuam.' : ''}</p>
          <div class="btn-row"><button type="button" class="btn primary" id="xConf">Excluir versão</button><button type="button" class="btn ghost" data-close>Cancelar</button></div>
          <p class="muted" id="xMsg" style="font-size:13px"></p></div>`);
        document.getElementById('xConf').onclick = async () => {
          const msg = document.getElementById('xMsg'), volta = UI.ocupado(document.getElementById('xConf'), 'Excluindo…');
          try { await DS.excluirVersaoEscala(mes); UI.fechaSheet(); rer(); UI.toast('Versão excluída'); }
          catch (e) {
            if (e.conflito) { UI.fechaSheet(); rer(); UI.toast(e.message, 9000); return; }
            volta(); msg.textContent = e.message || 'Não foi possível excluir.';
          }
        };
      };

      // grava o rascunho e redesenha mantendo o foco no campo seguinte e a rolagem
      const muda = (fn) => {
        // 1ª alteração depois de gravar: o número escrito à mão da versão gravada não passa para a próxima
        if (!rasc && grav && doc.textos) delete doc.textos.versao;
        // guarda de qual versão gravada este rascunho partiu (para juntar se outra pessoa gravar antes)
        if (!rasc) doc._base = versao;
        fn(doc);
        DS.salvaRascunhoEscala(mes, doc);
        const redesenha = () => {
          if (apertado) { setTimeout(redesenha, 40); return; }
          const a = document.activeElement, foco = a && a.dataset && (a.dataset.ed || a.dataset.foco), sel = a && a.dataset && a.dataset.ed && a.selectionStart;
          const rolagens = [...view.querySelectorAll('[data-scroll]')].map((s) => [s.dataset.scroll, s.scrollLeft]);
          const y = window.scrollY;
          rer();
          rolagens.forEach(([k, x]) => { const s = view.querySelector(`[data-scroll="${k}"]`); if (s) s.scrollLeft = x; });
          window.scrollTo(0, y);
          if (foco) {
            const n = view.querySelector(`[data-ed="${CSS.escape(foco)}"], [data-foco="${CSS.escape(foco)}"]`);
            if (n) { n.focus({ preventScroll: true }); try { if (sel != null) n.setSelectionRange(sel, sel); } catch (e) { /* campo sem seleção */ } }
          }
        };
        setTimeout(redesenha, 0);
      };
      const bA = view.querySelector('#esAtualizar');
      if (bA) bA.onclick = () => { muda((d) => { delete d.fixo; }); UI.toast('Quadros e afastamentos refeitos com o efetivo e as férias de agora'); };

      // eventos presos à página desta tela (que é recriada a cada desenho)
      const raiz = view.querySelector('.page.es');
      // grades do PBRESC e do COBOM como planilha: alterações em lote (colar, apagar várias…)
      ESC.planilha.ligar(raiz, (ops) => muda((d) => ops.forEach((o) => aplica(d, M, o.ed, o.v, o.auto === undefined ? undefined : o.auto))));
      raiz.addEventListener('change', (e) => {
        if (e.target.closest('.pl-ed')) return;   // editor da planilha grava sozinho
        const el = e.target.closest('[data-ed]');
        if (!el || el.tagName === 'TD') return;
        const auto = el.dataset.auto;
        const v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value.replace(/\r\n/g, '\n');
        muda((d) => aplica(d, M, el.dataset.ed, v, auto === undefined ? undefined : auto));
      });
      /* levar militar (ou linha avulsa) para outro pelotão/ala (4.85). arr = 'm|chave|quadro da planilha|quadro atual'
         ou 'x|id da linha avulsa|quadro|quadro'. Militar: doc.mover (voltar ao quadro da planilha = tira de lá). */
      const moverPara = (arr, dest, nome) => {
        const [tipo, id, base, atual] = arr.split('|');
        if (!dest || dest === atual) return;
        if (tipo === 'm') muda((d) => { d.mover = d.mover || {}; if (dest === base) delete d.mover[id]; else d.mover[id] = dest; if (!Object.keys(d.mover).length) delete d.mover; });
        else muda((d) => {
          const de = (d.extras || {})[atual] || [], x = de.find((y) => y.id === id); if (!x) return;
          d.extras[atual] = de.filter((y) => y !== x); (d.extras[dest] = d.extras[dest] || []).push(x);
        });
        UI.toast(`${nome ? nome.trim() + ' passou' : 'Passou'} para o ${dest}`);
      };
      let arrastando = null;
      const limpaAlvo = () => raiz.querySelectorAll('.es-alvo').forEach((x) => x.classList.remove('es-alvo'));
      raiz.addEventListener('dragstart', (e) => {
        const g = e.target.closest && e.target.closest('[data-arr]'); if (!g) return;
        arrastando = { arr: g.dataset.arr, nome: g.dataset.nome };
        e.dataTransfer.setData('text/plain', g.dataset.arr); e.dataTransfer.effectAllowed = 'move';
        const tr = g.closest('tr'); if (tr && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(tr, 12, 12);
        raiz.classList.add('es-arrastando');
        // barra com os 8 quadros (4.86): dá para soltar numa ala estando na aba dos pelotões, e vice-versa
        const atual = g.dataset.arr.split('|')[3];
        const dock = document.createElement('div');
        dock.className = 'es-dock';
        dock.innerHTML = `<span>Soltar em:</span>${[...ESC.PELS, ...ESC.ALAS].filter((o) => o !== atual).map((o) => `<b data-obm="${esc(o)}" class="${ESC.PELS.includes(o) ? 'd-pel' : 'd-ala'}">${esc(o.replace(' PEMAD', ''))}</b>`).join('')}`;
        raiz.appendChild(dock);
      });
      const fimArrasto = () => { arrastando = null; raiz.classList.remove('es-arrastando'); limpaAlvo(); raiz.querySelectorAll('.es-dock').forEach((x) => x.remove()); };
      raiz.addEventListener('dragend', fimArrasto);
      raiz.addEventListener('dragover', (e) => {
        const s = arrastando && e.target.closest('[data-obm]'); if (!s) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        if (!s.classList.contains('es-alvo')) { limpaAlvo(); s.classList.add('es-alvo'); }
      });
      raiz.addEventListener('drop', (e) => {
        const s = arrastando && e.target.closest('[data-obm]'); if (!s) return;
        e.preventDefault(); const a = arrastando; fimArrasto();
        moverPara(a.arr, s.dataset.obm, a.nome);
      });
      raiz.addEventListener('click', (e) => {
        const b = e.target.closest('[data-acao]');
        if (!b) return;
        const p = b.dataset.acao.split('|');
        switch (p[0]) {
          case 'auto': muda((d) => {
            if (p[1] === 'obs') { if (d.obs) delete d.obs[p[2]]; }
            else if (p[1] === 'pbo') { if (d.pbresc) delete d.pbresc.obs; }
            else if (p[1] === 'cbo') { if (d.cobom) delete d.cobom.obs; }
            else if (d[p[1]]) delete d[p[1]][p[2]];
          }); break;
          case 'limpa-grade': muda((d) => { delete d.grade; }); break;
          case 'rpapad': {
            const r = M.rpa[+p[1]], marcados = r.padrao.length ? r.padrao : r.doCurso;
            const lista = r.mils.map((m) => { const k = DS.chaveMil(m); return `<label class="es-pick"><input type="checkbox" value="${esc(k)}" ${marcados.includes(k) ? 'checked' : ''}><span><span class="muted">${esc(m.posto)}</span> ${esc(m.nomeGuerra)} <small class="muted">· ${esc(m.obm)}${r.doCurso.includes(k) ? ' · curso de RPA' : ''}</small></span></label>`; }).join('');
            UI.sheet(`Pilotos de RPA padrão – ${p[1]}º Pel / ${p[1]}ª Ala`, `<div class="grid" style="gap:12px"><p class="muted" style="font-size:13.5px">Marque os pilotos desta coluna. Eles entram sozinhos na escala deste mês e dos próximos. Sem ninguém marcado, entram os militares com curso de RPA.</p>
              <div class="es-picks">${lista}</div>
              <div class="btn-row"><button type="button" class="btn primary" id="rpOk">Salvar padrão</button><button type="button" class="btn ghost" data-close>Cancelar</button></div></div>`);
            document.getElementById('rpOk').onclick = () => {
              const ks = [...document.querySelectorAll('#sheet .es-picks input:checked')].map((x) => x.value);
              UI.fechaSheet();
              // marcar exatamente os do curso = sem padrão (continua acompanhando a planilha)
              const igualCurso = ks.length === r.doCurso.length && ks.every((k) => r.doCurso.includes(k));
              muda((d) => { d.rpaPadrao = d.rpaPadrao || {}; if (igualCurso) delete d.rpaPadrao[p[1]]; else d.rpaPadrao[p[1]] = ks; if (d.rpa) delete d.rpa[p[1]]; });
            };
            break;
          }
          case 'saopad': {
            const q = M.quadros[p[1]];
            const lista = q.linhas.filter((l) => l.tipo === 'mil').map((l) => `<label class="es-pick"><input type="checkbox" value="${esc(l.k)}" ${q.sao.padrao.includes(l.k) ? 'checked' : ''}><span><span class="muted">${esc(l.posto)}</span> ${esc(l.nome)}${l.afast ? ` <small class="muted">· ${esc(l.afast)}</small>` : ''}</span></label>`).join('');
            UI.sheet(`SAO padrão – ${q.titulo}`, `<div class="grid" style="gap:12px"><p class="muted" style="font-size:13.5px">Marque os militares que fazem o SAO deste pelotão. O nome deles entra sozinho na escala deste mês e dos próximos (dá para escrever outro texto num mês específico).</p>
              <div class="es-picks">${lista}</div>
              <div class="btn-row"><button type="button" class="btn primary" id="spOk">Salvar padrão</button><button type="button" class="btn ghost" data-close>Cancelar</button></div></div>`);
            document.getElementById('spOk').onclick = () => {
              const ks = [...document.querySelectorAll('#sheet .es-picks input:checked')].map((x) => x.value);
              UI.fechaSheet();
              muda((d) => { (d.saoPadrao = d.saoPadrao || {})[p[1]] = ks; if (d.sao) delete d.sao[p[1]]; });
            };
            break;
          }
          case 'arr': {
            // clique na alça: escolher o pelotão/ala de destino (no celular não dá para arrastar; e serve entre as abas)
            const arr = p.slice(1).join('|'), atual = p[4];
            const ops = [...ESC.PELS, ...ESC.ALAS].map((o) => `<button type="button" class="btn ${o === atual ? 'primary' : ''}" data-dest="${esc(o)}" ${o === atual ? 'disabled' : ''}>${esc(o)}</button>`).join('');
            UI.sheet(`Mover ${b.dataset.nome || ''}`, `<div class="grid" style="gap:12px"><p class="muted" style="font-size:13.5px;margin:0">Para qual pelotão ou ala? Vale só nesta escala (${esc(ESC.nomeMes(mes))}) e nas próximas que começarem a partir dela; a planilha de respostas não muda. Férias, licenças, função e motorista vão junto.</p>
              <div class="es-dest">${ops}</div><div class="btn-row"><button type="button" class="btn ghost" data-close>Cancelar</button></div></div>`);
            document.querySelectorAll('#sheet [data-dest]').forEach((x) => (x.onclick = () => { UI.fechaSheet(); moverPara(arr, x.dataset.dest, b.dataset.nome); }));
            break;
          }
          case 'arr-volta': muda((d) => { if (d.mover) { delete d.mover[p[1]]; if (!Object.keys(d.mover).length) delete d.mover; } }); UI.toast('Voltou para o quadro da planilha'); break;
          case 'ocultar': muda((d) => { (d.ocultos = d.ocultos || {})[p[1]] = true; }); break;
          case 'mostrar': muda((d) => { if (d.ocultos) delete d.ocultos[p[1]]; }); break;
          case 'addx': muda((d) => {
            const l = ((d.extras = d.extras || {})[p[1]] = d.extras[p[1]] || []);
            l.push({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pos: M.quadros[p[1]].linhas.length + 1, nome: '', func: '', mot: '-' });
          }); break;
          case 'delx': muda((d) => { if (d.extras && d.extras[p[1]]) d.extras[p[1]] = d.extras[p[1]].filter((x) => x.id !== p[2]); }); break;
          case 'pbadd': muda((d) => {
            d.pbresc = d.pbresc || {};
            if (!d.pbresc.linhas) d.pbresc.linhas = M.pbresc.linhas.map((l) => ({ id: l.id, k: l.k, eq: l.eq, nome: l.nome }));
            d.pbresc.linhas.push({ id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), k: '', nome: '' });
          }); break;
          case 'pbdel': muda((d) => {
            d.pbresc = d.pbresc || {};
            if (!d.pbresc.linhas) d.pbresc.linhas = M.pbresc.linhas.map((l) => ({ id: l.id, k: l.k, eq: l.eq, nome: l.nome }));
            d.pbresc.linhas = d.pbresc.linhas.filter((l) => l.id !== p[1]);
          }); break;
          case 'legadd': muda((d) => {
            d.cobom = d.cobom || {};
            if (!d.cobom.legenda) d.cobom.legenda = M.cobom.legenda.map((x) => ({ letra: x.letra, nome: x.nome, k: x.k || '' }));
            const usadas = new Set(d.cobom.legenda.map((x) => x.letra));
            let L = 65; while (usadas.has(String.fromCharCode(L)) && L < 90) L++;
            d.cobom.legenda.push({ letra: String.fromCharCode(L), nome: '' });
          }); break;
          case 'legdel': muda((d) => {
            d.cobom = d.cobom || {};
            if (!d.cobom.legenda) d.cobom.legenda = M.cobom.legenda.map((x) => ({ letra: x.letra, nome: x.nome, k: x.k || '' }));
            d.cobom.legenda.splice(+p[1], 1);
          }); break;
          case 'limpa': muda((d) => {
            if (p[1] === 'pb') { if (d.pbresc && d.pbresc.linhas) d.pbresc.linhas.forEach((l) => { delete l.dias; }); }
            else if (d.cobom) delete d.cobom.turnos;
          }); break;
          case 'ciclo': {
            if (p[1] === 'pb') {
              // PBRESC: sem mês anterior, segue a letra da equipe no nome ("A) …", "B) …")
              const Mant = docAnt ? ESC.montar(ant, docAnt) : null;
              let r = { feitas: 0, sem: [] };
              muda((d) => { r = continuaCiclo(d, M, 'pb', 0, Mant); });
              UI.toast(r.feitas ? `Escala 12/36 do PBRESC continuada${r.sem.length ? ` (sem ciclo: ${r.sem.join(', ')})` : ''}` : 'Não deu para descobrir o ciclo: lance o mês anterior ou comece o nome com a equipe ("A) …", "B) …")');
              break;
            }
            if (!docAnt) { UI.toast(`${ESC.nomeMes(ant)} não tem escala para continuar`); break; }
            const n = Math.max(1, Math.min(31, parseInt(view.querySelector(`#${p[1]}Ciclo`).value, 10) || 1));
            const Mant = ESC.montar(ant, docAnt);
            let feitas = 0;
            muda((d) => { feitas = continuaCiclo(d, M, p[1], n, Mant); });
            UI.toast(feitas ? `Grade continuada a partir de ${ESC.nomeMes(ant)} (ciclo de ${n} dias)` : `A grade de ${ESC.nomeMes(ant)} está vazia`);
            break;
          }
        }
      });
    },
  };
})();
