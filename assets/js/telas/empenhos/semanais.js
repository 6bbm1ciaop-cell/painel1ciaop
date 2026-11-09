/* ==========================================================================
   TELA › EMPENHOS SEMANAIS (#empenhos)
   Tabela semanal (segunda a domingo) no formato da planilha EMPENHOS GERAIS:
   pelotão e ala do dia pela escala, férias/licenças automáticas, status e
   observação por militar, reforços, observação do dia e contagens com limites.
   Expõe window.EMP (resumo do dia) para o Calendário amplo e a tela inicial.
   ========================================================================== */
(function () {
  const TABS = [['empenhos', 'Empenhos semanais'], ['empenhos-horas', 'Horas excedentes']];
  const tabs = (at) => UI.abas('Empenhos', TABS, at);
  /* ---------- EMPENHOS GERAIS — tabela semanal (segunda a domingo) ----------
     Pelotão e ala do dia saem da escala 24x72; férias e licenças entram sozinhas;
     status, observações, reforços e observação do dia são lançados aqui. */
  const E = () => APP_CONFIG.empenhos;
  // classe de cor do status (config.js → empenhos.status)
  const corDe = (st) => (E().status.find(([s]) => s === st) || [st, 'outro'])[1];
  // status operacional ("OP")?
  const ehOp = (st) => /\bop\b/i.test(st || '');
  const est = { seg: null, dia: null };
  // true enquanto monta a cópia pública: ignora os lançamentos ainda não gravados deste navegador
  let soGrav = false;
  // segunda-feira da semana da data
  const segundaDe = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  // ordem nos quadros (4.62): 1º o posto/graduação; no mesmo posto, a coluna POSIÇÃO NO PEL (depois almanaque e nome)
  const membros = (obm) => DS.militares().filter((m) => m.obm === obm).sort(DS.ordemAntiguidade);
  const ordena = (ls) => ls.sort((a, b) => DS.ordemAntiguidade(a.m, b.m));
  /* ---------- semana gravada ----------
     g.dias[aaaa-mm-dd] = { sede: [chaves], pemad: [...], refs: [...], lanc: { chave: [status, obs] }, obsDia }
     g.mil[chave] = [nome com posto, posto, OBM, credenciamento] daquele momento */
  // semBuscar: só o que já está carregado (as abas das semanas não puxam do Apps Script as semanas antigas)
  const gravDe = (d, semBuscar) => (semBuscar ? DS.gravacaoCarregada : DS.gravacao).call(DS, DS.iso(segundaDe(d)));

  /* ---------- consultas rápidas ----------
     A tela monta os 7 dias da semana e, para as abas, os 365 dias do ano: são dezenas de milhares
     de consultas "este militar está de férias neste dia?" a cada clique. Em vez de varrer as listas
     a cada consulta, monta um índice por dia (e um por nº BM) e reaproveita até os dados mudarem. */
  let base = null, porChave = null, porDia = new Map();
  function confereBase() {
    if (base === DS.db) return;
    base = DS.db; porChave = null; porDia = new Map();
  }
  // militar do cadastro atual pela chave (nº BM ou id)
  const doCadastro = (k) => {
    confereBase();
    if (!porChave) { porChave = new Map(); DS.todos().forEach((m) => { const c = DS.chaveMil(m); if (!porChave.has(c)) porChave.set(c, m); }); }
    return porChave.get(k) || null;
  };
  // férias, licenças e dispensas do dia, por militar (o 1º registro de cada militar, como antes)
  function doDia(d) {
    confereBase();
    const iso = DS.iso(d);
    if (!porDia.has(iso)) {
      const indexa = (lista) => { const mp = new Map(); lista.forEach((x) => { if (!mp.has(x.militar)) mp.set(x.militar, x); }); return mp; };
      porDia.set(iso, {
        fer: DS.ligada('ferias') ? indexa(DS.feriasEm(d)) : new Map(),
        lic: DS.ligada('licencas') ? indexa(DS.afastadosEm(d)) : new Map(),
        disp: DS.ligada('licencas') ? indexa(DS.dispensadosEm(d)) : new Map(),
      });
    }
    return porDia.get(iso);
  }

  // militar como estava na gravação (nome, posto, OBM e credenciamento da época), ligado ao cadastro atual quando existe
  function milGravado(k, g) {
    const x = g.mil[k]; if (!x) return null;
    const atual = doCadastro(k);
    const digitos = /^\d+$/.test(k);
    return { ...(atual || {}), id: atual ? atual.id : k, nBM: atual ? atual.nBM : digitos ? k : '', guerraCompleto: x[0], nomeGuerra: x[0], posto: x[1], obm: x[2], credenciado: x[3] || '-', externo: /^ext-/.test(k) };
  }
  // militar pela chave (cadastro atual ou, em semana gravada, como estava gravado)
  // reforço de fora da 1ª Cia (chave "ext-…"): nome, posto, unidade e credenciamento guardados no próprio lançamento
  function externo(k, iso) {
    if (!/^ext-/.test(k)) return null;
    const r = DS.reg(iso, 'reforco', k); if (!r) return null;
    let i = {}; try { i = JSON.parse(r.obs || '{}') || {}; } catch (e) { /* lançamento antigo */ }
    const nome = r.militar || i.nome || 'Reforço';
    return { id: k, nBM: '', externo: true, guerraCompleto: nome, nomeGuerra: i.nome || nome, posto: i.posto || '', obm: i.obm || 'De fora da 1ª Cia', credenciado: i.cred || '-' };
  }
  const milDe = (k, d) => { const g = gravDe(d, true); return (g && milGravado(k, g)) || doCadastro(k) || externo(k, DS.iso(d)); };

  // motorista pesado (credenciado em categoria D)?
  const motoristaD = (m) => m.credenciado && m.credenciado !== '-' && E().motoristaD.some((l) => m.credenciado.toUpperCase().includes(l));

  // status do militar no dia: lançado à mão, férias, licença, dispensa ou operacional
  function statusDe(m, d) {
    const iso = DS.iso(d), k = DS.chaveMil(m), gd = (gravDe(d, true) || { dias: {} }).dias[iso];
    // lançamento ainda não gravado (neste navegador) > lançamento da semana gravada
    const man = (!soGrav && DS.reg(iso, 'status', k)) || (gd && gd.lanc[k] ? { status: gd.lanc[k][0], obs: gd.lanc[k][1] } : null);
    let auto = 'Plantão Op', origem = '';
    const dia = doDia(d);
    const f = dia.fer.get(m.id);
    if (f) { auto = /tr[aâ]nsito/i.test(f.tipo) ? 'Trânsito' : 'Férias'; origem = `${f.tipo} de ${UI.dm(f.inicio)} a ${UI.dm(f.fim)}`; }
    else {
      const l = dia.lic.get(m.id);
      if (l) { auto = 'Licenciado'; origem = `${l.tipo} até ${UI.dm(l.fim)}`; }
    }
    // dispensa (restrição de atividades): o militar segue no serviço, com aviso
    const disp = dia.disp.get(m.id);
    if (disp && !origem) origem = `Dispensado até ${UI.dm(disp.fim)}${disp.itens && disp.itens.length ? ': ' + disp.itens.join('; ') : ''}`;
    return { status: (man && man.status) || auto, obs: (man && man.obs) || '', manual: !!(man && man.status), auto, origem, dispensa: !!disp };
  }

  // monta o dia: pelotão e ala de serviço, militares, reforços e contagens
  function montaDia(d, semBuscar) {
    const p = DS.pelotaoDoDia(d), iso = DS.iso(d);
    const pel = `${p}º Pel`, ala = `${p}ª Ala PEMAD`;
    const linha = (m, reforco) => ({ m, k: DS.chaveMil(m), reforco, ...statusDe(m, d) });
    // semana gravada: quem estava no pelotão/ala naquele dia; senão, o efetivo de hoje
    const g = gravDe(d, semBuscar), gd = g && g.dias[iso];
    const daGravacao = (ks) => ks.map((k) => milGravado(k, g)).filter(Boolean);
    // semana gravada também segue a ordem (posto, depois posição), mesmo que tenha sido gravada em outra ordem
    const sede = ordena((gd ? daGravacao(gd.sede) : membros(pel)).map((m) => linha(m, false)));
    const pemad = ordena((gd ? daGravacao(gd.pemad) : membros(ala)).map((m) => linha(m, false)));
    const ja = new Set(sede.concat(pemad).map((x) => x.k));
    // reforços: os gravados + os lançados depois, menos os retirados depois (status "removido")
    const locais = soGrav ? [] : DS.regDoDia(iso, 'reforco');
    const tirados = new Set(locais.filter((r) => r.status === 'removido').map((r) => r.bm));
    const chavesRef = [...new Set((gd ? gd.refs : []).concat(locais.filter((r) => r.status !== 'removido').map((r) => r.bm)))].filter((k) => !tirados.has(k) && !ja.has(k));
    const refs = ordena(chavesRef.map((k) => milDe(k, d)).filter(Boolean).map((m) => linha(m, true)));
    const conta = (ls, lista) => ls.filter((x) => lista.includes(x.status)).length;
    const sedeTodos = sede.concat(refs);
    const op = (ls) => ls.filter((x) => ehOp(x.status));
    const sgt = (ls) => op(ls).filter((x) => /Sgt|Sub/.test(x.m.posto)).length;
    const cbsd = (ls) => op(ls).filter((x) => /^(Cb|Sd)$/.test(x.m.posto)).length;
    const c = {
      sedeD: conta(sedeTodos, E().diurno), sedeN: conta(sedeTodos, E().noturno),
      pemD: conta(pemad, E().diurno), pemN: conta(pemad, E().noturno),
      pelSgt: sgt(sede), pelCb: cbsd(sede), alaSgt: sgt(pemad), alaCb: cbsd(pemad),
      mp: op(sedeTodos.concat(pemad)).filter((x) => motoristaD(x.m)).length,
    };
    c.totD = c.sedeD + c.pemD; c.totN = c.sedeN + c.pemN;
    const obsLocal = soGrav ? null : DS.reg(iso, 'obsdia', '');
    return { d, iso, p, pel, ala, sede, refs, pemad, c, gravado: !!gd, obsDia: obsLocal ? obsLocal.obs || '' : (gd && gd.obsDia) || '' };
  }

  /* resumo do dia, usado também pelo Calendário amplo (popup ao clicar no dia) */
  /* pilotos de embarcação disponíveis no dia: no pelotão da sede (com os reforços) e na ala do PEMAD.
     Disponível = status operacional (não está de férias, licença, dispensa, folga, curso…). */
  const vencTxt = (m) => (m.embarcacao && m.embarcacao.validade ? ` (venc. ${UI.data(m.embarcacao.validade)})` : '');
  // ícone no título do dia quando falta piloto de embarcação (vermelho) ou só há com habilitação vencida (laranja)
  // qual: 'Sede' (no título do pelotão) ou 'Ala' (no título da ala); popup com o alerta ao passar o mouse
  function iconePil(d, qual) {
    const y = pilotosDia(d).itens.find((z) => z.qual === qual);
    if (!y) return '';
    const dica = UI.dica(`Piloto de embarcação · ${UI.SEM[d.getDay()]} ${UI.dm(d)}`,
      [[qual === 'Sede' ? `${y.onde} (sede, com reforços)` : `${y.onde} PEMAD`, y.tom === 'bad' ? 'Nenhum piloto de embarcação disponível no dia.' : `Só piloto com habilitação vencida: ${y.nomes}.`]], y.tom);
    return `<span class="pil-dia ${y.tom}" tabindex="0" ${dica}>${UI.ancora(y.tom)}</span>`;
  }
  function pilotosDia(d) {
    const x = montaDia(d), disp = (ls) => ls.filter((y) => ehOp(y.status)).map((y) => y.m);
    const sede = DS.avaliaPilotos(disp(x.sede.concat(x.refs)), x.iso), pemad = DS.avaliaPilotos(disp(x.pemad), x.iso);
    const nomes = (r) => r.vencidos.map((m) => DS.guerra(m) + vencTxt(m)).join(', ');
    return { x, sede, pemad, itens: [
      sede.tom && { tom: sede.tom, onde: x.pel, nomes: nomes(sede), qual: 'Sede' },
      pemad.tom && { tom: pemad.tom, onde: x.ala.replace(' PEMAD', ''), nomes: nomes(pemad), qual: 'Ala' },
    ].filter(Boolean) };
  }

  window.EMP = {
    pilotosDia,
    // resumo do dia (usado pelo Calendário amplo e pela tela inicial)
    resumoDia(d) {
      const x = montaDia(d), cat = (st) => corDe(st);
      const grupo = (ls) => ({
        disp: ls.filter((y) => ehOp(y.status)).length,
        ferias: ls.filter((y) => cat(y.status) === 'ferias').length,
        lic: ls.filter((y) => cat(y.status) === 'lic').length,
        outros: ls.filter((y) => !ehOp(y.status) && !['ferias', 'lic'].includes(cat(y.status))).length,
        efetivo: ls.length,
      });
      const sede = grupo(x.sede.concat(x.refs)), pemad = grupo(x.pemad);
      const soma = (k) => sede[k] + pemad[k];
      const outrosLista = x.sede.concat(x.refs, x.pemad).filter((y) => !ehOp(y.status) && !['ferias', 'lic'].includes(cat(y.status))).map((y) => y.status);
      return { ...x, sede: sede, pemad: pemad, total: { disp: soma('disp'), ferias: soma('ferias'), lic: soma('lic'), outros: soma('outros'), efetivo: soma('efetivo') }, refs: x.refs.length, outrosLista,
        tom: tomTotal(soma('disp')), mp: x.c.mp, tomMP: tomMP(x.c.mp) };
    },
    irPara(d) { est.seg = DS.iso(segundaDe(d)); est.dia = DS.iso(d); location.hash = 'empenhos'; },
    /* cópia pública da semana gravada (página empenhos.html): só o que a tela mostra, sem dados pessoais —
       posto e nome de guerra, status (sem o tipo da licença nem os itens da dispensa), contagens e
       observação do dia. Só o que está gravado (nada dos lançamentos pendentes deste navegador). */
    publica(seg) {
      const g = DS.gravacaoCarregada(seg); if (!g) return null;
      const s0 = DS.parse(seg), obsMil = !!E().publicoObsMilitar;
      soGrav = true;
      try {
        const dias = Array.from({ length: 7 }, (_, i) => montaDia(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + i), true));
        const lin = (l) => { const r = [DS.guerra(l.m), l.status, corDe(l.status)]; if (l.m.externo) r[3] = 1; if (obsMil && l.obs) r[4] = l.obs; return r; };
        return { seg, versao: g.versao || 0, gravadoEm: g.gravadoEm || '', dias: dias.map((x) => ({
          iso: x.iso, p: x.p, sede: x.sede.map(lin), refs: x.refs.map(lin), pemad: x.pemad.map(lin), obsDia: x.obsDia || '',
          c: { ...x.c, tD: tomTotal(x.c.totD), tN: tomTotal(x.c.totN), tMP: tomMP(x.c.mp) },
        })) };
      } finally { soGrav = false; }
    },
  };

  // cor do total do dia pelos limites (config.js → empenhos.limites)
  const tomTotal = (n) => (n >= E().limites.verde ? 'ok' : n >= E().limites.amarelo ? 'warn' : 'bad');
  // cor dos motoristas pesados (config.js → empenhos.limitesMP)
  const tomMP = (n) => { const l = E().limitesMP || { verde: 4, amarelo: 3 }; return n >= l.verde ? 'ok' : n >= l.amarelo ? 'warn' : 'bad'; };
  // pior situação do dia (para marcar a aba do dia)
  const piorDia = (c) => {
    const t = [tomTotal(c.totD), tomTotal(c.totN), tomMP(c.mp)];
    return t.includes('bad') ? 'bad' : t.includes('warn') ? 'warn' : 'ok';
  };
  const DICA = { ok: '', warn: ' – atenção: no limite', bad: ' – abaixo do mínimo' };
  // linha de um militar
  const linhaHtml = (x, i, iso) => `<li><button type="button" class="emp-row" data-iso="${iso}" data-k="${UI.esc(x.k)}" ${x.reforco ? 'data-ref="1"' : ''} title="${UI.esc(x.origem ? 'Automático: ' + x.origem : x.manual ? 'Lançado manualmente' : 'Toque para mudar o status ou anotar')}">
      <span class="i">${i + 1}</span><span class="nm">${UI.esc(DS.guerra(x.m))}${x.m.externo ? ` <em class="disp-tag" title="${UI.esc(x.m.obm)}">fora</em>` : ''}${x.dispensa ? ' <em class="disp-tag">disp.</em>' : ''}${x.obs ? `<small>${UI.esc(x.obs)}</small>` : ''}</span>
      <span class="pill st-${corDe(x.status)} ${x.manual ? 'man' : ''} ${!x.manual && x.auto !== 'Plantão Op' ? 'auto' : ''}">${UI.esc(x.status)}</span></button></li>`;
  // contagem Diurno/Noturno
  const contHtml = (dd, nn, rot) => `<div class="emp-cont"><span class="rot">${rot}</span><span>Diurno <b class="num">${dd}</b></span><span>Noturno <b class="num">${nn}</b></span></div>`;

  // coluna de um dia
  function diaHtml(x, ativo) {
    const hoje = x.iso === DS.iso(DS.hoje());
    return `<section class="emp-dia pc${x.p} ${hoje ? 'hoje' : ''} ${ativo ? 'ativo' : ''}" data-dia="${x.iso}">
      <header class="emp-h"><span class="wd">${UI.SEM_L[x.d.getDay()]}, ${x.d.getDate()} de ${UI.MESES[x.d.getMonth()].toLowerCase()}${hoje ? ' <b>(hoje)</b>' : ''}</span><b class="pel-t">${x.p}º Pelotão – SEDE${iconePil(x.d, 'Sede')}</b></header>
      <div class="emp-sec">
        <ol class="emp-lista">${x.sede.map((l, i) => linhaHtml(l, i, x.iso)).join('') || '<li class="muted vazio">Sem militares no efetivo</li>'}</ol>
        ${x.refs.length ? `<div class="emp-sub">Reforço</div><ol class="emp-lista">${x.refs.map((l, i) => linhaHtml(l, i, x.iso)).join('')}</ol>` : ''}
        <button type="button" class="emp-add" data-add="${x.iso}">${ICON('users')}Adicionar reforço</button>
      </div>
      ${contHtml(x.c.sedeD, x.c.sedeN, 'Militares sede')}
      <div class="emp-bloco">${x.p}ª Ala – PEMAD${iconePil(x.d, 'Ala')}</div>
      <div class="emp-sec"><ol class="emp-lista">${x.pemad.map((l, i) => linhaHtml(l, i, x.iso)).join('') || '<li class="muted vazio">Sem militares no efetivo</li>'}</ol></div>
      ${contHtml(x.c.pemD, x.c.pemN, 'Militares PEMAD')}
      <div class="emp-total"><span class="rot">Total geral (sede + PEMAD)</span><span class="t-${tomTotal(x.c.totD)}" title="Total diurno${DICA[tomTotal(x.c.totD)]}">Diurno <b class="num">${x.c.totD}</b></span><span class="t-${tomTotal(x.c.totN)}" title="Total noturno${DICA[tomTotal(x.c.totN)]}">Noturno <b class="num">${x.c.totN}</b></span></div>
      <label class="emp-obs"><span>Observação do dia</span><textarea data-obs="${x.iso}" rows="3" placeholder="Ex.: Cb Luciano reforça a 4ª Ala no noturno">${UI.esc(x.obsDia)}</textarea></label>
      <dl class="emp-resumo">
        <dt>${x.p}º Pelotão</dt><dd>Sub/Sgt <b>${x.c.pelSgt}</b></dd><dd>Cb/Sd <b>${x.c.pelCb}</b></dd>
        <dt>${x.p}ª Ala</dt><dd>Sub/Sgt <b>${x.c.alaSgt}</b></dd><dd>Cb/Sd <b>${x.c.alaCb}</b></dd>
        <dt title="Sede + PEMAD">Mot. cat. D</dt><dd class="mp t-${tomMP(x.c.mp)}" title="Motoristas pesados${DICA[tomMP(x.c.mp)]}">MP <b>${x.c.mp}</b></dd>
      </dl>
    </section>`;
  }

  /* janela de edição de um militar no dia */
  function editar(view, iso, k, reforco) {
    const d = DS.parse(iso), m = milDe(k, d); if (!m) return;
    const s = statusDe(m, d), gravada = !!gravDe(d);
    // status que podem ter data de término (não vale para folgas nem para o plantão normal)
    // e os que têm data de retorno (Folga APA): lança nos serviços ANTES do dia da volta
    const ehRetorno = (st) => (E().comRetorno || []).includes(st);
    const temFim = (st) => ehRetorno(st) || (corDe(st) !== 'folga' && !ehOp(st));
    const rotuloFim = (st) => (ehRetorno(st) ? 'Retorno em (opcional)' : 'Termina em (opcional)');
    const ajudaFim = (st) => (ehRetorno(st) ? 'Lança o mesmo status nos serviços deste militar até a véspera do retorno.' : 'Lança o mesmo status nos próximos serviços deste militar até a data escolhida.');
    // último dia lançado: com retorno, a véspera da volta
    const ultimoDia = (st, data) => { if (!data || !ehRetorno(st)) return data; const x = DS.parse(data); x.setDate(x.getDate() - 1); return DS.iso(x); };
    const amanha = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    UI.sheet(`${UI.SEM[d.getDay()]} ${UI.dm(d)}`, `<div class="grid" style="gap:12px">
      <div><div class="mil-name" style="font-size:19px">${UI.esc(DS.guerra(m))}</div><div class="mil-sub">${UI.esc(m.obm)}${reforco ? ' / reforço neste dia' : ''}</div></div>
      ${s.origem ? `<p class="chip ${s.auto === 'Licenciado' ? 'bad' : 'ok'}" style="height:auto;padding:6px 10px;white-space:normal">Automático: ${UI.esc(s.auto)} (${UI.esc(s.origem)})</p>` : ''}
      <div class="field" style="max-width:none"><label for="eSt">Status</label><select class="select" id="eSt">${E().status.map(([t]) => `<option ${t === s.status ? 'selected' : ''}>${UI.esc(t)}</option>`).join('')}${E().status.some(([t]) => t === s.status) ? '' : `<option selected>${UI.esc(s.status)}</option>`}</select></div>
      <div class="field" style="max-width:none" id="eFimBox" ${temFim(s.status) ? '' : 'hidden'}><label for="eFim" id="eFimLbl">${rotuloFim(s.status)}</label>
        <input class="input" id="eFim" type="date" min="${DS.iso(amanha)}">
        <small class="muted" id="eFimTxt">${ajudaFim(s.status)}</small></div>
      <div class="field" style="max-width:none"><label for="eObs">Observação no nome</label><input class="input" id="eObs" maxlength="120" value="${UI.esc(s.obs)}" placeholder="Ex.: liberado às 20h; reforça a 4ª Ala"></div>
      <div class="btn-row"><button class="btn primary" id="eSalvar" type="button">Salvar</button>${s.manual || s.obs ? `<button class="btn" id="eAuto" type="button">${s.auto === 'Plantão Op' ? 'Limpar lançamento' : 'Voltar ao automático'}</button>` : ''}${reforco ? '<button class="btn ghost" id="eTirar" type="button">Tirar reforço</button>' : ''}</div>
      <p class="muted" id="eMsg" style="font-size:13px">${DS.regLocal() ? 'O lançamento fica neste navegador até você clicar em "Gravar semana".' : 'O lançamento é gravado na planilha (aba EMPENHOS_REGISTROS).'}</p>
    </div>`);
    const box = document.getElementById('sheet'), q = (s2) => box.querySelector(s2);
    const base = { data: iso, tipo: 'status', bm: k, militar: DS.guerra(m) };
    // em semana gravada não se apaga o lançamento: grava-se "vazio", que volta ao automático por cima da gravação
    const volta = (r) => (gravada ? { ...r, status: '', obs: '' } : { ...r, apagar: true });
    const feito = async (regs, msg) => {
      q('#eMsg').textContent = 'Salvando…';
      try {
        for (const r of [].concat(regs)) await DS.salvarReg(r);
        UI.fechaSheet(); PAGES.empenhos.render(view); UI.toast(msg);
      } catch (e) { q('#eMsg').textContent = e.message || 'Não foi possível salvar.'; q('#eMsg').style.color = 'var(--bad)'; }
    };
    // dias até a data de término em que o militar está na lista (pelotão, ala ou reforço)
    const diasAte = (fim) => {
      const out = [];
      for (let x = new Date(amanha); DS.iso(x) <= fim && out.length < 60; x.setDate(x.getDate() + 1)) {
        const y = montaDia(x);
        if (y.sede.concat(y.pemad, y.refs).some((l) => l.k === k)) out.push(DS.iso(x));
      }
      return out;
    };
    const atualizaFim = () => {
      const st = q('#eSt').value, data = q('#eFim').value, fim = ultimoDia(st, data);
      q('#eFimBox').hidden = !temFim(st);
      q('#eFimLbl').textContent = rotuloFim(st);
      q('#eFimTxt').textContent = data && temFim(st)
        ? (() => {
          const n = diasAte(fim).length, ate = ehRetorno(st) ? `antes do retorno em ${UI.data(data)}` : `até ${UI.data(fim)}`;
          return n ? `Também será lançado em ${n} serviço(s) dele ${ate}.` : `Ele não tem outro serviço ${ate}.`;
        })()
        : ajudaFim(st);
    };
    q('#eSt').onchange = atualizaFim;
    q('#eFim').onchange = atualizaFim;
    q('#eSalvar').onclick = () => {
      const st = q('#eSt').value, data = temFim(st) ? q('#eFim').value : '', fim = ultimoDia(st, data);
      let obs = q('#eObs').value.trim();
      if (data && !obs) obs = ehRetorno(st) ? `retorno ${UI.dm(data)}` : `até ${UI.dm(fim)}`;
      const r0 = st === s.auto && !obs ? volta(base) : { ...base, status: st === s.auto && obs ? '' : st, obs };
      if (!fim) { feito(r0, 'Lançamento salvo'); return; }
      const outros = diasAte(fim).map((dia) => ({ ...base, data: dia, status: st, obs }));
      feito([{ ...base, status: st, obs }].concat(outros), `Lançado em ${outros.length + 1} dia(s), ${ehRetorno(st) ? `retorno em ${UI.dm(data)}` : `até ${UI.dm(fim)}`}`);
    };
    if (q('#eAuto')) q('#eAuto').onclick = () => feito(volta(base), 'Voltou ao automático');
    if (q('#eTirar')) q('#eTirar').onclick = () => {
      const tira = gravada ? { data: iso, tipo: 'reforco', bm: k, militar: DS.guerra(m), status: 'removido' } : { data: iso, tipo: 'reforco', bm: k, militar: DS.guerra(m), apagar: true };
      feito([tira].concat(s.manual || s.obs ? [volta(base)] : []), 'Reforço retirado');
    };
  }

  // janela para incluir um reforço no dia
  function addReforco(view, iso) {
    const x = montaDia(DS.parse(iso));
    const ja = new Set(x.sede.concat(x.pemad, x.refs).map((l) => l.k));
    const cand = DS.ordenar(DS.militares().filter((m) => !ja.has(DS.chaveMil(m))));
    const nrm = UI.norm;
    UI.sheet(`Reforço em ${UI.dm(x.d)}`, `<div class="grid" style="gap:10px">
      <input class="input" id="rBusca" type="search" placeholder="Procurar militar" autocomplete="off">
      <div class="ref-lista">${cand.map((m) => `<button type="button" data-k="${UI.esc(DS.chaveMil(m))}" data-t="${UI.esc(nrm(DS.guerra(m) + ' ' + m.nome + ' ' + m.obm))}"><b>${UI.esc(DS.guerra(m))}</b><small>${UI.esc(m.obm)}</small></button>`).join('')}</div>
      <details class="ref-fora"><summary>Militar de fora da 1ª Cia Op</summary>
        <div class="ref-fora-c">
          <div class="field"><label for="rPosto">Posto/graduação</label><select class="select" id="rPosto"><option value="">—</option>${['Cap', '1º Ten', '2º Ten', 'Asp', 'Sub Ten', '1º Sgt', '2º Sgt', '3º Sgt', 'Cb', 'Sd'].map((p) => `<option>${p}</option>`).join('')}</select></div>
          <div class="field grow"><label for="rNome">Nome de guerra</label><input class="input" id="rNome" autocomplete="off" placeholder="Ex.: Fulano"></div>
          <div class="field grow"><label for="rObm">Unidade</label><input class="input" id="rObm" autocomplete="off" placeholder="Opcional (ex.: 2ª Cia / 6º BBM)"></div>
          <div class="field"><label for="rCred">Credenciamento</label><input class="input" id="rCred" autocomplete="off" placeholder="Opcional (ex.: B, D, AD)"></div>
          <button type="button" class="btn primary" id="rFora">Adicionar reforço</button>
        </div></details>
      <p class="muted" id="rMsg" style="font-size:13px">O reforço entra na lista da sede neste dia e conta no total (motorista pesado se o credenciamento tiver D ou E).</p></div>`);
    const box = document.getElementById('sheet');
    box.querySelector('#rBusca').oninput = (e) => {
      const t = nrm(e.target.value);
      box.querySelectorAll('.ref-lista button').forEach((b) => { b.hidden = !!t && !b.dataset.t.includes(t); });
    };
    box.querySelectorAll('.ref-lista button').forEach((b) => (b.onclick = async () => {
      const m = DS.todos().find((y) => DS.chaveMil(y) === b.dataset.k);
      try {
        await DS.salvarReg({ data: iso, tipo: 'reforco', bm: b.dataset.k, militar: DS.guerra(m), status: '' });
        UI.fechaSheet();
        PAGES.empenhos.render(view);
        UI.toast('Reforço adicionado');
      }
      catch (e) { box.querySelector('#rMsg').textContent = e.message; }
    }));
    box.querySelector('#rFora').onclick = async () => {
      const posto = box.querySelector('#rPosto').value, nome = box.querySelector('#rNome').value.trim();
      const obm = box.querySelector('#rObm').value.trim(), cred = box.querySelector('#rCred').value.trim().toUpperCase();
      if (!nome) { box.querySelector('#rMsg').textContent = 'Escreva o nome de guerra do militar.'; box.querySelector('#rNome').focus(); return; }
      try {
        await DS.salvarReg({ data: iso, tipo: 'reforco', bm: 'ext-' + Date.now().toString(36), militar: `${posto} ${nome}`.trim(), status: '', obs: JSON.stringify({ posto, nome, obm, cred }) });
        UI.fechaSheet();
        PAGES.empenhos.render(view);
        UI.toast('Reforço adicionado');
      }
      catch (e) { box.querySelector('#rMsg').textContent = e.message; }
    };
    // no celular não abre o teclado sozinho (ele cobriria a lista)
    if (!matchMedia('(pointer: coarse)').matches) box.querySelector('#rBusca').focus();
  }

  /* link da página pública (só o administrador vê): copiar, abrir, e como invalidar */
  function linkPublico() {
    const url = DS.linkPublicoUrl();
    UI.sheet('Link público dos empenhos', `<div class="grid" style="gap:12px">
      <p style="margin:0">Página sem login, só com as <b>semanas gravadas da semana atual em diante</b>: posto e nome de guerra, status do dia, contagens e observação do dia. Não mostra telefone, endereço, tipo de licença nem itens de dispensa.</p>
      <input class="input" id="lpUrl" readonly value="${UI.esc(url)}" style="font-size:13px">
      <div class="btn-row"><button class="btn primary" id="lpCopia" type="button">${ICON('copy')}Copiar link</button><a class="btn" href="${UI.esc(url)}" target="_blank" rel="noopener">${ICON('link')}Abrir</a></div>
      <p class="muted" style="font-size:13px;margin:0">Quem tiver o link vê a página. Se ele sair da Cia, troque o código em CONFIG.PUBLICO no Apps Script e implante uma nova versão: o link antigo para de funcionar e este passa a mostrar o novo.</p>
      <p class="muted" style="font-size:13px;margin:0">A página é atualizada sozinha quando uma semana é gravada e quando alguém abre o painel (por exemplo, férias lançadas depois da gravação).</p></div>`);
    const box = document.getElementById('sheet');
    box.querySelector('#lpUrl').onclick = (e) => e.target.select();
    box.querySelector('#lpCopia').onclick = async () => {
      try { await navigator.clipboard.writeText(url); UI.toast('Link copiado'); }
      catch (e) { box.querySelector('#lpUrl').select(); UI.toast('Selecione e copie o link (Ctrl+C)'); }
    };
  }

  /* "Gravar semana": guarda quem estava em cada pelotão/ala/reforço em cada dia e os lançamentos
     (sobrescreve a gravação anterior da semana) e tira os lançamentos pendentes deste navegador.
     Se outra pessoa gravou a mesma semana enquanto isso, nada se perde: a tela passa a usar a gravação
     dela e os lançamentos deste navegador entram por cima (se os dois mexeram no mesmo militar no
     mesmo dia, pergunta qual fica). Devolve a gravação da outra pessoa que foi juntada, ou null. */
  function montaGravacao(dias) {
    const mil = {}, out = {};
    dias.map(montaDia).forEach((x) => {
      const lanc = {};
      const guarda = (l) => {
        const cred = l.m.credenciado && l.m.credenciado !== '-' ? l.m.credenciado : '';
        mil[l.k] = [DS.guerra(l.m), l.m.posto || '', l.m.obm || '', cred];
        // só o que foi lançado à mão; férias, licenças e dispensas continuam automáticas
        if (l.manual || l.obs) lanc[l.k] = [l.manual ? l.status : '', l.obs || ''];
        return l.k;
      };
      out[x.iso] = { sede: x.sede.map(guarda), pemad: x.pemad.map(guarda), refs: x.refs.map(guarda), lanc, obsDia: x.obsDia || '' };
    });
    return { dias: out, mil };
  }
  const hm = (g) => (g && g.gravadoEm ? g.gravadoEm.slice(11, 16) : '');
  const nomeDe = (k, d) => { const m = milDe(k, d); return m ? DS.guerra(m) : k; };
  const txtLanc = (x) => [x[0], x[1]].filter(Boolean).join(' – ') || '(automático)';
  /** pergunta qual lançamento fica quando as duas pessoas mexeram no mesmo militar/dia */
  async function perguntaConflitos(conf, atual) {
    const linhas = conf.slice(0, 12).map((c) => {
      const d = DS.parse(c.dia), quem = c.r.tipo === 'obsdia' ? 'Observação do dia' : UI.esc(nomeDe(c.r.bm, d));
      return `<li><b>${UI.dm(d)}</b> · ${quem}: seu <b>${UI.esc(txtLanc(c.meu))}</b> × da outra pessoa <b>${UI.esc(txtLanc(c.deles))}</b></li>`;
    }).join('');
    return UI.escolha('Outra pessoa também alterou esta semana', `<p>Enquanto você lançava, outra pessoa gravou esta semana${hm(atual) ? ` às <b>${hm(atual)}</b>` : ''}. O resto foi juntado; só ${conf.length === 1 ? 'este lançamento ficou diferente' : `estes ${conf.length} lançamentos ficaram diferentes`}:</p>
      <ul class="emp-lista-sem">${linhas}${conf.length > 12 ? `<li class="muted">… e mais ${conf.length - 12}</li>` : ''}</ul>`,
    [['meu', 'Manter os meus', true], ['deles', 'Manter os da outra pessoa'], ['', 'Cancelar']]);
  }
  async function gravarSemana(seg) {
    const dias = Array.from({ length: 7 }, (_, i) => new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i));
    const s = DS.iso(seg), isos = dias.map(DS.iso);
    await DS.carregaSemanas([s]);   // semana antiga: traz a gravação antes de montar (senão viraria o efetivo de hoje)
    let juntou = null;
    for (let tent = 0; ; tent++) {
      const antes = DS.gravacao(s);
      const r = await DS.gravarSemana(s, { seg: s, ...montaGravacao(dias) }, antes ? antes.versao || 0 : 0);
      if (!r.conflito) break;
      if (tent >= 4) throw new Error('outras pessoas estão gravando esta semana agora; tente de novo em instantes');
      // outra pessoa gravou: passa a usar a gravação dela e grava de novo com os lançamentos daqui por cima
      const conf = DS.conflitosSemana(antes, r.atual, isos);
      DS.trocaGravacao(s, r.atual);
      juntou = r.atual || juntou;
      if (conf.length) {
        const qual = await perguntaConflitos(conf, r.atual);
        if (!qual) throw Object.assign(new Error('gravação cancelada; a semana mostra agora o que a outra pessoa gravou, com os seus lançamentos ainda não gravados'), { cancelado: true });
        if (qual === 'deles') conf.forEach((c) => DS.descartaPendente(c.r));
      }
    }
    DS.limpaRegsLocais(isos);
    return juntou;
  }

  /* "Gravar semanas alteradas": com o Code.gs 4.8, todas vão num pedido só (bem mais rápido);
     as que outra pessoa gravou nesse meio-tempo são juntadas uma a uma, como no "Gravar semana". */
  const diasDaSemana = (v) => { const s0 = DS.parse(v); return Array.from({ length: 7 }, (_, i) => new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + i)); };
  async function gravarVarias(segs, progresso) {
    let feitas = 0, juntadas = 0;
    let resto = segs;
    if (DS.semanasCompartilhadas() && DS.gravLote && segs.length > 1) {
      progresso(`Gravando ${segs.length} semanas…`);
      await DS.carregaSemanas(segs);
      const itens = segs.map((v) => ({ seg: v, semana: { seg: v, ...montaGravacao(diasDaSemana(v)) }, base: DS.versaoSemana(v) }));
      const res = await DS.gravarSemanasLote(itens);
      resto = [];
      res.forEach((r) => { if (r.conflito) resto.push(r.seg); else { DS.limpaRegsLocais(diasDaSemana(r.seg).map(DS.iso)); feitas++; } });
    }
    for (const v of resto) {
      progresso(segs.length > 1 && resto !== segs ? `Outra pessoa gravou a semana de ${UI.dm(DS.parse(v))} enquanto isso: juntando…` : `Gravando a semana de ${UI.dm(DS.parse(v))}… (${feitas + 1} de ${segs.length})`);
      if (await gravarSemana(DS.parse(v))) juntadas++;
      feitas++;
    }
    return { feitas, juntadas };
  }

  /* "Limpar lançamentos": apaga status, observações, reforços e observação do dia lançados na semana
     e desfaz a gravação (a semana volta ao automático, montada com o efetivo atual, sem ✓).
     Férias, licenças e dispensas (automáticos) continuam.
     Se outra pessoa gravou a semana depois do que esta tela mostra, não apaga nada (avisa e mostra a gravação nova). */
  async function limparSemana(seg) {
    const isos = Array.from({ length: 7 }, (_, i) => DS.iso(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i)));
    // 1º desfaz a gravação: se o Apps Script ainda não souber fazer isso, nada é apagado
    if (DS.semanaGravada(DS.iso(seg))) {
      const r = await DS.apagarSemana(DS.iso(seg));
      if (r && r.conflito) throw Object.assign(new Error(`Outra pessoa gravou esta semana${hm(r.atual) ? ` às ${hm(r.atual)}` : ''} depois que você abriu a tela. Nada foi apagado: a tela foi atualizada com a gravação dela. Confira e, se ainda quiser, clique em "Limpar lançamentos" de novo.`), { conflito: true });
    }
    if (!DS.regLocal()) {
      // lançamentos gravados na planilha (FONTES.registros): apaga um a um
      for (const iso of isos) for (const t of ['status', 'reforco', 'obsdia']) for (const r of DS.regDoDia(iso, t)) await DS.salvarReg({ ...r, apagar: true });
    }
    DS.limpaRegsLocais(isos);
  }

  /* Lançamentos de um dia: os ainda não gravados (deste navegador) e os da semana gravada. */
  function lancDoDia(iso) {
    const gd = (gravDe(DS.parse(iso), true) || { dias: {} }).dias[iso];
    const pend = DS.regsPendentes ? DS.regsPendentes([iso]).length : 0;
    const grav = gd ? Object.keys(gd.lanc || {}).length + (gd.refs || []).length + (gd.obsDia ? 1 : 0) : 0;
    return { gd, total: pend + grav };
  }
  /* "Limpar lançamentos" só de um dia: apaga os lançamentos ainda não gravados do dia e, se a semana
     estiver gravada, deixa marcado (para a próxima gravação) que o dia volta ao automático: status à mão
     voltam ao automático, reforços saem e a observação do dia fica vazia. A gravação da semana não é
     desfeita: as mudanças valem para todos depois de "Gravar semana" (gravar continua sendo da semana). */
  async function limparDia(iso) {
    const d = DS.parse(iso), { gd } = lancDoDia(iso);
    if (!DS.regLocal()) for (const t of ['status', 'reforco', 'obsdia']) for (const r of DS.regDoDia(iso, t)) await DS.salvarReg({ ...r, apagar: true });
    DS.limpaRegsLocais([iso]);
    if (!gd) return false;
    const g = gravDe(d, true);
    for (const k of Object.keys(gd.lanc || {})) { const m = milDe(k, d); await DS.salvarReg({ data: iso, tipo: 'status', bm: k, militar: m ? DS.guerra(m) : k, status: '', obs: '' }); }
    for (const k of gd.refs || []) { const m = milGravado(k, g) || milDe(k, d); await DS.salvarReg({ data: iso, tipo: 'reforco', bm: k, militar: m ? DS.guerra(m) : k, status: 'removido' }); }
    if (gd.obsDia) await DS.salvarReg({ data: iso, tipo: 'obsdia', bm: '', obs: '' });
    return Object.keys(gd.lanc || {}).length + (gd.refs || []).length + (gd.obsDia ? 1 : 0) > 0;
  }

  PAGES.empenhos = {
    title: 'Empenhos semanais',
    render(view) {
      const hoje = DS.hoje();
      if (!est.seg) est.seg = DS.iso(segundaDe(hoje));
      // semana antiga gravada: busca a gravação antes de desenhar (as recentes já vieram na abertura)
      if (DS.faltaSemana(est.seg)) {
        const alvo = est.seg;
        view.innerHTML = `<div class="page">${UI.pageHead('Empenhos gerais', 'Carregando a semana gravada…')}</div>`;
        DS.carregaSemanas([alvo]).then(() => { if (location.hash === '#empenhos' && est.seg === alvo) PAGES.empenhos.render(view); });
        return;
      }
      const seg = DS.parse(est.seg);
      const dias = Array.from({ length: 7 }, (_, i) => new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i));
      const dom = dias[6];
      if (!est.dia || !dias.some((d) => DS.iso(d) === est.dia)) est.dia = DS.iso(dias.find((d) => +d === +hoje) || seg);
      const blocos = dias.map(montaDia);
      // semanas do ano (segunda a domingo)
      const ano = seg.getFullYear(), semanas = [];
      const fimAno = new Date(ano, 11, 31);
      for (let s = segundaDe(new Date(ano, 0, 1)); s <= fimAno; s = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)) {
        const f = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
        semanas.push([DS.iso(s), `${UI.dm(s)}${s.getFullYear() !== ano ? '/' + s.getFullYear() : ''} a ${UI.dm(f)}${f.getFullYear() !== ano ? '/' + f.getFullYear() : ''}`]);
      }
      // abas das semanas, como as abas de uma planilha Google (com a pior situação da semana marcada)
      const segHoje = DS.iso(segundaDe(hoje));
      const MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      let mesAnt = -1;
      const pendTabs = new Set(DS.semanasPendentes());
      const abas = semanas.map(([v]) => {
        const s0 = DS.parse(v), s6 = new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + 6);
        const tons = Array.from({ length: 7 }, (_, i) => piorDia(montaDia(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + i), true).c));
        const al = tons.includes('bad') ? 'bad' : tons.includes('warn') ? 'warn' : 'ok';
        const m = s6.getFullYear() === ano ? s6.getMonth() : 11, sep = m !== mesAnt ? `<span class="st-sep">${MES3[m]}</span>` : ''; mesAnt = m;
        const gv = DS.semanaGravada(v);
        return `${sep}<button type="button" class="st-tab al-${al} ${v === est.seg ? 'on' : ''} ${v === segHoje ? 'atual' : ''} ${gv ? 'grav' : ''} ${pendTabs.has(v) ? 'pend' : ''}" data-seg="${v}" aria-pressed="${v === est.seg}" title="Semana de ${UI.data(s0)} a ${UI.data(s6)}${gv ? ' – gravada' : ''}${pendTabs.has(v) ? ' – lançamentos não gravados' : ''}${al === 'bad' ? ' – algum dia abaixo do mínimo' : al === 'warn' ? ' – algum dia no limite' : ''}">${gv ? '<span class="st-gv" aria-hidden="true">✓</span>' : ''}${String(s0.getDate()).padStart(2, '0')}/${String(s0.getMonth() + 1).padStart(2, '0')} – ${String(s6.getDate()).padStart(2, '0')}/${String(s6.getMonth() + 1).padStart(2, '0')}</button>`;
      }).join('');
      const semFer = !DS.ligada('ferias');
      // situação da gravação desta semana
      const grav = DS.gravacao(est.seg), pend = DS.regsPendentes(dias.map(DS.iso)).length;
      const podeGravar = DS.podeGravarSemana();
      // semanas com lançamentos não gravados (um lançamento com "Termina em" pode alcançar várias)
      const pendSemanas = DS.semanasPendentes();
      const outrasPend = pendSemanas.filter((v) => v !== est.seg);
      const fmtSem = (v) => { const a = DS.parse(v), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); return `${UI.dm(a)} a ${UI.dm(b)}`; };
      const quando = grav && grav.gravadoEm ? `${grav.gravadoEm.slice(8, 10)}/${grav.gravadoEm.slice(5, 7)}/${grav.gravadoEm.slice(0, 4)}${grav.gravadoEm.slice(10)}` : '';
      const barraGrav = `<div class="emp-grav ${grav ? 'ok' : ''} ${pend ? 'pend' : ''}">
          <span class="emp-grav-t">${grav ? `<b>✓ Semana gravada</b> em ${UI.esc(quando)}${grav.por ? ` <span class="muted">(${UI.esc(grav.por)})</span>` : ''}` : '<b>Semana não gravada</b> <span class="muted">· montada com o efetivo atual de cada pelotão</span>'}${pend ? ` · <b class="emp-pend">${pend} lançamento(s) não gravado(s)</b>` : ''}${outrasPend.length ? ` · <span class="emp-pend">${outrasPend.length} outra(s) semana(s) com lançamentos não gravados</span>` : ''}</span>
          ${podeGravar ? `<span class="btn-row"><button type="button" class="btn ${pend || !grav ? 'primary' : ''} sm" id="sGravar" title="Guarda quem estava em cada pelotão e os lançamentos desta semana (substitui a gravação anterior)">${ICON('file')}<span>Gravar semana</span></button>
            ${outrasPend.length ? `<button type="button" class="btn primary sm" id="sGravarTodas" title="Grava todas as semanas que têm lançamentos ainda não gravados: ${pendSemanas.map(fmtSem).join('; ')}">${ICON('file')}<span>Gravar semanas alteradas (${pendSemanas.length})</span></button>` : ''}
            <button type="button" class="btn ghost sm" id="sLimpar" title="Apaga os lançamentos de um dia ou da semana inteira; férias, licenças e dispensas continuam">${ICON('reset')}<span>Limpar lançamentos</span></button></span>` : ''}
        </div>`;

      // piloto de embarcação: dias da semana sem nenhum (vermelho) ou só com habilitação vencida (laranja)
      const pilSem = dias.flatMap((d) => pilotosDia(d).itens.map((y) => ({ ...y, onde: `${UI.SEM[d.getDay()]} ${UI.pad(d.getDate())} (${y.onde})` })));
      const alertaPil = UI.alertaPilotos(pilSem, `semana de ${UI.dm(seg)} a ${UI.dm(dom)}`);

      view.innerHTML = `<div class="page ${podeGravar ? '' : 'emp-leitura'}">
        ${UI.pageHead(`Empenhos gerais ${UI.data(seg)} a ${UI.data(dom)}`, podeGravar ? 'Pelotão e ala de serviço em cada dia, com férias e licenças lançadas automaticamente. Toque em um militar para mudar o status ou anotar uma observação.' : `Pelotão e ala de serviço em cada dia, com férias e licenças lançadas automaticamente. Somente consulta: o seu perfil (${UI.esc(DS.nomePerfil || 'consulta')}) não altera os empenhos.`, alertaPil + (DS.linkPublicoUrl && DS.linkPublicoUrl() ? `<button class="btn" id="sLinkPub" type="button" title="Página sem login, só com as semanas gravadas, para mandar à Cia">${ICON('link')}<span>Link público</span></button>` : ''))}
        ${tabs('empenhos')}
        <div class="sheet-tabs" role="toolbar" aria-label="Semanas de ${ano}">
          <label class="st-menu" title="Todas as semanas">${ICON('menu')}<select id="sSel" aria-label="Todas as semanas">${semanas.map(([v, t]) => `<option value="${v}" ${v === est.seg ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <button class="st-nav" id="sPrev" type="button" aria-label="Semana anterior" title="Semana anterior">${ICON('chevronL')}</button>
          <div class="st-scroll" id="stScroll"><span class="st-ano">${ano}</span>${abas}</div>
          <button class="st-nav" id="sNext" type="button" aria-label="Próxima semana" title="Próxima semana">${ICON('chevron')}</button>
          <button class="st-hoje" id="sHoje" type="button" title="Ir para a semana atual"><span class="st-hl">Esta semana</span><span class="st-hs">Hoje</span></button>
        </div>
        ${barraGrav}
        <p class="emp-aviso">${DS.regLocal()
          ? (DS.semanasCompartilhadas() ? 'Os lançamentos ficam neste navegador até você clicar em "Gravar semana"; a semana gravada vale para todos os usuários e não muda se um militar trocar de pelotão depois.'
            : DS.fonte === 'sheets' ? 'Por enquanto, lançamentos e semanas gravadas ficam só neste navegador (publique o Code.gs 4.7 para a gravação valer para todos).'
              : 'Modo de teste: lançamentos e semanas gravadas ficam só neste navegador.')
          : 'Lançamentos gravados na planilha (aba EMPENHOS_REGISTROS) e vistos por todos.'}${semFer ? ' A planilha de férias não está carregada, então ninguém aparece de férias automaticamente.' : ''}</p>
        <div class="emp-legenda">${[['op', 'Em serviço'], ['ferias', 'Férias / trânsito'], ['lic', 'Licenciado / dispensado'], ['folga', 'Folga / liberado'], ['curso', 'Curso / TPB'], ['gcif', 'GCIF'], ['missao', 'Missão'], ['outro', 'Outros']].map(([c, t]) => `<span class="pill st-${c}">${t}</span>`).join('')}<span class="muted">● automático / ✎ lançado</span></div>
        <nav class="emp-tabs" aria-label="Dia">${blocos.map((x) => `<button type="button" data-tab="${x.iso}" aria-selected="${x.iso === est.dia}" class="pc${x.p} al-${piorDia(x.c)}"><span>${UI.SEM[x.d.getDay()]}</span><b>${x.d.getDate()}</b><i>${x.p}º</i></button>`).join('')}</nav>
        <div class="emp-wrap"><div class="emp-semana">${blocos.map((x) => diaHtml(x, x.iso === est.dia)).join('')}</div></div>
      </div>`;

      const rer = () => PAGES.empenhos.render(view);
      if (view.querySelector('#sLinkPub')) view.querySelector('#sLinkPub').onclick = () => linkPublico();
      const bG = view.querySelector('#sGravar');
      // enquanto grava: botão com ícone girando, os outros botões travados e aviso na barra
      const trabalhando = (btn, texto, aviso) => {
        UI.ocupado(btn, texto);
        view.querySelectorAll('.emp-grav button').forEach((b) => { b.disabled = true; });
        const t = view.querySelector('.emp-grav-t');
        if (t) t.innerHTML = `<b>${UI.esc(aviso)}</b> <span class="muted">· aguarde, a planilha está sendo atualizada</span>`;
        view.querySelector('.emp-grav').classList.add('gravando');
      };
      if (bG) bG.onclick = async () => {
        trabalhando(bG, 'Gravando…', 'Gravando a semana…');
        try { const j = await gravarSemana(seg); rer(); UI.toast(j ? `Semana gravada. Outra pessoa tinha gravado esta semana${hm(j) ? ` às ${hm(j)}` : ''}: as alterações dela e as suas foram juntadas.` : 'Semana gravada'); }
        catch (e) { rer(); UI.toast((e.cancelado ? 'Não gravada: ' : 'Não foi possível gravar: ') + (e.message || e)); }
      };
      // gravar todas as semanas com lançamentos não gravados (ex.: DSP de 06/11 a 18/11 → 3 semanas)
      const bT = view.querySelector('#sGravarTodas');
      if (bT) bT.onclick = () => {
        UI.sheet('Gravar semanas alteradas', `<div class="grid" style="gap:12px">
          <p>Gravar as <b>${pendSemanas.length}</b> semanas que têm lançamentos ainda não gravados:</p>
          <ul class="emp-lista-sem">${pendSemanas.map((v) => `<li>${fmtSem(v)}${v === est.seg ? ' <span class="muted">(esta semana)</span>' : ''}${DS.semanaGravada(v) ? ' <span class="muted">· substitui a gravação anterior</span>' : ''}</li>`).join('')}</ul>
          <div class="btn-row"><button type="button" class="btn primary" id="tConf">Gravar ${pendSemanas.length} semanas</button><button type="button" class="btn ghost" data-close>Cancelar</button></div>
          <p class="muted" id="tMsg" style="font-size:13px"></p></div>`);
        const box = document.getElementById('sheet');
        box.querySelector('#tConf').onclick = async () => {
          const msg = box.querySelector('#tMsg'), btn = box.querySelector('#tConf');
          UI.ocupado(btn, 'Gravando…');
          box.querySelector('[data-close].btn').disabled = true;
          trabalhando(bT, 'Gravando…', `Gravando ${pendSemanas.length} semanas…`);
          try {
            const r = await gravarVarias(pendSemanas, (t) => { msg.textContent = t; });
            UI.fechaSheet(); rer(); UI.toast(`${r.feitas} semanas gravadas${r.juntadas ? `; em ${r.juntadas}, outra pessoa tinha gravado antes e as alterações foram juntadas` : ''}`);
          } catch (e) {
            UI.fechaSheet(); rer();
            UI.toast(`Não foi possível gravar todas as semanas: ${e.message || e}. As que ficaram sem gravar continuam marcadas.`, 8000);
          }
        };
      };
      const bL = view.querySelector('#sLimpar');
      if (bL) bL.onclick = () => {
        // dia escolhido: o selecionado na tela (aba do dia no celular; hoje ou segunda no computador)
        const opDias = dias.map((d) => { const iso = DS.iso(d), n = lancDoDia(iso).total; return `<option value="${iso}" ${iso === est.dia ? 'selected' : ''}>${UI.SEM_L[d.getDay()]}, ${UI.dm(d)}${n ? ` (${n} lançamento${n > 1 ? 's' : ''})` : ' (sem lançamentos)'}</option>`; }).join('');
        UI.sheet('Limpar lançamentos', `<div class="grid" style="gap:12px">
          <div class="emp-limpa-op">
            <label><input type="radio" name="lQual" value="dia" checked> <b>Somente o dia</b></label>
            <select class="input" id="lDia" aria-label="Dia">${opDias}</select>
            <p class="muted">Status e observações lançados à mão, reforços e a observação do dia escolhido.${grav ? ' A semana continua gravada: para valer para todos, clique depois em <b>"Gravar semana"</b>.' : ''}</p>
          </div>
          <div class="emp-limpa-op">
            <label><input type="radio" name="lQual" value="semana"> <b>A semana inteira</b> (${UI.data(seg)} a ${UI.data(dom)})</label>
            <p class="muted">Todos os lançamentos dos 7 dias.${grav ? ' A gravação da semana também é desfeita: ela volta a ser montada com o efetivo atual de cada pelotão (sem o ✓).' : ''}</p>
          </div>
          <p class="muted" style="font-size:13.5px;margin:0">Férias, licenças e dispensas continuam aparecendo automaticamente.</p>
          <div class="btn-row"><button type="button" class="btn primary" id="lConf">Limpar lançamentos</button><button type="button" class="btn ghost" data-close>Cancelar</button></div>
          <p class="muted" id="lMsg" style="font-size:13px"></p></div>`);
        const box = document.getElementById('sheet');
        const qual = () => box.querySelector('input[name="lQual"]:checked').value;
        box.querySelector('#lDia').onchange = () => { box.querySelector('input[value="dia"]').checked = true; };
        box.querySelector('#lConf').onclick = async () => {
          const iso = box.querySelector('#lDia').value, soDia = qual() === 'dia';
          UI.ocupado(box.querySelector('#lConf'), 'Limpando…');
          if (soDia) {
            try {
              const marcou = await limparDia(iso);
              est.dia = iso; UI.fechaSheet(); rer();
              UI.toast(marcou ? `Lançamentos de ${UI.dm(DS.parse(iso))} apagados. Clique em "Gravar semana" para valer para todos.` : `Lançamentos de ${UI.dm(DS.parse(iso))} apagados`, marcou ? 7000 : 3500);
            } catch (e) { UI.fechaSheet(); rer(); UI.toast('Não foi possível limpar: ' + (e.message || e), 8000); }
            return;
          }
          trabalhando(bL, 'Limpando…', 'Limpando os lançamentos da semana…');
          try { await limparSemana(seg); UI.fechaSheet(); rer(); UI.toast('Lançamentos da semana apagados'); }
          catch (e) {
            if (e.conflito) { UI.fechaSheet(); rer(); UI.toast(e.message, 9000); return; }
            UI.fechaSheet(); rer(); UI.toast('Não foi possível limpar: ' + (e.message || e), 8000);
          }
        };
      };
      const vaiPara = (d) => { est.seg = DS.iso(segundaDe(d)); est.dia = null; rer(); };
      view.querySelector('#sPrev').onclick = () => vaiPara(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() - 7));
      view.querySelector('#sNext').onclick = () => vaiPara(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 7));
      view.querySelector('#sHoje').onclick = () => vaiPara(hoje);
      view.querySelector('#sSel').onchange = (e) => vaiPara(DS.parse(e.target.value));
      view.querySelectorAll('.st-tab').forEach((b) => (b.onclick = () => vaiPara(DS.parse(b.dataset.seg))));
      const sc = view.querySelector('#stScroll'), on = sc.querySelector('.st-tab.on');
      if (on) {
        sc.style.scrollBehavior = 'auto';
        const rs = sc.getBoundingClientRect(), rt = on.getBoundingClientRect();
        sc.scrollLeft += (rt.left - rs.left - (rs.width - rt.width) / 2) / ((window.APP && APP.zoom) || 1);
        sc.style.scrollBehavior = '';
      }
      sc.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        sc.scrollLeft += e.deltaY;
        e.preventDefault();
      } }, { passive: false });
      view.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
        est.dia = b.dataset.tab;
        view.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b));
        view.querySelectorAll('.emp-dia').forEach((s) => s.classList.toggle('ativo', s.dataset.dia === est.dia));
      }));
      // perfil que só consulta (CBU, auxiliar): nada de lançar, adicionar reforço ou escrever observação
      if (!podeGravar) {
        view.querySelectorAll('.emp-row').forEach((b) => { b.disabled = true; b.title = b.title.replace('Toque para mudar o status ou anotar', ''); });
        view.querySelectorAll('[data-obs]').forEach((t) => { t.readOnly = true; t.placeholder = ''; });
      }
      else view.querySelectorAll('.emp-row').forEach((b) => (b.onclick = () => editar(view, b.dataset.iso, b.dataset.k, !!b.dataset.ref)));
      if (podeGravar) view.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => addReforco(view, b.dataset.add)));
      if (podeGravar) view.querySelectorAll('[data-obs]').forEach((t) => (t.onchange = async () => {
        const obs = t.value.trim();
        const gravada = !!gravDe(DS.parse(t.dataset.obs));
        try {
          await DS.salvarReg({ data: t.dataset.obs, tipo: 'obsdia', bm: '', obs, apagar: !obs && !gravada });
          UI.toast('Observação do dia salva');
          PAGES.empenhos.render(view);
        }
        catch (e) { UI.toast(e.message || 'Não foi possível salvar'); }
      }));
      const hojeEl = view.querySelector('.emp-dia.hoje');
      if (hojeEl && innerWidth > 900) { const w = view.querySelector('.emp-wrap'); w.scrollLeft = Math.max(0, hojeEl.offsetLeft - w.offsetLeft - 8); }
    },
  };
})();
