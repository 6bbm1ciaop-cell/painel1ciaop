/* ==========================================================================
   TELA › ESCALA MENSAL › MODELO (window.ESC)
   Monta a escala de um mês a partir do efetivo, das férias e licenças e do que
   foi lançado à mão (o "doc" do mês). Não desenha nada: editor.js (tela) e
   folha.js (folha A4) usam o resultado de ESC.montar(mes, doc).

   doc do mês (só o que foi lançado à mão; o resto é automático):
     func/mot/afast { chave: texto } ... função, motorista e afastamento trocados à mão
     ocultos { chave: true } ........... militar tirado da escala
     cor { chave: cor } ................ destaque da linha escolhido à mão (ver CORES); só vale no mês
     extras { obm: [{ id, pos, nome, func, mot, afast }] }  linhas avulsas (ex.: "CBU Rotativo"); com posto no
                                                            nome ("3º Sgt Douglas") a posição é automática
     grade { 'pel|aaaa-mm-dd': texto } . marcas do quadro de dias trocadas à mão
     saoPadrao { obm: [chaves] } ....... militares padrão do SAO (passa de um mês para o outro)
     rpaPadrao { 1..4: [chaves] } ...... pilotos de RPA padrão (sem isso: quem tem curso de RPA)
     sao { obm }, rpa { 1..4 } ......... SAO e pilotos de RPA escritos à mão (sem isso: padrão / curso de RPA)
     obs { 1..4 }, textos { campo, versao }, viaturas { sede|pemad: { aaaa-mm-dd } }
     compensacao: true ................. "compensação de turno" ligada (passa para o mês seguinte)
     semComp { chave: true } ........... militares sem compensação neste mês
     pbresc { linhas: [{ id, k, eq ('A', 'B'…), nome, dias { dia } }], obs, prescricoes }
     cobom { turnos { turno: { dia } }, legenda: [{ letra, nome, k }], obs }
     fixo (versão gravada): { quadros { obm: [chaves] }, mil { chave: [posto, nome de guerra, credenciamento, id] },
                              auto { afast, obs, pbObs, cbObs, pbDias, textos, sao, rpa } }
       → a composição e os textos automáticos ficam como estavam ao gravar
   ========================================================================== */
window.ESC = (function () {
  const C = window.APP_CONFIG;
  const E = () => C.escalaMensal;
  const pad = (n) => String(n).padStart(2, '0');
  const SEM3 = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const PELS = ['1º Pel', '2º Pel', '3º Pel', '4º Pel'];
  const ALAS = ['1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD'];
  const COBOM = ['CIAD/COBOM', 'CIAD/COBOM ADM'];
  // quadros guardados na gravação (composição)
  const FIXOS = [...PELS, ...ALAS, 'PBRESC', ...COBOM, 'PEMAD ADM'];
  const DE = { FA: 'das FA', FP: 'das FP', TR: 'do Trânsito', LM: 'da LM', LL: 'da LL', LN: 'da LN', DM: 'da DM' };

  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const rank = (m) => (DS.RANK[m.posto] ?? 99);
  const ehOficial = (m) => rank(m) <= 3.5;
  const ehSgt = (m) => rank(m) >= 4 && rank(m) <= 7;
  const ehCbSd = (m) => rank(m) >= 8 && rank(m) <= 9;
  // "2º Sgt" → "Sgt"; "Sub Ten" fica
  const postoCurto = (p) => String(p || '').replace(/^\d+º\s*/, '');
  const nomeCurto = (m) => `${postoCurto(m.posto)} ${m.nomeGuerra}`.trim();
  const nomeLongo = (m) => `${m.posto} ${m.nomeGuerra}`.trim();
  // "A", "A e B", "A, B e C"
  const juntaNomes = (l) => (l.length <= 1 ? l[0] || '' : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);
  // tem curso de piloto de drone? (config.js → escalaMensal.cursosRpa)
  const pilotoRpa = (m) => {
    const re = new RegExp(`(^|[^A-Z])(${E().cursosRpa.map((x) => UI.norm(x).toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
    return (m.cursos || []).some((c) => re.test(UI.norm(c).toUpperCase()));
  };
  const isoMais = (iso, n) => { const d = DS.parse(iso); d.setDate(d.getDate() + n); return DS.iso(d); };

  /* ---------- meses ---------- */
  const mesDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  function somaMes(mes, n) { const [a, m] = mes.split('-').map(Number); return mesDe(new Date(a, m - 1 + n, 1)); }
  function nomeMes(mes) { const [a, m] = mes.split('-').map(Number); return `${UI.MESES[m - 1]} de ${a}`; }
  function diasDoMes(mes) {
    const [a, m] = mes.split('-').map(Number), n = new Date(a, m, 0).getDate();
    const fer = new Map(DS.feriados(a).map((f) => [f.data, f.nome]));
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(a, m - 1, i + 1), iso = DS.iso(d);
      return { d, n: i + 1, iso, sem: SEM3[d.getDay()], dow: d.getDay(), fds: d.getDay() === 0 || d.getDay() === 6, feriado: fer.get(iso) || '', pel: DS.pelotaoDoDia(d) };
    });
  }
  // mês que a aba abre: o próximo a partir do dia 10 (a escala sai até o dia 25)
  function mesPadrao() { const h = DS.hoje(); return mesDe(new Date(h.getFullYear(), h.getMonth() + (h.getDate() >= 10 ? 1 : 0), 1)); }

  /* ---------- afastamentos (férias, trânsito, licenças, dispensas) ---------- */
  function siglaFerias(f) { const t = UI.norm(f.tipo); return /transito/.test(t) ? 'TR' : /^fp|premio/.test(t) ? 'FP' : 'FA'; }
  function siglaLicenca(l) {
    const t = UI.norm(`${l.tipo} ${l.categoria}`);
    return /luto/.test(t) ? 'LL' : /nupcia|casamento/.test(t) ? 'LN' : l.categoria === 'Dispensa' ? 'DM' : 'LM';
  }
  // militar → [{ sig, ini, fim }] (só as siglas de config.js → escalaMensal.afastamentos)
  function indiceAfast() {
    const usa = new Set(E().afastamentos), idx = new Map();
    const poe = (mil, sig, ini, fim) => { if (!usa.has(sig) || !ini || !fim) return; if (!idx.has(mil)) idx.set(mil, []); idx.get(mil).push({ sig, ini, fim }); };
    if (DS.ligada('ferias')) DS.ferias().forEach((f) => poe(f.militar, siglaFerias(f), f.inicio, f.fim));
    if (DS.ligada('licencas')) DS.licencas().forEach((l) => poe(l.militar, siglaLicenca(l), l.inicio, l.fim));
    idx.forEach((l) => l.sort((a, b) => a.ini.localeCompare(b.ini)));
    return idx;
  }
  const periodoTxt = (x) => `${x.sig} ${UI.dm(x.ini)} a ${UI.dm(x.fim)}`;
  /* Destaque da linha pelo texto do afastamento ("FA 04/11 a 25/11", "LM/FA 18/10 a 22/12*"…):
       licença (LM, LL, LN) ............................ vermelho ('lic')
       férias/trânsito que pegam a 1ª quinzena do mês .... verde ('fer')
       férias/trânsito só na 2ª quinzena ................. verde claro ('fer2')
       férias/trânsito com até 5 dias no mês ............. sem destaque
       dispensa médica (DM) .............................. laranja ('disp')
     ini/fim: 1º e último dia do mês da escala (aaaa-mm-dd). */
  /* períodos escritos num texto de afastamento ("FA 04/11 a 25/11 / LM 01/11 a 05/11"):
     [{ sig, a0, a1 }] (aaaa-mm-dd), com o ano mais perto do mês da escala (ini = 1º dia do mês) */
  function periodosTexto(txt, ini) {
    const t = String(txt || '').toUpperCase(), out = [];
    const [ano, mes] = (ini || DS.iso(DS.hoje())).split('-').map(Number), base = new Date(ano, mes - 1, 1);
    const data = (d, m, a) => (a ? new Date(a < 100 ? 2000 + a : a, m - 1, d)
      : [ano - 1, ano, ano + 1].map((y) => new Date(y, m - 1, d)).sort((x, y) => Math.abs(x - base) - Math.abs(y - base))[0]);
    const re = /\b((?:[A-Z]{2}\/)*[A-Z]{2})\*?\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:A|ATÉ|ATE|-)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
    let x;
    while ((x = re.exec(t))) {
      const d0 = data(+x[2], +x[3], x[4] && +x[4]);
      let d1 = data(+x[5], +x[6], x[7] && +x[7]);
      if (d1 < d0) d1 = new Date(d1.getFullYear() + 1, d1.getMonth(), d1.getDate());
      out.push({ sig: x[1], a0: DS.iso(d0), a1: DS.iso(d1) });
    }
    return out;
  }

  function tomDe(txt, ini, fim) {
    const t = String(txt || '').toUpperCase();
    if (!t.trim()) return '';
    let tom = '', peso = 0, achou = false;
    const marca = (novo, p) => { if (p > peso) { tom = novo; peso = p; } };
    const [ano, mes] = (ini || DS.iso(DS.hoje())).split('-').map(Number);
    const base = new Date(ano, mes - 1, 1);
    // ano mais provável de "dd/mm" (o mais perto do mês da escala)
    const data = (d, m, a) => {
      if (a) return new Date(a < 100 ? 2000 + a : a, m - 1, d);
      return [ano - 1, ano, ano + 1].map((y) => new Date(y, m - 1, d)).sort((x, y) => Math.abs(x - base) - Math.abs(y - base))[0];
    };
    const re = /\b((?:[A-Z]{2}\/)*[A-Z]{2})\*?\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:A|ATÉ|ATE|-)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
    let x;
    while ((x = re.exec(t))) {
      achou = true;
      const sigs = x[1].split('/');
      const d0 = data(+x[2], +x[3], x[4] && +x[4]);
      let d1 = data(+x[5], +x[6], x[7] && +x[7]);
      if (d1 < d0) d1 = new Date(d1.getFullYear() + 1, d1.getMonth(), d1.getDate());
      const a0 = DS.iso(d0) > ini ? DS.iso(d0) : ini, a1 = DS.iso(d1) < fim ? DS.iso(d1) : fim;
      if (a0 > a1) continue;                                  // período fora do mês
      const dias = Math.round((DS.parse(a1) - DS.parse(a0)) / 864e5) + 1;
      if (sigs.some((g) => ['LM', 'LL', 'LN'].includes(g))) marca('lic', 4);
      if (sigs.some((g) => ['FA', 'FP', 'TR'].includes(g)) && dias > 5) marca(+a0.slice(8) <= 15 ? 'fer' : 'fer2', +a0.slice(8) <= 15 ? 3 : 2);
      if (sigs.includes('DM')) marca('disp', 1);
    }
    if (achou) return tom;
    // texto sem datas: só pela sigla
    return /\b(LM|LL|LN)\b/.test(t) ? 'lic' : /\b(FA|FP|TR)\b/.test(t) ? 'fer' : /\bDM\b/.test(t) ? 'disp' : '';
  }
  // cores que dá para escolher à mão em cada linha (as que não são de férias/licença servem para CD, CR, cedido…)
  const CORES = [['', 'Automático'], ['nenhum', 'Sem destaque'], ['amarelo', 'Amarelo'], ['azul', 'Azul'], ['laranja', 'Laranja'],
    ['roxo', 'Roxo'], ['cinza', 'Cinza'], ['lic', 'Vermelho'], ['fer', 'Verde'], ['fer2', 'Verde claro']];
  // motorista pelo credenciamento: D ou E = pesado; B ou C = leve
  function motDe(cred) {
    const c = String(cred || '').toUpperCase().replace(/[^A-Z]/g, '');
    return /[DE]/.test(c) ? 'MP' : /[BC]/.test(c) ? 'ML' : '-';
  }
  // nome de guerra citado num texto livre (SAO, RPA, legenda…)
  function citados(texto, lista) {
    const t = ' ' + UI.norm(texto).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return lista.filter((m) => { const n = UI.norm(m.nomeGuerra).replace(/[^a-z0-9]+/g, ' ').trim(); return n.length >= 3 && t.includes(' ' + n + ' '); });
  }

  /* ---------- linha avulsa: posto/graduação escrito no nome ----------
     "3º Sgt Douglas" → { posto: '3º Sgt', rank, m }. m = militar do efetivo da companhia com o MESMO nome de
     guerra E o MESMO posto/graduação (um "Cb Denilson" de fora não é confundido com o 3º Sgt Denilson da
     companhia). "Sgt Fulano" sem o número vale para 1º, 2º ou 3º Sgt; "Ten Fulano", para 1º ou 2º Ten.
     Sem posto reconhecível → rank null. */
  /* 3.3 (4.78): nº BM digitado no nome ("3º Sgt Douglas 123.456-7" ou só "1234567") → o militar do efetivo.
     Devolve { m, nome: "posto nome de guerra" } ou null. */
  function milPorTexto(texto) {
    const mt = String(texto || '').match(/\d[\d.\-\/ ]{3,}\d/g);
    if (!mt) return null;
    for (const t of mt) { const m = DS.militarPorBM(t); if (m) return { m, nome: nomeLongo(m) }; }
    return null;
  }
  /* militar de uma linha avulsa: pela chave guardada (nº BM, desde a 4.78) ou pelo posto + nome escrito */
  function milDoExtra(x) {
    if (x && x.mk) { const m = DS.todos().find((y) => DS.chaveMil(y) === x.mk); if (m) return { posto: m.posto, rank: rank(m), m }; }
    return postoDaLinha(x && x.nome);
  }
  function postoDaLinha(nome) {
    const t = String(nome || '').trim(), u = DADOS.util;
    const mt = t.match(u.RX_POSTO);
    if (!mt) return { posto: '', rank: null, m: null };
    const sig = mt[1].replace(/\s+/g, ' ').trim();
    let posto = u.postoCanon(sig), confere = (x) => x.posto === posto;
    if (/^sgt$/i.test(sig)) { posto = '3º Sgt'; confere = (x) => /^[123]º Sgt$/.test(x.posto); }   // "Sgt Fulano": sem o número, fica junto dos 3º Sgt
    else if (/^ten$/i.test(sig)) { posto = '2º Ten'; confere = (x) => /^[12]º Ten$/.test(x.posto); }
    const resto = UI.norm(t.slice(mt[0].length)).trim();
    const mesmos = resto ? DS.militares().filter((m) => UI.norm(m.nomeGuerra).trim() === resto && confere(m)) : [];
    const m = mesmos.length === 1 ? mesmos[0] : null;     // nome e posto conferem com um só militar da companhia
    return { posto, rank: m ? rank(m) : DS.RANK[posto] ?? null, m };
  }

  /* ---------- doc novo: começa com o que foi usado no mês anterior ---------- */
  function novoDoc(mes, ant) {
    const doc = { mes };
    if (!ant) return doc;
    ['func', 'mot', 'ocultos', 'extras', 'saoPadrao', 'rpaPadrao'].forEach((c) => { if (ant[c]) doc[c] = clone(ant[c]); });
    if (ant.compensacao) doc.compensacao = true;   // a chave "compensação de turno" continua ligada
    // pilotos de RPA escritos à mão passam para o mês seguinte (até escolher um padrão)
    if (ant.rpa) { const r = {}; Object.keys(ant.rpa).forEach((c) => { if (!((ant.rpaPadrao || {})[c] || []).length) r[c] = ant.rpa[c]; }); if (Object.keys(r).length) doc.rpa = r; }
    // SAO escrito à mão só passa para o mês seguinte se o pelotão não tiver militares padrão
    if (ant.sao) { const sao = {}; Object.keys(ant.sao).forEach((o) => { if (!((ant.saoPadrao || {})[o] || []).length) sao[o] = ant.sao[o]; }); if (Object.keys(sao).length) doc.sao = sao; }
    if (doc.extras) Object.values(doc.extras).forEach((l) => l.forEach((x) => { delete x.afast; }));
    const tx = { ...(ant.textos || {}) }; delete tx.data; delete tx.versao;
    if (Object.keys(tx).length) doc.textos = tx;
    const pb = ant.pbresc || {};
    doc.pbresc = { ...(pb.linhas ? { linhas: pb.linhas.map((l) => ({ id: l.id, k: l.k, ...equipeDe(l) })) } : {}), ...(pb.prescricoes != null ? { prescricoes: pb.prescricoes } : {}) };
    if (ant.cobom && ant.cobom.legenda) doc.cobom = { legenda: clone(ant.cobom.legenda) };
    return doc;
  }

  /* ---------- montagem do mês ---------- */
  function montar(mes, doc) {
    doc = doc || { mes };
    const dias = diasDoMes(mes), ini = dias[0].iso, fim = dias[dias.length - 1].iso;
    const A = doc.fixo && doc.fixo.auto;             // textos automáticos da versão gravada
    const af = indiceAfast();
    const noMes = (m) => (af.get(m.id) || []).filter((x) => x.ini <= fim && x.fim >= ini);
    const afastNoDia = (m, iso) => (af.get(m.id) || []).find((x) => x.ini <= iso && x.fim >= iso && x.sig !== 'DM');
    const textoAfast = (m) => noMes(m).map(periodoTxt).join(' / ');

    // cadastro atual por chave (nº BM)
    const porChave = new Map();
    DS.todos().forEach((m) => { const k = DS.chaveMil(m); if (!porChave.has(k)) porChave.set(k, m); });
    // militar como estava na gravação
    const milFixo = (k, obm) => {
      const x = doc.fixo.mil[k]; if (!x) return null;
      const atual = porChave.get(k);
      return { ...(atual || {}), id: x[3] || (atual && atual.id) || k, posto: x[0], nomeGuerra: x[1], credenciado: x[2] || '-', obm };
    };
    // membros do quadro (gravação ou efetivo atual), sem os ocultos
    const ocultos = doc.ocultos || {};
    const membrosTodos = (obm) => (doc.fixo && doc.fixo.quadros && doc.fixo.quadros[obm]
      ? doc.fixo.quadros[obm].map((k) => milFixo(k, obm)).filter(Boolean)
      : DS.militares().filter((m) => m.obm === obm).sort(DS.ordemAntiguidade));
    const membros = (obm) => membrosTodos(obm).filter((m) => !ocultos[DS.chaveMil(m)]);

    /* quadro de dias */
    const grade = {};
    [1, 2, 3, 4].forEach((p) => {
      grade[p] = dias.map((x) => {
        const auto = x.pel === p ? E().marcas[x.dow] || 'X' : '';
        const k = `${p}|${x.iso}`, ed = doc.grade && k in doc.grade;
        return { auto, v: ed ? doc.grade[k] : auto, ed, chave: k };
      });
    });

    /* quadros dos pelotões e das alas */
    function quadro(obm, ehPel) {
      const lista = membros(obm).map((m) => ({ tipo: 'mil', m, k: DS.chaveMil(m) }));
      /* linhas avulsas: com posto/graduação no nome ("3º Sgt Douglas"), entram sozinhas no lugar certo:
         - militar da companhia (nome de guerra achado no efetivo): pela antiguidade, como na Geral
           (posto, POSIÇÃO NO PEL, almanaque, nome);
         - outro: na última colocação do posto (depois de todos do mesmo posto).
         Sem posto (ex.: "CBU Rotativo"): na posição escolhida no campo #. */
      const extras = (doc.extras || {})[obm] || [], semPosto = [];
      extras.forEach((x) => {
        const p = milDoExtra(x);
        if (p.rank == null) { semPosto.push(x); return; }
        const rankDe = (l) => (l.tipo === 'mil' ? rank(l.m) : l.rank);
        let i = lista.findIndex((l) => {
          if (rankDe(l) == null) return false;
          const ref = l.tipo === 'mil' ? l.m : l.ref;
          return p.m && ref ? DS.ordemAntiguidade(p.m, ref) < 0 : p.rank < rankDe(l);
        });
        if (i < 0) i = lista.length;
        lista.splice(i, 0, { tipo: 'extra', x, k: x.id, rank: p.rank, ref: p.m, posAuto: true });
      });
      semPosto.slice().sort((a, b) => (a.pos || 99) - (b.pos || 99)).forEach((x) => {
        const i = Math.max(0, Math.min(lista.length, (x.pos || lista.length + 1) - 1));
        lista.splice(i, 0, { tipo: 'extra', x, k: x.id });
      });
      const linhas = lista.map((l, i) => {
        if (l.tipo === 'extra') {
          const x = l.x;
          const tomX = x.cor ? (x.cor === 'nenhum' ? '' : x.cor) : 'extra';
          return { tipo: 'extra', k: x.id, id: x.id, m: l.ref || null, pos: l.posAuto ? i + 1 : x.pos || i + 1, posAuto: !!l.posAuto, daCia: !!l.ref, rank: l.rank ?? null, posto: '', nome: x.nome || '', afast: x.afast || '', func: x.func || '', mot: x.mot || '-', tom: tomX, cor: x.cor || '', tomAuto: 'extra' };
        }
        const m = l.m, k = l.k;
        const funcAuto = ehPel ? (i === 0 ? 'CBU' : i === 1 ? 'AUX/CH' : ehCbSd(m) ? 'CBT' : 'CH') : ehCbSd(m) ? 'CBT' : 'CH';
        const pega = (campo, auto) => { const ed = doc[campo] && k in doc[campo]; return [ed ? doc[campo][k] : auto, ed && doc[campo][k] !== auto]; };
        const [func0] = pega('func', funcAuto);
        // CBU não conta como motorista pesado: MP vira MP* (o asterisco tira do total de MP)
        let motAuto = motDe(m.credenciado);
        if (/^CBU/.test(String(func0).toUpperCase()) && motAuto === 'MP') motAuto = 'MP*';
        const afastAuto = A ? (A.afast && A.afast[k]) || '' : textoAfast(m);
        const [mot, motEd] = pega('mot', motAuto), [afast, afastEd] = pega('afast', afastAuto);
        // destaque: escolhido à mão (doc.cor) ou pelo afastamento
        const tomAuto = tomDe(afast, ini, fim), cor = (doc.cor && doc.cor[k]) || '';
        const tom = cor ? (cor === 'nenhum' ? '' : cor) : tomAuto;
        return { tipo: 'mil', m, k, i, posto: m.posto, nome: m.nomeGuerra, funcAuto, mot, motAuto, motEd, afast, afastAuto, afastEd, tom, tomAuto, cor };
      });
      // CM (chefe dos motoristas) automático: o motorista pesado mais antigo, tirando CBU e auxiliar do CBU
      // (nas alas, tirando o chefe da ala, que é a 1ª linha); só quando ninguém do quadro foi lançado à mão como CM
      const cmMao = linhas.some((l) => l.tipo === 'mil' && doc.func && l.k in doc.func && /\bCM\b/.test(String(doc.func[l.k]).toUpperCase()));
      if (!cmMao) {
        const cm = linhas.find((l) => l.tipo === 'mil' && l.mot === 'MP' && !/^(CBU|AUX)/.test(l.funcAuto) && (ehPel || l.i > 0) && !(doc.func && l.k in doc.func));
        if (cm) cm.funcAuto = cm.funcAuto === 'CBT' ? 'CM/CBT' : 'CM/CH';
      }
      linhas.forEach((l) => {
        if (l.tipo !== 'mil') return;
        const ed = doc.func && l.k in doc.func;
        l.func = ed ? doc.func[l.k] : l.funcAuto;
        l.funcEd = ed && doc.func[l.k] !== l.funcAuto;
      });
      const mils = linhas.filter((l) => l.tipo === 'mil');
      // linhas avulsas com posto no nome também contam (Ten até Asp · Sub Ten e Sgt · Cb e Sd)
      const avulsas = (a, b) => linhas.filter((l) => l.tipo === 'extra' && l.rank != null && l.rank >= a && l.rank <= b).length;
      const cont = {
        ten: mils.filter((l) => ehOficial(l.m)).length + avulsas(0, 3.5), sgt: mils.filter((l) => ehSgt(l.m)).length + avulsas(4, 7), cbsd: mils.filter((l) => ehCbSd(l.m)).length + avulsas(8, 9),
        // MP* (carteira vencida, CBU…) não entra no total de motoristas pesados
        ml: linhas.filter((l) => l.mot === 'ML').length, mp: linhas.filter((l) => l.mot === 'MP').length,
      };
      const escondidos = membrosTodos(obm).filter((m) => ocultos[DS.chaveMil(m)]).map((m) => ({ k: DS.chaveMil(m), nome: nomeLongo(m) }));
      // SAO: escrito à mão ou montado com os militares padrão do pelotão
      const padrao = ((doc.saoPadrao || {})[obm] || []).filter((k) => porChave.has(k));
      const saoAuto = A ? (A.sao && A.sao[obm]) || '' : juntaNomes(padrao.map((k) => nomeCurto(porChave.get(k))));
      const saoEd = doc.sao && obm in doc.sao;
      const sao = { texto: saoEd ? doc.sao[obm] : saoAuto, auto: saoAuto, ed: saoEd && doc.sao[obm] !== saoAuto, padrao };
      return { obm, ehPel, titulo: ehPel ? obm.replace('Pel', 'Pelotão') : obm.replace(' PEMAD', ''), linhas, cont, sao, escondidos };
    }
    const quadros = {};
    PELS.forEach((o) => { quadros[o] = quadro(o, true); });
    ALAS.forEach((o) => { quadros[o] = quadro(o, false); });

    /* sugestões de "previsão de retorno" por coluna (pelotão + ala de mesmo número) */
    /* Retorno de férias/licença por coluna (pelotão + ala de mesmo número), na escala 24×72.
       Sem compensação: volta no 1º plantão do pelotão depois do fim do afastamento.
       Com "compensação de turno" (doc.compensacao): as folgas que o militar perdeu porque as férias começaram
       antes do próximo plantão dele (no máximo 3) são devolvidas depois do fim das férias; a volta é o 1º
       plantão depois disso e os dias que sobram até a volta são compensação de H.E (banco de horas).
       Ex.: 1º Pel trabalha 05/11, FA 06/11 a 11/11 → perdeu 06, 07, 08 → folga até 14/11 → volta 17/11, H.E 15 e 16. */
    const compLigada = !!doc.compensacao, semComp = doc.semComp || {};
    const compensacoes = [];
    function sugestoesRetorno(c) {
      const lim = isoMais(fim, E().retornoAte || 7), itens = [];
      const plantao = (d) => DS.pelotaoDoDia(d) === c;
      const mais1 = (d) => { const x = new Date(d); x.setDate(x.getDate() + 1); return x; };
      [PELS[c - 1], ALAS[c - 1]].forEach((obm) => quadros[obm].linhas.filter((l) => l.tipo === 'mil').forEach((l) => {
        // emenda afastamentos seguidos (ex.: LM e depois FA) e olha o fim do último
        const per = (af.get(l.m.id) || []).filter((x) => x.sig !== 'DM');
        let bloco = null; const blocos = [];
        per.forEach((x) => { if (bloco && x.ini <= isoMais(bloco.fim, 1)) { if (x.fim > bloco.fim) { bloco.fim = x.fim; bloco.sig = x.sig; } } else { bloco = { ...x }; blocos.push(bloco); } });
        blocos.filter((b) => b.fim >= ini && b.fim <= lim).forEach((b) => {
          const ferias = ['FA', 'FP'].includes(b.sig);
          // folgas perdidas: dias do início das férias até o próximo plantão do pelotão
          let perdidas = 0;
          for (let d = DS.parse(b.ini); !plantao(d) && perdidas < 3; d = mais1(d)) perdidas++;
          const compensa = compLigada && ferias && !semComp[l.k];
          let r = DS.parse(isoMais(b.fim, compensa ? perdidas + 1 : 1));
          for (let i = 0; i < 8 && !plantao(r); i++) r = mais1(r);
          const he = [];
          if (compensa) for (let d = DS.parse(isoMais(b.fim, perdidas + 1)); d < r; d = mais1(d)) he.push(UI.dm(d));
          if (compLigada && ferias) compensacoes.push({ k: l.k, nome: nomeCurto(l.m), obm, periodo: `${b.sig} ${UI.dm(b.ini)} a ${UI.dm(b.fim)}`, perdidas, retorno: UI.dm(r), he, ativo: compensa });
          const heTxt = he.length ? `, compensação de H.E ${he.length > 1 ? 'dias' : 'dia'} ${juntaNomes(he)}` : '';
          itens.push({ fim: b.fim, txt: `${nomeCurto(l.m)}, previsão de retorno de ${b.sig} dia ${UI.dm(r)}${heTxt};` });
        });
      }));
      // na ordem da escala: militares do pelotão (como aparecem no quadro) e depois os da ala
      return itens.map((x, i) => `${String.fromCharCode(97 + i)}) ${x.txt}`).join('\n\n');
    }
    const obs = {};
    [1, 2, 3, 4].forEach((c) => {
      const auto = A ? (A.obs && A.obs[c]) || '' : sugestoesRetorno(c);
      const ed = doc.obs && c in doc.obs;
      obs[c] = { titulo: `${c}º Pelotão / ${c}ª Ala`, auto, texto: ed ? doc.obs[c] : auto, ed: ed && doc.obs[c] !== auto };
    });
    // lista de afastamentos do mês de um grupo de militares ("Sgt Azevedo - FA 26/11 a 09/12;")
    const listaAfast = (ms) => ms.flatMap((m) => noMes(m).map((x) => `${nomeCurto(m)} - ${periodoTxt(x)};`)).join('\n');

    /* PBRESC (canil): cada linha tem a letra da equipe (A, B…) e o nome; as linhas saem
       ordenadas pela equipe (A primeiro, depois B…; sem equipe no fim), na ordem em que foram
       escritas dentro de cada equipe */
    const pb = doc.pbresc || {}, pbMembros = membros('PBRESC');
    const pbLinhas = (pb.linhas || pbMembros.map((m) => ({ id: DS.chaveMil(m), k: DS.chaveMil(m), nome: nomeCurto(m) }))).map((l) => ({ ...l, ...equipeDe(l) })).map((l) => {
      const m = l.k ? pbMembros.find((x) => DS.chaveMil(x) === l.k) || porChave.get(l.k) : null;
      const cel = dias.map((x) => {
        const a = A ? ((A.pbDias || {})[l.id] || {})[x.n] || '' : m ? (afastNoDia(m, x.iso) || {}).sig || '' : '';
        const ed = l.dias && x.n in l.dias;
        return { auto: a, v: ed ? l.dias[x.n] : a, ed: ed && l.dias[x.n] !== a };
      });
      return { id: l.id, k: l.k || '', eq: l.eq || '', nome: l.nome || '', m, cel };
    });
    const ordemEq = (l) => l.eq || '\uffff';
    pbLinhas.sort((a, b) => (ordemEq(a) < ordemEq(b) ? -1 : ordemEq(a) > ordemEq(b) ? 1 : 0));   // sort estável: mantém a ordem dentro da equipe
    const pbObsAuto = A ? A.pbObs || '' : listaAfast(pbMembros);
    const pbresc = {
      linhas: pbLinhas, padrao: !pb.linhas,
      obs: pb.obs != null ? pb.obs : pbObsAuto, obsAuto: pbObsAuto, obsEd: pb.obs != null && pb.obs !== pbObsAuto,
      prescricoes: pb.prescricoes != null ? pb.prescricoes : E().prescricoesPbresc,
    };

    /* COBOM/CIAD */
    const cb = doc.cobom || {};
    const cbMembros = COBOM.flatMap((o) => membros(o)).sort(DS.ordemAntiguidade);
    const legenda = (cb.legenda || membros('CIAD/COBOM').filter((m) => !ehOficial(m)).map((m, i) => ({ letra: String.fromCharCode(65 + i), nome: nomeLongo(m), k: DS.chaveMil(m) })))
      .map((x) => ({ ...x, m: (x.k && porChave.get(x.k)) || citados(x.nome, cbMembros)[0] || null }));
    const turnos = E().turnosCobom.map((t) => ({ t, cel: dias.map((x) => ((cb.turnos || {})[t] || {})[x.n] || '') }));
    const cbObsAuto = A ? A.cbObs || '' : listaAfast(cbMembros);
    const cobom = {
      legenda, padrao: !cb.legenda, turnos,
      obs: cb.obs != null ? cb.obs : cbObsAuto, obsAuto: cbObsAuto, obsEd: cb.obs != null && cb.obs !== cbObsAuto,
    };

    /* textos da folha */
    const u = C.unidade, cia = u.sigla.replace(/\s*Op$/, ' Operacional');
    const oficial = (obms) => obms.flatMap((o) => membros(o)).filter(ehOficial).sort(DS.ordemAntiguidade)[0];
    const cmtPemad = oficial(['PEMAD ADM', ...ALAS]), coord = oficial(COBOM), adj = cbMembros.find((m) => !ehOficial(m));
    const textosAuto = A && A.textos ? A.textos : {
      titulo: `- Escala Operacional - ${u.sigla.replace(/\s*Op$/, '')}/${u.batalhao} -`,
      cmtCia: `${cia} - Comandante ${String(u.comandantePosto).replace(/\s*BM$/, '')} ${u.comandante.split(/\s+/).slice(0, 2).join(' ')}`,
      pemad: `5º Pelotão - PEMAD/PBRESC - Comandante ${cmtPemad ? nomeLongo(cmtPemad) : ''}`.trim(),
      cobom: `COBOM/CIAD - Coordenador - ${coord ? nomeLongo(coord) : ''}${adj ? ' - Adjunto ' + nomeLongo(adj) : ''}`,
      local: u.sede, assinatura: `${u.comandante}, ${u.comandantePosto}`, cargo: `Comandante da ${cia}`,
      faxinaTitulo: E().faxinaTitulo, faxina: E().faxina, limpezaTitulo: E().limpezaTitulo, limpeza: E().limpeza,
    };
    const textos = {}, textosEd = {};
    Object.keys(textosAuto).forEach((c) => { const ed = doc.textos && c in doc.textos; textos[c] = ed ? doc.textos[c] : textosAuto[c]; textosEd[c] = ed && doc.textos[c] !== textosAuto[c]; });
    textos.data = (doc.textos && doc.textos.data) || DS.iso(DS.hoje());

    /* limpeza de viaturas aos domingos */
    const domingos = dias.filter((x) => x.dow === 0).map((x) => x.iso);
    const viaturas = { sede: domingos.map((iso) => [iso, ((doc.viaturas || {}).sede || {})[iso] || '']), pemad: domingos.map((iso) => [iso, ((doc.viaturas || {}).pemad || {})[iso] || '']) };

    /* pilotos de RPA/drone por coluna (pelotão + ala): os padrão escolhidos; sem padrão, quem tem o curso;
       ou o que foi escrito à mão no mês */
    const rpa = {};
    [1, 2, 3, 4].forEach((c) => {
      const mils = [PELS[c - 1], ALAS[c - 1]].flatMap((o) => quadros[o].linhas.filter((l) => l.tipo === 'mil').map((l) => l.m));
      const padrao = ((doc.rpaPadrao || {})[c] || []).filter((k) => porChave.has(k));
      const doCurso = mils.filter(pilotoRpa).map(DS.chaveMil);
      const usa = padrao.length ? padrao : doCurso;
      const auto = A ? (A.rpa && A.rpa[c]) || '' : usa.map((k) => nomeCurto(porChave.get(k))).join(' - ');
      const ed = doc.rpa && c in doc.rpa;
      rpa[c] = { texto: ed ? doc.rpa[c] : auto, auto, ed: ed && doc.rpa[c] !== auto, padrao, doCurso, mils };
    });

    const M = { mes, nome: nomeMes(mes), dias, grade, quadros, obs, pbresc, cobom, textos, textosAuto, textosEd, viaturas,
      rpa, gravada: !!doc.fixo, doc, compensacao: { ligada: compLigada, lista: compensacoes } };
    M.avisos = avisos(M, { noMes, afastNoDia, membrosAtuais: (obm) => DS.militares().filter((m) => m.obm === obm), cbMembros, porChave });
    return M;
  }

  /* ---------- avisos (conferência antes de enviar) ---------- */
  function avisos(M, h) {
    const out = [], nomeL = (m) => nomeCurto(m);
    // militar citado no SAO ou nos pilotos de RPA que tem afastamento no mês
    const confereTexto = (txt, onde, lista) => citados(txt, lista).forEach((m) => {
      const x = h.noMes(m); if (x.length) out.push({ tom: 'warn', txt: `${nomeL(m)} está ${onde}, mas tem ${x.map(periodoTxt).join(' / ')}.` });
    });
    const todosMil = Object.values(M.quadros).flatMap((q) => q.linhas.filter((l) => l.tipo === 'mil').map((l) => l.m));
    PELS.forEach((o) => confereTexto(M.quadros[o].sao.texto, `no SAO do ${o}`, todosMil));
    [1, 2, 3, 4].forEach((c) => confereTexto(M.rpa[c].texto, `entre os pilotos de RPA (${c}ª coluna)`, todosMil));
    // função de comando faltando
    const semCbu = [], semCm = [];
    Object.values(M.quadros).forEach((q) => {
      const f = q.linhas.map((l) => String(l.func).toUpperCase());
      if (q.ehPel && !f.some((x) => /^CBU/.test(x))) semCbu.push(q.titulo);
      if (q.linhas.length && !f.some((x) => /\bCM\b/.test(x))) semCm.push(q.titulo);
    });
    if (semCbu.length) out.push({ tom: 'warn', txt: `Sem CBU (comandante do pelotão): ${semCbu.join(', ')}.` });
    if (semCm.length) out.push({ tom: 'info', txt: `Sem CM (chefe dos motoristas): ${semCm.join(', ')}.` });
    // linha avulsa com o nome de um militar que já está na escala
    Object.values(M.quadros).forEach((q) => q.linhas.filter((l) => l.tipo === 'extra').forEach((l) => {
      // militar ligado à linha (nº BM) ou, sem isso, pelo nome: com posto no nome, só é o mesmo militar se nome
      // E posto conferirem (Cb Denilson ≠ 3º Sgt Denilson)
      const p = l.m ? { posto: l.m.posto, m: l.m } : postoDaLinha(l.nome);
      const iguais = p.posto ? (p.m && todosMil.includes(p.m) ? [p.m] : []) : citados(l.nome, todosMil);
      iguais.forEach((m) => out.push({ tom: 'bad', txt: `${nomeL(m)} aparece duas vezes: na linha avulsa do ${q.titulo} e no ${m.obm}.` }));
    }));
    // COBOM: letra fora da legenda ou de militar afastado no dia
    const leg = new Map(M.cobom.legenda.map((x) => [String(x.letra).toUpperCase(), x]));
    const semLeg = new Set(), afastados = new Map();
    M.cobom.turnos.forEach((t) => t.cel.forEach((v, i) => {
      [...String(v).toUpperCase().replace(/[^A-Z]/g, '')].forEach((L) => {
        const x = leg.get(L);
        if (!x) { semLeg.add(L); return; }
        const a = x.m && h.afastNoDia(x.m, M.dias[i].iso);
        if (a) { const k = `${L}|${periodoTxt(a)}`; if (!afastados.has(k)) afastados.set(k, { x, a, dias: [] }); afastados.get(k).dias.push(M.dias[i].n); }
      });
    }));
    if (semLeg.size) out.push({ tom: 'bad', txt: `COBOM: letra(s) ${[...semLeg].join(', ')} na grade sem ninguém na legenda.` });
    afastados.forEach(({ x, a, dias }) => out.push({ tom: 'bad', txt: `COBOM: ${x.nome} (${x.letra}) tem ${periodoTxt(a)}, mas está na grade no(s) dia(s) ${[...new Set(dias)].join(', ')}.` }));
    // COBOM: o mesmo militar de sobreaviso e de serviço (06:00, 14:00, 22:00 ou Adm) no mesmo dia
    const letras = (v) => new Set([...String(v || '').toUpperCase().replace(/[^A-Z]/g, '')]);
    const tSob = M.cobom.turnos.find((t) => /sobreaviso/i.test(t.t));
    if (tSob) {
      const duplo = new Map();
      M.dias.forEach((dia, i) => {
        const sob = letras(tSob.cel[i]);
        if (!sob.size) return;
        M.cobom.turnos.filter((t) => t !== tSob).forEach((t) => letras(t.cel[i]).forEach((L) => {
          if (!sob.has(L)) return;
          if (!duplo.has(L)) duplo.set(L, []);
          duplo.get(L).push(`${dia.n} (${t.t})`);
        }));
      });
      duplo.forEach((dias, L) => {
        const x = leg.get(L), nome = x ? `${x.nome} (${L})` : `A letra ${L}`;
        out.push({ tom: 'bad', txt: `COBOM: ${nome} está de sobreaviso e de serviço no mesmo dia: ${dias.join(', ')}.` });
      });
    }
    // PBRESC: escalado em dia de afastamento
    M.pbresc.linhas.forEach((l) => {
      if (!l.m) return;
      const d = l.cel.map((c, i) => (/^(X|SCA)$/i.test(c.v) && h.afastNoDia(l.m, M.dias[i].iso) ? M.dias[i].n : 0)).filter(Boolean);
      if (d.length) out.push({ tom: 'bad', txt: `PBRESC: ${l.nome} está escalado no(s) dia(s) ${d.join(', ')}, em que tem afastamento.` });
    });
    // escala gravada × efetivo atual
    if (M.gravada) {
      const muda = FIXOS.filter((o) => M.quadros[o] || o === 'PBRESC').map((o) => {
        const g = new Set((M.doc.fixo.quadros[o] || [])), a = new Set(h.membrosAtuais(o).map(DS.chaveMil));
        return [...a].filter((k) => !g.has(k)).length + [...g].filter((k) => !a.has(k)).length;
      }).reduce((s, n) => s + n, 0);
      if (muda) out.push({ tom: 'info', txt: `Desde a gravação, o efetivo mudou (${muda} entrada(s)/saída(s) nos quadros). A escala continua como foi gravada; use "Atualizar pelo efetivo e férias" para refazer.` });
    }
    // piloto de embarcação: em cada dia, no pelotão e na ala de serviço (quadro de dias), entre quem não
    // está afastado (férias, licenças, dispensas e o texto da coluna Afastamento)
    const ini = M.dias[0].iso, falta = new Map();
    const membrosDia = (q, iso) => q.linhas.map((l) => {
      const m = l.tipo === 'mil' ? l.m : l.m || postoDaLinha(l.nome).m;   // linha avulsa: só militar da companhia
      if (!m || h.afastNoDia(m, iso)) return null;
      return periodosTexto(l.afast, ini).some((x) => x.a0 <= iso && x.a1 >= iso) ? null : m;
    }).filter(Boolean);
    M.dias.forEach((dia, i) => [1, 2, 3, 4].forEach((p) => {
      if (!String(M.grade[p][i].v || '').trim()) return;               // pelotão/ala não está de serviço no dia
      [`${p}º Pel`, `${p}ª Ala PEMAD`].forEach((o) => {
        if (!M.quadros[o]) return;
        const r = DS.avaliaPilotos(membrosDia(M.quadros[o], dia.iso), dia.iso);
        if (!r.tom) return;
        const k = `${r.tom}|${o}`;
        if (!falta.has(k)) falta.set(k, { tom: r.tom, o, dias: [], venc: new Set() });
        falta.get(k).dias.push(String(dia.n).padStart(2, '0'));
        r.vencidos.forEach((m) => falta.get(k).venc.add(`${nomeL(m)}${m.embarcacao.validade ? ' (venc. ' + UI.data(m.embarcacao.validade) + ')' : ''}`));
      });
    }));
    falta.forEach((f) => out.push(f.tom === 'bad'
      ? { tom: 'bad', ic: 'ancora', txt: `Sem piloto de embarcação disponível ${/Ala/.test(f.o) ? 'na' : 'no'} ${f.o}: dia(s) ${f.dias.join(', ')}.` }
      : { tom: 'warn', ic: 'ancora', txt: `Só piloto de embarcação com habilitação vencida ${/Ala/.test(f.o) ? 'na' : 'no'} ${f.o}: dia(s) ${f.dias.join(', ')} – ${[...f.venc].join(', ')}.` }));
    if (!DS.ligada('ferias')) out.push({ tom: 'info', txt: 'A planilha de férias não está carregada: nenhuma férias aparece automaticamente.' });
    return out;
  }

  /* letra da equipe de uma linha do PBRESC: { eq, nome }. Linhas antigas traziam a letra no nome
     ("A) Sgt Evilázio"); escrever o nome assim também preenche a equipe. */
  const RE_EQ = /^\s*([A-Za-z])\s*[)\-–.]\s*/;
  function equipeDe(l) {
    const nome = String((l && l.nome) || '');
    if (l && l.eq != null && l.eq !== '') return { eq: String(l.eq).toUpperCase(), nome };
    const m = nome.match(RE_EQ);
    return m ? { eq: m[1].toUpperCase(), nome: nome.slice(m[0].length) } : { eq: '', nome };
  }

  /* ---------- PBRESC: continuar a escala 12/36 (equipes A e B se alternando por semana) ----------
     Para cada linha, descobre no mês anterior (do fim para o começo) em que "semana" do ciclo a equipe estava:
       X na seg ou qua → semana 1 (seg, qua, qui); X na ter ou sex, ou SCA no fim de semana → semana 2 (ter, qui, sex + SCA).
     A cada segunda-feira o ciclo vira. Sem mês anterior, usa a letra da equipe no nome ("A) …", "B) …") e a
     referência de config.js (escalaMensal.pbresc). Devolve { dias: { id: { dia: 'X' | 'SCA' } }, sem: [nomes sem ciclo] }. */
  function continuaPbresc(M, Mant) {
    const cfg = E().pbresc, semana = 7 * 864e5;
    const segunda = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
    const semanas = (a, b) => Math.round((segunda(b) - segunda(a)) / semana);
    // papel (1 ou 2) da linha numa semana de referência
    function referencia(l) {
      const a = Mant && (Mant.pbresc.linhas.find((x) => x.id === l.id) || Mant.pbresc.linhas.find((x) => l.k && x.k === l.k) || Mant.pbresc.linhas.find((x) => UI.norm(x.nome) === UI.norm(l.nome)));
      if (a) {
        for (let i = a.cel.length - 1; i >= 0; i--) {
          const v = String(a.cel[i].v).toUpperCase().trim(), dw = Mant.dias[i].dow;
          if (v === 'X' && (dw === 1 || dw === 3)) return { ref: Mant.dias[i].d, papel: 1 };
          if ((v === 'X' && (dw === 2 || dw === 5)) || (v === 'SCA' && (dw === 6 || dw === 0))) return { ref: Mant.dias[i].d, papel: 2 };
        }
      }
      const letra = l.eq || equipeDe(l).eq;
      if (letra) return { ref: DS.parse(cfg.semanaRef), papel: letra.toUpperCase() === cfg.equipeSegQuaQui.toUpperCase() ? 1 : 2 };
      return null;
    }
    const dias = {}, sem = [];
    M.pbresc.linhas.forEach((l) => {
      const r = referencia(l);
      if (!r) { sem.push(l.nome || '(linha sem nome)'); return; }
      const o = {};
      M.dias.forEach((x, i) => {
        if (l.cel[i].auto) return;                                   // férias/licença ficam
        const papel = semanas(r.ref, x.d) % 2 === 0 ? r.papel : 3 - r.papel;
        const v = (papel === 1 ? cfg.semana1 : cfg.semana2)[x.dow];
        if (v) o[x.n] = v;
      });
      dias[l.id] = o;
    });
    return { dias, sem };
  }

  /* ---------- gravação: guarda a composição e os textos automáticos daquele momento ---------- */
  function paraGravar(doc, M) {
    const g = clone(doc) || {};
    delete g.versao; delete g.gravadoEm; delete g.por;
    const quadros = {}, mil = {}, afast = {};
    const atual = doc.fixo;
    FIXOS.forEach((o) => {
      const lista = atual && atual.quadros && atual.quadros[o]
        ? atual.quadros[o].map((k) => ({ k, x: atual.mil[k] })).filter((y) => y.x)
        : DS.militares().filter((m) => m.obm === o).sort(DS.ordemAntiguidade).map((m) => ({ k: DS.chaveMil(m), x: [m.posto, m.nomeGuerra, m.credenciado && m.credenciado !== '-' ? m.credenciado : '', m.id] }));
      quadros[o] = lista.map((y) => y.k);
      lista.forEach((y) => { mil[y.k] = y.x; });
    });
    Object.values(M.quadros).forEach((q) => q.linhas.forEach((l) => { if (l.tipo === 'mil' && l.afastAuto) afast[l.k] = l.afastAuto; }));
    const pbDias = {};
    M.pbresc.linhas.forEach((l) => { const o = {}; l.cel.forEach((c, i) => { if (c.auto) o[i + 1] = c.auto; }); if (Object.keys(o).length) pbDias[l.id] = o; });
    const obs = {}; [1, 2, 3, 4].forEach((c) => { obs[c] = M.obs[c].auto; });
    const sao = {}; PELS.forEach((o) => { if (M.quadros[o].sao.auto) sao[o] = M.quadros[o].sao.auto; });
    const rpa = {}; [1, 2, 3, 4].forEach((c) => { if (M.rpa[c].auto) rpa[c] = M.rpa[c].auto; });
    g.fixo = { quadros, mil, auto: { afast, obs, pbObs: M.pbresc.obsAuto, cbObs: M.cobom.obsAuto, pbDias, textos: M.textosAuto, sao, rpa } };
    delete g.anteriores;
    g.textos = { ...(g.textos || {}), data: M.textos.data };
    return g;
  }

  /* ---------- juntar alterações de duas pessoas (gravação ao mesmo tempo) ----------
     base = versão de que as duas partiram; meu = o meu rascunho; deles = a versão que a outra pessoa gravou.
     Campo a campo: o que só eu mudei fica o meu; o que só a outra pessoa mudou fica o dela; o que as duas
     mudaram para valores diferentes é conflito (fica o de "preferir": 'meu' ou 'deles').
     Listas de linhas com id (linhas do PBRESC, linhas avulsas) são juntadas linha a linha.
     Devolve { doc, conflitos: [{ cam: ['func', chave], meu, deles }] }. */
  const SEM_JUNTAR = ['versao', 'gravadoEm', 'por', 'mes', 'anteriores', '_base', 'fixo'];
  const canon = (x) => (x === undefined ? '∅' : JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, c) => { o[c] = v[c]; return o; }, {}) : v)));
  const ehObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const ehListaId = (x) => Array.isArray(x) && x.every((e) => ehObj(e) && e.id != null);
  function junta(base, meu, deles, preferir = 'meu') {
    const conflitos = [];
    const limpa = (d) => {
      const o = clone(d || {}) || {};
      SEM_JUNTAR.forEach((c) => delete o[c]);
      if (o.textos) { delete o.textos.versao; delete o.textos.data; }
      return o;
    };
    const igual = (a, b) => canon(a) === canon(b);
    function vai(b, m, t, cam) {
      if (igual(m, b)) return t;
      if (igual(t, b) || igual(m, t)) return m;
      if (ehObj(m) && ehObj(t) && (b === undefined || ehObj(b))) {
        const out = {};
        new Set([...Object.keys(b || {}), ...Object.keys(m), ...Object.keys(t)]).forEach((k) => {
          const r = vai((b || {})[k], m[k], t[k], cam.concat(k));
          if (r !== undefined) out[k] = r;
        });
        return out;
      }
      if (ehListaId(m) && ehListaId(t) && (b === undefined || ehListaId(b))) {
        const mapa = (l) => new Map((l || []).map((e) => [String(e.id), e]));
        const B = mapa(b), Mm = mapa(m), T = mapa(t);
        const ids = [...Mm.keys(), ...[...T.keys()].filter((id) => !Mm.has(id))];
        return ids.map((id) => vai(B.get(id), Mm.get(id), T.get(id), cam.concat('#' + id))).filter((x) => x !== undefined);
      }
      conflitos.push({ cam, meu: m, deles: t });
      return preferir === 'deles' ? t : m;
    }
    const b = limpa(base), m = limpa(meu), t = limpa(deles);
    const doc = vai(b, m, t, []) || {};
    // composição gravada: a que eu refiz ("Atualizar pelo efetivo") ou a da versão mais nova
    const fixo = !igual(meu && meu.fixo, base && base.fixo) ? meu && meu.fixo : deles && deles.fixo;
    if (fixo) doc.fixo = clone(fixo);
    return { doc, conflitos };
  }

  return { CORES, PELS, ALAS, SEM3, continuaPbresc, equipeDe, postoDaLinha, milPorTexto, citados, periodosTexto, mesDe, somaMes, nomeMes, diasDoMes, mesPadrao, novoDoc, montar, paraGravar, tomDe, motDe, nomeCurto, clone, junta };
})();
