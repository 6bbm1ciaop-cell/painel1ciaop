/* ==========================================================================
   DADOS › DS — a "base de dados" do painel no navegador
   Todas as telas leem por aqui (DS.*). Em modo 'sheets' os dados chegam do
   Apps Script como linhas { "TÍTULO DA COLUNA": valor } e são convertidos
   pelos normalizadores (dados/normalizadores/*.js).
   Outros métodos do DS ficam em dados/escala.js e dados/registros.js.
   ========================================================================== */
(function () {
  const { C, RANK, OBM_ORDEM, SEDE, N, soDigitos, postoCanon, classeDe, obmCanon, RX_POSTO, guerraDe, slug, militarVazio, txt, iso } = DADOS.util;
  const NORM = DADOS.NORM;

  const DS = {
    db: null,
    fonte: C.fonteDados,
    atualizadoEm: null,
    ligadas: new Set(),
    avisos: [],
    info: [],
    RANK, OBM_ORDEM,

    /** Lê os dados. forcar = true pede ao Apps Script para ler as planilhas agora, sem usar o cache de 5 min. */
    async load(forcar = false) {
      if (C.fonteDados === 'sheets') {
        // logo depois do login, os dados já vieram na resposta dele (um pedido a menos)
        const escalasMeses = this.mesesEscalaInicio();
        const j = (!forcar && window.AUTH && AUTH.tomaPacote()) || await DADOS.pedirApi(forcar ? { atualizar: true, compacto: true, escalasMeses } : { compacto: true, escalasMeses });
        this._repEfetivo = 0;
        this.aplicar(DADOS.expande(j.dados || {}, (k, rep) => { if (k === 'efetivo') this._repEfetivo = rep; }), j.avisos || []);
        // observações das telas e perfil do usuário (Code.gs 4.2 ou mais novo; antes disso, ficam null)
        this.obsServidor = j.obs || null;
        this.perfil = j.perfil || null;
        this.nomePerfil = j.nomePerfil || (j.perfil === 'admin' ? 'Administrador' : j.perfil ? 'Consulta' : '');
        this.pendentes = j.pendentes || 0;   // pedidos de acesso esperando o administrador
        this.usuarios = j.usuarios || null;  // cadastro de acessos (só para o administrador; Code.gs 5.1)
        if (j.perfis) this.perfisNomes = j.perfis;
        // semanas gravadas dos Empenhos (Code.gs 4.4 ou mais novo; antes disso, null)
        this.semServidor = j.semanas || null;
        // Code.gs 5.4: só as semanas recentes vêm com o conteúdo; das outras, só a versão (busca ao abrir)
        this.semResumo = j.semanasResumo || null;
        this._semBuscando = {};
        // escalas mensais gravadas (Code.gs 4.5 ou mais novo; antes disso, null). Ao ler de novo, busca outra vez.
        this.escServidor = j.escalas || null;
        this._escCache = {};
        // Code.gs 5.10: as escalas dos meses que a tela vai abrir já vêm junto (a tela abre sem esperar)
        if (j.escalasDados && this.escServidor) Object.keys(j.escalasDados).forEach((m) => { this._escCache[m] = j.escalasDados[m] || null; });
        // Code.gs 4.7 ou mais novo: gravações nas planilhas, com versões (o site confere de tempos em tempos se alguém gravou)
        this.gravVersoes = (j.gravacoes || 0) >= 2;
        // Code.gs 4.8 ou mais novo: grava várias semanas num pedido só ("Gravar semanas alteradas")
        this.gravLote = (j.gravacoes || 0) >= 3;
        this.escLote = !!j.escalasLote;     // Code.gs 5.5: várias escalas num pedido só
        // Code.gs 5.8: cópia pública das semanas ({ semana: { versao, hash } }) e código do link (só administrador)
        this.pubResumo = j.publico || null;
        this.linkPublico = j.linkPublico || '';
        this.fonte = 'sheets';
        this.atualizadoEm = new Date(j.atualizadoEm || Date.now());
      } else {
        this.usarDemo();
      }
      return this;
    },
    // troca para os dados fictícios de demonstração
    usarDemo() {
      this.db = window.MOCK;
      this._regMap = null; this.fonte = 'mock'; this.arquivo = null; this.arquivos = {}; this.relatorio = null; this.relatorios = {}; this.avisos = []; this.info = [];
      this.ligadas = new Set(['efetivo', 'ferias', 'licencas', 'ddqod', 'viaturas', 'inundacoes', 'horas']);
      this.atualizadoEm = new Date();
      this._idx = new Map(this.todos().map((m) => [m.id, m]));
    },
    /* teste com arquivo .xlsx/.csv exportado da planilha (lido só no navegador) */
    usarArquivos(arqs) {
      const d = {}; Object.entries(arqs).forEach(([k, a]) => { d[k] = a.linhas; });
      this.aplicar(d, []);
      this.fonte = 'arquivo'; this.arquivos = arqs;
      this.arquivo = { nome: Object.values(arqs).map((a) => a.nome).join(', '), aba: Object.values(arqs).map((a) => a.aba).join(', ') };
      this.atualizadoEm = new Date();
    },
    /* converte as linhas recebidas (Apps Script ou arquivo) para o formato do painel */
    aplicar(d, avisosExtra) {
      const avisos = {};
      const ctx = { aviso: (t, i) => { (avisos[t] = avisos[t] || []).push(i + 2); }, acha: null };
      const qod = d.ddqod ? NORM.ddqod(d.ddqod, ctx) : [];
      const grupoDaObm = new Map(); qod.forEach((g) => g.obms.forEach((o) => grupoDaObm.set(o, g.chave)));
      ctx.grupoDaObm = grupoDaObm;
      const ef = d.efetivo ? NORM.efetivo(d.efetivo, ctx) : { militares: [], cursos: [] };
      const porBM = new Map(ef.militares.filter((m) => soDigitos(m.nBM)).map((m) => [soDigitos(m.nBM), m]));
      const porGuerra = new Map(), porGuerraObm = new Map(), porCompleto = new Map();
      ef.militares.forEach((m) => {
        const g = N(m.nomeGuerra);
        porGuerra.set(g, porGuerra.has(g) ? null : m); // nome de guerra repetido não serve para casar
        porGuerraObm.set(g + '|' + N(m.obm), m);
        porCompleto.set(N(m.guerraCompleto), m);
      });
      // nº BM só com os 6 primeiros dígitos (sem o dígito verificador), quando não há dois militares iguais
      const porBM6 = new Map();
      porBM.forEach((m, d) => { const k = d.slice(0, 6); porBM6.set(k, porBM6.has(k) ? null : m); });
      /* acha o militar de uma linha de outra planilha (férias, licenças, horas…).
         Com nº BM, o nº BM é a identidade: "Danilo", "danilo" e "Bruner" com o mesmo nº BM são a mesma pessoa,
         e um nome parecido nunca leva a um militar de outro nº BM. Sem nº BM, procura pelo nome. */
      ctx.acha = (bm, nome, obm) => {
        const d = soDigitos(bm);
        if (d) {
          const m = porBM.get(d) || (d.length >= 6 && porBM6.get(d.slice(0, 6)));
          if (m) return m;
          if (avulsos.has(d)) return melhoraNome(avulsos.get(d), nome);
        }
        const sem = N(String(nome || '').replace(RX_POSTO, ''));
        const porNome = porCompleto.get(N(nome)) || (obm && porGuerraObm.get(sem + '|' + N(obmCanon(obm)))) || porGuerra.get(sem) || null;
        if (porNome && d && soDigitos(porNome.nBM) && soDigitos(porNome.nBM) !== d) return null;   // outro nº BM: outra pessoa
        return porNome;
      };
      /* militar que aparece nas férias/licenças/horas mas não está no efetivo carregado (identificado pelo nº BM) */
      const avulsos = new Map(); ctx.avulsos = {};
      // mesmo nº BM escrito com outro nome: fica o nome mais completo (ex.: "Danilo Bruner Lopes" em vez de "danilo")
      const melhoraNome = (a, nomeNovo) => {
        const nome = txt(nomeNovo);
        if (!nome || RX_POSTO.test(nome) || nome.split(/\s+/).length <= String(a.nome).split(/\s+/).length) return a;
        const guerra = guerraDe('', nome);
        porCompleto.delete(N(a.guerraCompleto));
        Object.assign(a, { nome, nomeGuerra: guerra, guerraCompleto: `${a.posto} ${guerra}`.trim() });
        porCompleto.set(N(a.guerraCompleto), a);
        return a;
      };
      ctx.avulso = (o, origem) => {
        const posto = postoCanon(o.posto || String(o.guerra || '').match(RX_POSTO)?.[0] || '');
        const guerra = guerraDe(o.guerra, o.nome || o.guerra);
        const k = soDigitos(o.nBM) || N(o.guerra) + '|' + N(o.obm);
        if (avulsos.has(k)) return o.guerra ? avulsos.get(k) : melhoraNome(avulsos.get(k), o.nome);
        ctx.avulsos[origem] = (ctx.avulsos[origem] || 0) + 1;
        const m = militarVazio({ id: 'a' + (soDigitos(o.nBM) || slug(k)), avulso: true, nBM: txt(o.nBM), posto, classe: classeDe(posto), nome: txt(o.nome) || txt(o.guerra), nomeGuerra: guerra, guerraCompleto: txt(o.guerra) && RX_POSTO.test(txt(o.guerra)) ? txt(o.guerra) : `${posto} ${guerra}`.trim(), obm: obmCanon(o.obm) });
        avulsos.set(k, m); porCompleto.set(N(m.guerraCompleto), m);
        return m;
      };
      this.db = {
        militares: ef.militares, cursos: ef.cursos, qod,
        ferias: d.ferias ? NORM.ferias(d.ferias, ctx) : [],
        licencas: d.licencas ? NORM.licencas(d.licencas, ctx) : [],
        viaturas: d.viaturas ? NORM.viaturas(d.viaturas, ctx) : [],
        inundacoes: d.inundacoes ? NORM.inundacoes(d.inundacoes) : [],
      };
      this.db.horas = d.horas ? NORM.horas(d.horas, ctx) : [];
      // plantões no ciclo (aba RESUMO da planilha de horas)
      if (d.horasResumo && this.db.horas.length) NORM.plantoes(this.db.horas, d.horasResumo);
      this.db.registros = d.registros ? NORM.registros(d.registros) : null;
      this.db.avulsos = [...avulsos.values()];
      this.ligadas = new Set(Object.keys(d));
      this.avisos = Object.entries(avisos).map(([t, l]) => `${t}: ${l.length} linha(s) sem militar ou data reconhecidos (linhas ${l.slice(0, 8).join(', ')}${l.length > 8 ? '…' : ''})`).concat(avisosExtra || []);
      if (!ctx.duplicadas && this._repEfetivo) ctx.duplicadas = this._repEfetivo;   // o Apps Script já tirou as repetidas
      this.info = ctx.duplicadas ? [`Efetivo: ${ctx.duplicadas} resposta(s) repetida(s) do mesmo nº BM no formulário; o painel usa a mais recente de cada militar.`] : [];
      this._regMap = null;
      this.relatorio = ctx.relatorio || null;
      this.relatorios = { efetivo: ctx.relatorio || null, ferias: ctx.relFerias || null, ddqod: ctx.relDdqod || null, horas: ctx.relHoras || null, viaturas: ctx.relViaturas || null };
      this._idx = new Map(this.todos().map((m) => [m.id, m]));
    },
    ligada(k) { return this.ligadas.has(k); },

    /* ---------- efetivo ---------- */
    militares() { return this.db.militares; },
    /* efetivo + militares que só aparecem nas férias/horas */
    todos() { return this.db.militares.concat(this.db.avulsos || []); },
    horas() { return this.db.horas || []; },
    militar(id) { return this._idx.get(id); },
    // OBMs presentes no efetivo, na ordem de config.js
    obms() {
      const s = new Set(this.todos().map((m) => m.obm).filter(Boolean));
      return OBM_ORDEM.filter((o) => s.has(o)).concat([...s].filter((o) => !OBM_ORDEM.includes(o)).sort());
    },
    postos() { return [...new Set(this.todos().map((m) => m.posto).filter(Boolean))].sort((a, b) => (RANK[a] ?? 99) - (RANK[b] ?? 99)); },
    isSede(obm) { return SEDE.has(obm); },
    ordem(obm) { const i = OBM_ORDEM.indexOf(obm); return i < 0 ? 999 : i; },
    // ordena militares por OBM, posto e nome
    ordenar(lista) {
      return lista.slice().sort((a, b) => (this.ordem(a.obm) - this.ordem(b.obm)) || String(a.obm).localeCompare(b.obm) || ((RANK[a.posto] ?? 99) - (RANK[b.posto] ?? 99)) || String(a.nomeGuerra).localeCompare(b.nomeGuerra));
    },
    /** (Até 4.61 era a ordem dos Empenhos semanais: POSIÇÃO NO PEL antes do posto. Desde 4.62 os empenhos usam
        ordemAntiguidade, posto primeiro. Mantida para quem ainda a chame.) */
    ordemQuadro(a, b) {
      const posto = (RANK[a.posto] ?? 99) - (RANK[b.posto] ?? 99);
      const posicao = (a.posicaoPel ?? 999) - (b.posicaoPel ?? 999);
      const nome = String(a.nomeGuerra).localeCompare(b.nomeGuerra);
      const porPosto = (C.obms.ordemPorPosto || []).includes(a.obm) && (C.obms.ordemPorPosto || []).includes(b.obm);
      return porPosto ? posto || posicao || nome : posicao || posto || nome;
    },
    /** Antiguidade: 1º o posto/graduação (Cap, 1º Ten, 2º Ten, Asp, Sub Ten, 1º Sgt, 2º Sgt, 3º Sgt, Cb, Sd);
        no mesmo posto, a coluna POSIÇÃO NO PEL, a posição no almanaque e o nome. Usada na Geral, na Escala mensal,
        nos Empenhos semanais (e no link público) e na ordem de antiguidade das Horas excedentes. */
    /* ---------- pilotos de embarcação de serviço ----------
       Habilitação náutica do militar num dia: null (não é condutor), 'ok' ou 'vencida' (validade anterior
       ao dia). Sem data de validade na planilha conta como em dia. */
    pilotoEmb(m, iso) {
      if (!m || !m.embarcacao) return null;
      const v = m.embarcacao.validade;
      return v && v < iso ? 'vencida' : 'ok';
    },
    /** Entre os militares disponíveis no dia: { tom, ok: [m], vencidos: [m] }.
        tom 'bad' = nenhum piloto; 'warn' = só piloto(s) com habilitação vencida; '' = tudo certo. */
    avaliaPilotos(ms, iso) {
      const ok = [], vencidos = [];
      ms.forEach((m) => { const s = this.pilotoEmb(m, iso); if (s === 'ok') ok.push(m); else if (s === 'vencida') vencidos.push(m); });
      return { tom: ok.length ? '' : vencidos.length ? 'warn' : 'bad', ok, vencidos };
    },

    ordemAntiguidade(a, b) {
      return ((RANK[a.posto] ?? 99) - (RANK[b.posto] ?? 99)) || ((a.posicaoPel ?? 999) - (b.posicaoPel ?? 999))
        || ((a.almanaque ?? 1e9) - (b.almanaque ?? 1e9)) || String(a.nomeGuerra).localeCompare(b.nomeGuerra);
    },
    guerra(m) { return m.guerraCompleto || `${m.posto} ${m.nomeGuerra}`; },
    cursos() { return this.db.cursos; },

    /* ---------- férias e licenças ---------- */
    ferias() { return this.db.ferias; },
    feriasEm(data) { const d = iso(data); return this.db.ferias.filter((f) => f.inicio <= d && f.fim >= d); },
    licencas() { return this.db.licencas; },
    licencasEm(data) { const d = iso(data); return this.db.licencas.filter((f) => f.inicio <= d && f.fim >= d); },
    // só licenças (afastam do serviço); dispensas restringem atividades, mas o militar segue no serviço
    afastadosEm(data) { return this.licencasEm(data).filter((f) => f.categoria !== 'Dispensa'); },
    dispensadosEm(data) { return this.licencasEm(data).filter((f) => f.categoria === 'Dispensa'); },

    /* ---------- DDQOD ---------- */
    ddqod() {
      return this.db.qod.map((g) => {
        const ORDEM = ['Cb/Sd', 'St/Sgt', 'Ten', 'Cap'];
        const linhas = Object.keys(g.prev).sort((a, b) => ((ORDEM.indexOf(a) + 1) || 99) - ((ORDEM.indexOf(b) + 1) || 99)).map((c) => {
          const exist = g.exist && g.exist[c] != null ? g.exist[c] : this.db.militares.filter((m) => m.grupo === g.chave && m.classe === c).length;
          return { classe: c, previsto: g.prev[c], existente: exist, claro: g.prev[c] - exist };
        });
        const prev = linhas.reduce((s, l) => s + l.previsto, 0), ex = linhas.reduce((s, l) => s + l.existente, 0);
        return { chave: g.chave, grupo: g.grupo, linhas, previsto: prev, existente: ex, claro: prev - ex, claroPct: prev ? (prev - ex) / prev : 0 };
      });
    },

    viaturas() { return this.db.viaturas; },
    inundacoes() { return this.db.inundacoes; },

    // busca global do topo (nome, guerra, nº BM ou OBM)
    busca(q) {
      const n = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const t = n(q).trim(); if (!t) return [];
      return this.db.militares.filter((m) => n(m.nome + ' ' + m.nomeGuerra + ' ' + m.nBM + ' ' + m.obm).includes(t)).slice(0, 8);
    },

    /* exposto para testes */
    _NORM: NORM,
  };

  window.DS = DS;
})();
