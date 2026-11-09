/* ==========================================================================
   DADOS › REGISTROS — lançamentos feitos no próprio painel
   (status e observações dos Empenhos semanais, quadros de Observações) e fotos.
   Ligado ao Apps Script: lidos da aba EMPENHOS_REGISTROS e gravados por ele.
   Demonstração / teste com arquivo: guardados só neste navegador (PREFS).
   Acrescenta métodos ao DS (dados/ds.js).
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const { iso, soDigitos } = DADOS.util;

  Object.assign(DS, {
  /* ---------- lançamentos da tabela de empenhos ----------
     Ligado ao Apps Script: lidos da aba EMPENHOS_REGISTROS e gravados por ele.
     Demonstração / teste com arquivo: guardados só neste navegador. */
  chaveMil(m) { return soDigitos(m.nBM) || m.id; },
  regLocal() { return this.fonte !== 'sheets' || !this.ligada('registros'); },
  _regMap: null,
  _carregaReg() {
    if (this._regMap && this._regFonte === this.fonte) return this._regMap;
    let lista = [];
    if (!this.regLocal()) lista = this.db.registros || [];
    else lista = PREFS.lerJSON('empenhos-v1', []);
    this._regMap = new Map(lista.map((r) => [`${r.data}|${r.tipo}|${r.bm || ''}`, r]));
    this._regFonte = this.fonte;
    return this._regMap;
  },
  reg(data, tipo, bm) { return this._carregaReg().get(`${data}|${tipo}|${bm || ''}`) || null; },
  /* observações de tela (ex.: quadro de observações do DDQOD): tipo 'obs', BM = chave da tela */
  /* ---------- semanas gravadas (Empenhos semanais) ----------
     "Gravar semana" guarda a composição de cada dia (quem estava em cada pelotão/ala/reforço,
     com nome, posto, OBM e credenciamento daquele momento), os lançamentos e a observação do dia.
     Semanas gravadas não mudam quando um militar troca de pelotão depois.
     Com o Apps Script: guardadas na planilha (aba GRAVA EMPENHOS), valem para todos e só o administrador grava.
     Em demonstração: só neste navegador (PREFS 'semanas-v1').
     Várias pessoas ao mesmo tempo: cada gravação diz de qual versão partiu (base). Se outra pessoa
     gravou depois, o Apps Script responde { conflito, atual } e nada é gravado por cima. */
  semanasCompartilhadas() { return this.fonte === 'sheets' && !!this.semServidor; },
  podeGravarSemana() { return this.perfil ? this.perfil === 'admin' : !this.semanasCompartilhadas(); },
  // lido do navegador uma vez só e guardado em memória (a tela consulta isto milhares de vezes
  // a cada desenho; ler e decifrar o texto guardado a cada consulta deixava a tela lenta)
  _semCache: null,
  _semLocais() { return this._semCache || (this._semCache = PREFS.lerJSON('semanas-v1', {}) || {}); },
  gravacao(seg) {
    if (!this.semanasCompartilhadas()) return this._semLocais()[seg] || null;
    const g = this.semServidor[seg];
    if (!g && this.faltaSemana(seg)) this.carregaSemanas([seg]).then((ok) => { if (ok && this.aoCarregarSemana) this.aoCarregarSemana(); });
    return g || null;
  },
  /* semanas antigas (Code.gs 5.4): só o resumo veio na abertura; o conteúdo é buscado quando precisa */
  faltaSemana(seg) { return !!(this.semanasCompartilhadas() && this.semResumo && this.semResumo[seg] && !this.semServidor[seg]); },
  /** a semana está gravada? (sem precisar do conteúdo; para as marcas ✓) */
  semanaGravada(seg) { return !!(this.gravacaoCarregada(seg) || (this.semanasCompartilhadas() && this.semResumo && this.semResumo[seg])); },
  gravacaoCarregada(seg) { return (this.semanasCompartilhadas() ? this.semServidor : this._semLocais())[seg] || null; },
  /** busca o conteúdo das semanas que faltam; devolve true se trouxe alguma */
  async carregaSemanas(segs) {
    const faltam = segs.filter((s) => this.faltaSemana(s) && !this._semBuscando[s]);
    if (!faltam.length) return false;
    faltam.forEach((s) => { this._semBuscando[s] = true; });
    try {
      const rs = await Promise.all(faltam.map((seg) => DADOS.pedirApi({ acao: 'semana', seg }).then((j) => [seg, j.semana || null])));
      rs.forEach(([seg, g]) => { if (g) this.semServidor[seg] = g; else delete this.semResumo[seg]; });
      return true;
    } catch (e) { return false; } finally { faltam.forEach((s) => { delete this._semBuscando[s]; }); }
  },
  /** versão gravada que a tela está mostrando (0 = semana não gravada) */
  versaoSemana(seg) { const g = this.gravacaoCarregada(seg) || (this.semResumo && this.semResumo[seg]); return g ? g.versao || 0 : 0; },
  /** troca a gravação conhecida da semana pela mais nova (vinda do Apps Script) */
  trocaGravacao(seg, g) {
    if (!this.semServidor) return;
    if (g) this.semServidor[seg] = g; else delete this.semServidor[seg];
    if (this.semResumo) { if (g) this.semResumo[seg] = { versao: g.versao, gravadoEm: g.gravadoEm, por: g.por }; else delete this.semResumo[seg]; }
  },
  /** Grava a semana. Devolve a gravação, ou { conflito: true, atual } se outra pessoa gravou depois da versão "base". */
  async gravarSemana(seg, semana, base) {
    if (this.semanasCompartilhadas()) {
      const j = await DADOS.pedirApi({ acao: 'gravarSemana', seg, semana, base });
      if (j.conflito) return { conflito: true, atual: j.atual || null };
      if (!j.salvo || !j.semana) throw new Error('o Apps Script publicado ainda não grava semanas (publique o Code.gs 4.7)');
      this.trocaGravacao(seg, j.semana);
      this.publicaDepois([seg]);   // página pública dos empenhos
      return j.semana;
    }
    const n = new Date(), todas = this._semLocais();
    todas[seg] = { ...semana, versao: ((todas[seg] && todas[seg].versao) || 0) + 1, gravadoEm: `${iso(n)} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`, por: 'este navegador' };
    PREFS.gravarJSON('semanas-v1', todas);
    return todas[seg];
  },
  /** Grava várias semanas num pedido só (Code.gs 4.8). itens: [{ seg, semana, base }].
      Devolve [{ seg, semana } ou { seg, conflito: true, atual }]. */
  async gravarSemanasLote(itens) {
    const j = await DADOS.pedirApi({ acao: 'gravarSemanas', itens });
    if (!Array.isArray(j.resultados)) throw new Error('o Apps Script publicado ainda não grava várias semanas de uma vez (publique o Code.gs 4.8)');
    j.resultados.forEach((r) => { if (r.salvo && r.semana) this.trocaGravacao(r.seg, r.semana); });
    this.publicaDepois(j.resultados.filter((r) => r.salvo).map((r) => r.seg));
    return j.resultados;
  },
  /** Desfaz a gravação da semana (ela volta a ser montada com o efetivo atual, sem ✓).
      Se outra pessoa gravou a semana depois do que esta tela mostra, não desfaz: devolve { conflito, atual }. */
  async apagarSemana(seg) {
    if (this.semanasCompartilhadas()) {
      const j = await DADOS.pedirApi({ acao: 'apagarSemana', seg, base: this.versaoSemana(seg) });
      if (j.conflito) { this.trocaGravacao(seg, j.atual || null); return { conflito: true, atual: j.atual || null }; }
      if (!j.apagado) throw new Error('o Apps Script publicado ainda não desfaz a gravação da semana (publique o Code.gs 4.7)');
      this.trocaGravacao(seg, null);
      return { apagado: true };
    }
    const todas = this._semLocais();
    delete todas[seg];
    PREFS.gravarJSON('semanas-v1', todas);
    return { apagado: true };
  },
  /** Lançamentos deste navegador que mexem no mesmo militar/dia que outra pessoa mudou entre as
      gravações "antes" e "agora" e ficaram diferentes: [{ r (lançamento), dia, deles, meu }] */
  conflitosSemana(antes, agora, isos) {
    const lanc = (g, dia, k) => { const x = g && g.dias && g.dias[dia]; return x && x.lanc && x.lanc[k] ? [x.lanc[k][0] || '', x.lanc[k][1] || ''] : ['', '']; };
    const obsDia = (g, dia) => (g && g.dias && g.dias[dia] && g.dias[dia].obsDia) || '';
    const out = [];
    this.regsPendentes(isos).forEach((r) => {
      if (r.tipo === 'status') {
        const a = lanc(antes, r.data, r.bm), b = lanc(agora, r.data, r.bm), meu = [r.status || '', r.obs || ''];
        if (a.join('|') !== b.join('|') && b.join('|') !== meu.join('|')) out.push({ r, dia: r.data, deles: b, meu });
      } else if (r.tipo === 'obsdia') {
        const a = obsDia(antes, r.data), b = obsDia(agora, r.data);
        if (a !== b && b !== (r.obs || '')) out.push({ r, dia: r.data, deles: ['', b], meu: ['', r.obs || ''] });
      }
    });
    return out;
  },
  /** tira deste navegador um lançamento ainda não gravado (fica valendo o que a outra pessoa gravou) */
  descartaPendente(r) {
    if (!this.regLocal()) return;
    const mapa = this._carregaReg();
    mapa.delete(`${r.data}|${r.tipo}|${r.bm || ''}`);
    PREFS.gravarJSON('empenhos-v1', [...mapa.values()]);
  },
  /** lançamentos ainda não gravados nestes dias (só os guardados neste navegador) */
  regsPendentes(isos) {
    if (!this.regLocal()) return [];
    return [...this._carregaReg().values()].filter((r) => isos.includes(r.data) && ['status', 'reforco', 'obsdia'].includes(r.tipo));
  },
  /** semanas (segunda-feira aaaa-mm-dd) com lançamentos ainda não gravados neste navegador, em ordem.
      Um lançamento com "Termina em" (ex.: DSP de 06/11 a 18/11) cai em várias semanas. */
  semanasPendentes() {
    if (!this.regLocal()) return [];
    const segs = new Set();
    this._carregaReg().forEach((r) => {
      if (!['status', 'reforco', 'obsdia'].includes(r.tipo) || !/^\d{4}-\d{2}-\d{2}$/.test(r.data)) return;
      const d = DADOS.util.parse(r.data); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      segs.add(iso(d));
    });
    return [...segs].sort();
  },
  /** apaga deste navegador os lançamentos destes dias (depois de gravar ou ao limpar a semana) */
  limpaRegsLocais(isos) {
    if (!this.regLocal()) return;
    const mapa = this._carregaReg();
    [...mapa.entries()].forEach(([k, r]) => { if (isos.includes(r.data) && ['status', 'reforco', 'obsdia'].includes(r.tipo)) mapa.delete(k); });
    PREFS.gravarJSON('empenhos-v1', [...mapa.values()]);
  },

  /* ---------- quadros de Observações ----------
     Com o Apps Script 4.2+: guardadas nele, valem para todos e só o administrador altera.
     Antes disso (ou em demonstração): aba EMPENHOS_REGISTROS ou este navegador. */
  obsCompartilhadas() { return this.fonte === 'sheets' && !!this.obsServidor; },
  podeEditarObs() { return this.perfil ? this.perfil === 'admin' : !this.obsCompartilhadas(); },
  obsTela(tela) {
    if (this.obsCompartilhadas()) {
      const o = this.obsServidor[tela];
      return o ? { obs: o.texto, status: o.quando, por: o.por } : null;
    }
    return this.reg('2000-01-01', 'obs', tela);
  },
  async salvarObsTela(tela, texto) {
    if (this.obsCompartilhadas()) {
      const j = await DADOS.pedirApi({ acao: 'salvarObs', tela, texto });
      if (!j.salvo) throw new Error('o Apps Script publicado ainda não grava observações (publique o Code.gs 4.2)');
      if (j.obs) this.obsServidor[tela] = j.obs; else delete this.obsServidor[tela];
      return;
    }
    return this._salvarObsLocal(tela, texto);
  },
  _salvarObsLocal(tela, texto) {
    const n = new Date(), quando = `${iso(n)} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
    return this.salvarReg(texto.trim() ? { data: '2000-01-01', tipo: 'obs', bm: tela, militar: 'Observações ' + tela.toUpperCase(), status: quando, obs: texto.trim() } : { data: '2000-01-01', tipo: 'obs', bm: tela, apagar: true });
  },
  regDoDia(data, tipo) { return [...this._carregaReg().values()].filter((r) => r.data === data && r.tipo === tipo); },
  async salvarReg(r) {
    const mapa = this._carregaReg(), k = `${r.data}|${r.tipo}|${r.bm || ''}`;
    if (!this.regLocal()) await DADOS.pedirApi({ acao: 'salvarRegistro', registro: r });
    if (r.apagar) mapa.delete(k); else mapa.set(k, { data: r.data, tipo: r.tipo, bm: r.bm || '', militar: r.militar || '', status: r.status || '', obs: r.obs || '' });
    if (this.regLocal()) PREFS.gravarJSON('empenhos-v1', [...mapa.values()]);
  },

  /* ---------- fotos ----------
     1º tenta o link de miniatura direto (funciona se o arquivo estiver compartilhado);
     se falhar, pede ao Apps Script, que lê a foto com a conta do dono da planilha. */
  _fotos: new Map(),
  fotoApi(m) {
    const id = ((m && m.foto) || '').match(/[?&]id=([\w-]{20,})/);
    if (!id || C.fonteDados !== 'sheets') return Promise.resolve(null);
    if (!this._fotos.has(id[1])) this._fotos.set(id[1], DADOS.pedirApi({ acao: 'foto', id: id[1] }).then((j) => j.foto || null).catch(() => null));
    return this._fotos.get(id[1]);
  },
  });
})();
