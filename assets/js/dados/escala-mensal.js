/* ==========================================================================
   DADOS › ESCALA MENSAL — onde ficam as escalas (aba "Escala mensal")
   Cada mês tem:
     - a versão GRAVADA (Gravar versão nº…): com o Apps Script, fica na planilha (aba GRAVA ESCALA)
       e vale para todos; só o administrador grava. Em demonstração, fica só neste navegador
       (PREFS 'escalas-v1');
     - um RASCUNHO com as alterações ainda não gravadas, sempre neste navegador
       (PREFS 'escala-rasc-v1'), até gravar ou descartar.
   Várias pessoas ao mesmo tempo: a gravação diz de qual versão o rascunho partiu (base). Se outra
   pessoa gravou depois, o Apps Script não grava por cima (responde { conflito, atual }) e a tela
   junta as alterações das duas (ESC.junta) e grava de novo.
   Acrescenta métodos ao DS (dados/ds.js).
   ========================================================================== */
(function () {
  const { iso } = DADOS.util;
  const pad = (n) => String(n).padStart(2, '0');
  const agora = () => { const n = new Date(); return `${iso(n)} ${pad(n.getHours())}:${pad(n.getMinutes())}`; };

  Object.assign(DS, {
    /** Gravação vale para todos (Apps Script 4.5 ou mais novo publicado)? */
    escalasCompartilhadas() { return this.fonte === 'sheets' && !!this.escServidor; },
    /** Pode alterar e gravar? (com gravação compartilhada, só o administrador) */
    podeEditarEscala() { return this.perfil ? this.perfil === 'admin' : !this.escalasCompartilhadas(); },

    // gravadas neste navegador (lidas uma vez e guardadas em memória)
    _escLocal: null,
    _escLocais() { return this._escLocal || (this._escLocal = PREFS.lerJSON('escalas-v1', {}) || {}); },
    // gravadas no Apps Script já buscadas: mês → escala (ou null)
    _escCache: {},

    /** Já dá para saber a escala gravada do mês sem pedir ao Apps Script? */
    escalaPronta(mes) { return !this.escalasCompartilhadas() || mes in this._escCache || !this.escServidor[mes]; },
    /** Busca no Apps Script a escala gravada do mês (se ainda não buscou). */
    async carregaEscala(mes) { return this.carregaEscalas([mes]); },
    /* Busca as escalas gravadas que faltam (Code.gs 5.5: todas num pedido só). Um mês que já está
       sendo buscado (ex.: pela pré-carga logo depois do login) não é pedido de novo: espera o mesmo. */
    _escBuscando: {},
    async carregaEscalas(meses) {
      meses = [...new Set(meses)];
      const novos = meses.filter((m) => !this.escalaPronta(m) && !this._escBuscando[m]);
      if (novos.length) {
        const p = (this.escLote
          ? DADOS.pedirApi({ acao: 'escalas', meses: novos }).then((j) => { novos.forEach((m) => { this._escCache[m] = (j.escalas || {})[m] || null; }); })
          : Promise.all(novos.map((m) => DADOS.pedirApi({ acao: 'escala', mes: m }).then((j) => { this._escCache[m] = j.escala || null; }))))
          .finally(() => novos.forEach((m) => { delete this._escBuscando[m]; }));
        novos.forEach((m) => { this._escBuscando[m] = p; });
      }
      await Promise.all(meses.map((m) => this._escBuscando[m]).filter(Boolean));
    },
    /** Meses da escala que a tela abre primeiro: o atual, o da escala (a partir do dia 10 é o seguinte),
        o anterior e o próximo. Vão no pedido dos dados (Code.gs 5.10) e já chegam junto com o login. */
    mesesEscalaInicio() {
      try {
        if (!window.ESC) return [];
        const m = ESC.mesPadrao(), hoje = ESC.mesDe(this.hoje());
        return [...new Set([ESC.somaMes(m, -1), hoje, m, ESC.somaMes(m, 1)])];
      } catch (e) { return []; }
    },
    /* pré-carga, em segundo plano, do que não veio junto com os dados (Apps Script anterior ao 5.10) */
    preCarregaEscalas() {
      if (!this.escalasCompartilhadas() || !window.ESC) return;
      this.carregaEscalas(this.mesesEscalaInicio()).catch(() => { /* a tela tenta de novo ao abrir */ });
    },
    /** Escala gravada do mês (última versão) ou null. Chame carregaEscala antes, com o Apps Script. */
    escalaGravada(mes) {
      if (!this.escalasCompartilhadas()) return this._escLocais()[mes] || null;
      return this._escCache[mes] || null;
    },
    /** Resumo da gravação do mês sem precisar buscar a escala: { versao, gravadoEm, por } ou null */
    escalaResumo(mes) {
      const g = this.escalasCompartilhadas() ? this.escServidor[mes] || this._escCache[mes] : this._escLocais()[mes];
      return g ? { versao: g.versao, gravadoEm: g.gravadoEm, por: g.por } : null;
    },

    /* rascunho (alterações ainda não gravadas), sempre neste navegador */
    escalaRascunho(mes) { return (PREFS.lerJSON('escala-rasc-v1', {}) || {})[mes] || null; },
    salvaRascunhoEscala(mes, doc) {
      const todos = PREFS.lerJSON('escala-rasc-v1', {}) || {};
      if (doc) todos[mes] = doc; else delete todos[mes];
      PREFS.gravarJSON('escala-rasc-v1', Object.keys(todos).length ? todos : null);
    },

    /** versão gravada de que o rascunho (ou a escala na tela) partiu: 0 = nenhuma */
    baseEscala(doc) { return doc && doc._base != null ? doc._base : (doc && doc.versao) || 0; },
    /** Busca no Apps Script a escala que vale agora no mês (ou uma versão antiga) e atualiza o que a tela sabe. */
    async buscaEscala(mes, versao) {
      if (!this.escalasCompartilhadas()) return versao ? null : this.escalaGravada(mes);
      const j = await DADOS.pedirApi(versao ? { acao: 'escala', mes, versao } : { acao: 'escala', mes });
      const g = j.escala || null;
      if (!versao) {
        this._escCache[mes] = g;
        if (g) this.escServidor[mes] = { versao: g.versao, gravadoEm: g.gravadoEm, por: g.por }; else delete this.escServidor[mes];
      }
      return g;
    },

    /** Grava nova versão da escala do mês e apaga o rascunho. Devolve a escala gravada,
        ou { conflito: true, atual } se outra pessoa gravou depois da versão "base". */
    async gravarEscala(mes, doc, base) {
      let g;
      doc = { ...doc }; delete doc._base;
      if (this.escalasCompartilhadas()) {
        const j = await DADOS.pedirApi({ acao: 'gravarEscala', mes, escala: doc, base: base == null ? 0 : base });
        if (j.conflito) return { conflito: true, atual: j.atual || null };
        if (!j.salvo || !j.escala) throw new Error('o Apps Script publicado ainda não grava escalas (publique o Code.gs 4.7)');
        g = j.escala;
        this._escCache[mes] = g;
        this.escServidor[mes] = { versao: g.versao, gravadoEm: g.gravadoEm, por: g.por };
      } else {
        const todas = this._escLocais(), ant = todas[mes];
        const semAnt = (x) => { const y = { ...x }; delete y.anteriores; return y; };
        // guarda as 5 versões anteriores (para "Excluir versão" voltar à anterior)
        const anteriores = ant ? [semAnt(ant), ...(ant.anteriores || [])].slice(0, 5) : [];
        g = { ...semAnt(doc), mes, versao: ((ant && ant.versao) || 0) + 1, gravadoEm: agora(), por: 'este navegador', anteriores };
        todas[mes] = g;
        PREFS.gravarJSON('escalas-v1', todas);
      }
      this.salvaRascunhoEscala(mes, null);
      return g;
    },

    /** Exclui a última versão gravada do mês: volta para a anterior (ou fica sem versão gravada).
        Se outra pessoa gravou uma versão mais nova do que a da tela, não exclui (a dela) e avisa. */
    async excluirVersaoEscala(mes) {
      if (this.escalasCompartilhadas()) {
        const vista = this.escServidor[mes] ? this.escServidor[mes].versao : 0;
        const j = await DADOS.pedirApi({ acao: 'apagarEscala', mes, base: vista });
        if (j.conflito) {
          if (j.atual) this.escServidor[mes] = j.atual; else delete this.escServidor[mes];
          delete this._escCache[mes];
          throw Object.assign(new Error(`Outra pessoa gravou uma versão mais nova${j.atual && j.atual.gravadoEm ? ` às ${j.atual.gravadoEm.slice(11, 16)}` : ''}. Nada foi excluído; a tela foi atualizada. Confira antes de excluir.`), { conflito: true });
        }
        if (!('restante' in j)) throw new Error('o Apps Script publicado ainda não exclui versões (publique o Code.gs 4.7)');
        if (j.restante) this.escServidor[mes] = j.restante; else delete this.escServidor[mes];
        delete this._escCache[mes];
        await this.carregaEscala(mes);
        return;
      }
      const todas = this._escLocais(), g = todas[mes];
      if (!g) return;
      const ant = g.anteriores || [];
      if (ant.length) todas[mes] = { ...ant[0], anteriores: ant.slice(1) }; else delete todas[mes];
      PREFS.gravarJSON('escalas-v1', todas);
    },
  });
})();
