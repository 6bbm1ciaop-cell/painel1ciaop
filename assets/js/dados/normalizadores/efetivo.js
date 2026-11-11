/* ==========================================================================
   NORMALIZADOR — EFETIVO (planilha Respostas)
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { iso, RANK, OBM_ORDEM, N, vazio, leitor, dataISO, dataHoraISO, simNao, int, num, txt, frase, titulo, soDigitos, postoCanon, classeDe, obmCanon, guerraDe, fotoUrl, slug, util, nauticas } = DADOS.util;

  /* EFETIVO — planilha "Respostas", aba "Respostas ao formulário 1" (formulário do efetivo).
     Cada militar pode ter respondido mais de uma vez: vale a resposta mais recente por nº BM. */
  DADOS.NORM.efetivo = function (linhas, ctx) {
    const c = leitor(linhas);
    const cursosMap = new Map();
    const porId = new Map();
    // embarcação: coluna escolhida manualmente na tela "Condutores de embarcação" (vale neste navegador)
    const EMB = {
      resp: ['É CONDUTOR DE EMBARCAÇÕES', 'É CONDUTOR DE EMBARCAÇÕES?', 'CONDUTOR DE EMBARCAÇÃO', '~CONDUTOR EMBARCAC', '~HABILITAD EMBARCAC', '~POSSUI HABILITAC NAUTIC', '~ARRAIS'],
      hab: ['CURSO/HABILITAÇÃO', 'HABILITAÇÃO NÁUTICA', '~CURSO HABILITAC EMBARCAC', '~HABILITAC NAUTIC', '~CATEGORIA EMBARCAC', '~CURSO HABILITAC'],
      reg: ['Nº DO REGISTRO DA HABILITAÇÃO PARA CONDUZIR EMBARCAÇÕES', 'Nº DO REGISTRO DA HABILITAÇÃO', '~REGISTRO EMBARCAC', '~REGISTRO NAUTIC', '~REGISTRO HABILITAC', 'Nº DA CHA', 'NÚMERO DA CHA', 'CHA'],
      val: ['VALIDADE DA HABILITAÇÃO PARA CONDUZIR EMBARCAÇÕES', 'VALIDADE DA HABILITAÇÃO', '~VALIDADE EMBARCAC', '~VALIDADE NAUTIC', '~VALIDADE HABILITAC', 'VALIDADE DA CHA', 'VALIDADE CHA'],
    };
    const embManual = PREFS.lerJSON('colunas-emb', {}) || {};
    const colEmb = (campo) => {
      const h = embManual[campo];
      if (h === '-') return '';
      if (h && c.titulos.includes(h)) return h;
      return linhas.length ? (c(linhas[0], ...EMB[campo]), c.mapa[EMB[campo].join('|')] || '') : '';
    };
    const embCols = { resp: colEmb('resp'), hab: colEmb('hab'), reg: colEmb('reg'), val: colEmb('val') };
    const lerEmb = (r, campo) => { const h = embCols[campo]; const v = h ? r[h] : ''; return v == null ? '' : typeof v === 'string' ? v.trim() : v; };
    linhas.forEach((r, i) => {
      const nome = txt(c(r, 'NOME DO MILITAR', 'NOME COMPLETO', 'NOME'));
      if (!nome) return;
      const posto = postoCanon(c(r, 'POSTO/GRADUAÇÃO', 'POSTO GRADUACAO', 'POSTO'));
      const obm = obmCanon(c(r, 'OBM', 'FRAÇÃO', 'LOTAÇÃO'));
      const nBM = txt(c(r, 'NÚMERO DE BM', 'NUMERO BM', 'Nº BM'));
      const cursosTxt = txt(c(r, 'POSSUI QUAL(IS) CURSO(S)', 'CURSOS DE QUALIFICAÇÃO', 'CURSOS'));
      // cada curso: "SIGLA (descrição)" ou "SIGLA (descrição) complemento" (ex.: "CSV (Salvamento veicular) II").
      // O nome final de cada curso é definido depois de ler todas as respostas (nomeCurso), para separar
      // cursos de mesma sigla e descrições diferentes (BREC × BREC Avançado, CSV I × CSV II).
      const cursos = cursosTxt ? cursosTxt.split(/[,;](?![^()]*\))/).map((x) => x.trim()).filter((x) => !vazio(x)).map((item) => {
        const mm = item.match(/^(.*?)\s*\((.*)\)\s*(.*)$/);
        const sigla = (mm ? `${mm[1]} ${mm[3]}` : item).replace(/\s+/g, ' ').trim().toUpperCase();
        const desc = mm ? mm[2].trim() : '';
        if (!cursosMap.has(sigla)) cursosMap.set(sigla, new Map());
        if (desc && !cursosMap.get(sigla).has(N(desc))) cursosMap.get(sigla).set(N(desc), desc);
        return { sigla, desc };
      }) : [];
      // coluna CB "NOME DE GUERRA" (já com posto) tem prioridade sobre BZ "Nome de Guerra"
      const guerraCB = txt(c(r, 'NOME DE GUERRA'));
      const guerraBZ = txt(c(r, 'Nome de Guerra', 'GUERRA'));
      const nomeGuerra = guerraDe(guerraCB || guerraBZ, nome);
      // embarcação — colunas AP a AS da planilha Respostas
      const embResp = lerEmb(r, 'resp');
      const condutorEmb = simNao(embResp);
      const hab = util(lerEmb(r, 'hab'));
      const embNaut = nauticas(hab).concat(nauticas(embResp)).filter((v, k, a) => a.indexOf(v) === k);
      const embOutros = hab && !embNaut.length ? hab : '';   // ex.: "Transporte de produtos perigosos" — não é habilitação náutica
      const embReg = util(lerEmb(r, 'reg'));
      const embValTxt = lerEmb(r, 'val');
      // validade: aceita dd/mm/aaaa, mm/aaaa (vira o último dia do mês) e número de série de data do Sheets/Excel
      const serial = /^\d{5}$/.test(String(embValTxt).trim()) ? iso(new Date(1899, 11, 30 + +String(embValTxt).trim())) : '';
      const mesAno = String(embValTxt).trim().match(/^(\d{1,2})\/(\d{4})$/);
      const embVal = dataISO(embValTxt) || (mesAno ? dataISO(`${new Date(+mesAno[2], +mesAno[1], 0).getDate()}/${mesAno[1]}/${mesAno[2]}`) : '') || serial;
      const arma = (n) => ({ desc: txt(c(r, 'DESCRIÇÃO DO ARMAMENTO - ' + n)), reg: txt(c(r, 'Nº DO REGISTRO DO ARMAMENTO - ' + n)) });
      const possuiArma = simNao(c(r, 'POSSUI ARMAMENTO'));
      const inclusao = dataISO(c(r, 'DATA DE INCLUSÃO NO CBMMG', 'DATA DE INCLUSÃO'));
      const nascimento = dataISO(c(r, 'DATA DE NASCIMENTO', 'NASCIMENTO'));
      const cpf = txt(c(r, 'CPF'));
      const m = {
        // identidade: o nº BM; sem ele (4.78), o nome — não muda quando as linhas da planilha mudam de ordem
        id: 'm' + (soDigitos(nBM) || 'n-' + (slug(nome || nomeGuerra) || 'x' + i)),
        respondidoEm: dataHoraISO(c(r, 'Carimbo de data/hora', 'CARIMBO DE DATA HORA', 'DATA/HORA')),
        nBM, posto, classe: classeDe(posto), nome, nomeGuerra,
        guerraCompleto: guerraCB || `${posto} ${nomeGuerra}`,
        obm, grupo: ctx.grupoDaObm.get(obm) || slug(obm),
        posicaoPel: int(c(r, 'POSIÇÃO NO PEL')) || null,
        foto: fotoUrl(c(r, 'FOTO', 'LINK DA FOTO')),
        inclusao, nascimento,
        almanaque: int(c(r, 'POSIÇÃO NO ALMANAQUE', 'ALMANAQUE')) || null,
        idade: int(c(r, 'IDADE')) || null,
        tempoServico: num(c(r, 'TEMPO DE SERVIÇO')),
        formacao: txt(c(r, 'CURSO DE FORMAÇÃO/APERFEIÇOAMENTO', 'CURSO DE FORMAÇÃO')),
        cursos,
        cnh: txt(c(r, 'CATEGORIA DA CNH', 'CAT CNH')).toUpperCase() || '-',
        cnhRegistro: txt(c(r, 'Nº DE REGISTRO DA CNH', 'REGISTRO DA CNH')),
        cnhValidade: dataISO(c(r, 'VALIDADE DA CNH')),
        motorista: simNao(c(r, 'MOTORISTA CREDENCIADO')),
        credenciado: txt(c(r, 'CREDENCIADO EM QUAL(IS) CATEGORIA(S)', 'CREDENCIADO EM', 'CRED CATEGORIA')).toUpperCase() || '-',
        cve: simNao(c(r, 'CURSO PARA CONDUTORES DE VEÍCULOS DE EMERGÊNCIA (CVE)', 'CURSO PARA CONDUTORES', 'CURSO PARA CONDUTOR', 'POSSUI CVE')),
        condutorEmbarcacao: condutorEmb,
        // é condutor quem tem habilitação náutica (Motonauta, Arrais-Amador, ETSP…) ou respondeu "Sim" sem informar outro curso
        embarcacao: embNaut.length || (condutorEmb === true && !hab)
          ? { hab: embNaut.join(' / ') || 'Não informada', habs: embNaut.length ? embNaut : ['Não informada'], outros: embOutros, registro: embReg, validade: embVal, validadeTxt: embVal ? '' : txt(embValTxt), declarou: condutorEmb } : null,
        embResposta: txt(embResp),
        tipoSanguineo: txt(c(r, 'TIPO SANGUÍNEO COM FATOR RH', 'TIPO SANGUÍNEO', 'FATOR RH')).toUpperCase().replace(/\s+/g, ''),
        municipio: titulo(txt(c(r, 'MUNICÍPIO'))),
        contato: {
          celular: txt(c(r, 'CELULAR DO MILITAR', 'CELULAR')),
          celular2: txt(c(r, 'SEGUNDO CELULAR DO MILITAR', 'SEGUNDO CELULAR')),
          telefone: txt(c(r, 'TELEFONE RESIDENCIAL')),
          email: txt(c(r, 'EMAIL DO MILITAR', 'E-MAIL', 'EMAIL')),
          email2: txt(c(r, 'SEGUNDO EMAIL DO MILITAR', 'SEGUNDO EMAIL')),
          logradouro: [titulo(txt(c(r, 'LOGRADOURO'))), txt(c(r, 'NOME DO LOGRADOURO'))].filter(Boolean).join(' '),
          numero: txt(c(r, 'NÚMERO')),
          complemento: txt(c(r, 'COMPLEMENTO')),
          bairro: txt(c(r, 'BAIRRO')), municipio: titulo(txt(c(r, 'MUNICÍPIO'))), cep: txt(c(r, 'CEP')),
        },
        pessoais: {
          estadoCivil: titulo(txt(c(r, 'ESTADO CIVIL'))),
          possuiFilhos: simNao(c(r, 'POSSUI FILHOS')),
          filhos: int(c(r, 'QUANTOS FILHOS')),
          filiacao: txt(c(r, 'FILIAÇÃO')),
          rg: txt(c(r, 'CARTEIRA DE IDENTIDADE - RG', 'CARTEIRA DE IDENTIDADE', 'RG')),
          cpf,
        },
        diaria: {
          banco: txt(c(r, 'BANCO')), agencia: txt(c(r, 'AGÊNCIA')),
          tipoConta: titulo(txt(c(r, 'TIPO DA CONTA', 'TIPO DE CONTA'))), conta: txt(c(r, 'NÚMERO DA CONTA')),
          pixTipo: txt(c(r, 'CHAVE PIX')), pix: txt(c(r, 'DESCRIÇÃO DA CHAVE PIX')),
          quinquenio: ((v) => (typeof v === 'number' && v <= 1 ? Math.round(v * 100) + '%' : txt(v)))(c(r, 'QUINQUÊNIO / ADE', 'QUINQUÊNIO')),
          cpf,
        },
        epi: {
          possuiCapacete: simNao(c(r, 'POSSUI CAPACETE DE CIURB?')),
          capacete: titulo(txt(c(r, 'CAPACETE DE CIURB - ESTADO'))),
          corCapacete: titulo(txt(c(r, 'COR DO CAPACETE DE CIURB', 'COR DO CAPACETE'))),
          capaceteCondiz: simNao(c(r, 'CAPACETE CONDIZ COM SEU POSTO/GRADUAÇÃO?', 'CAPACETE CONDIZ')),
          possuiConjunto: simNao(c(r, 'POSSUI CONJUNTO DE CIURB (CAPA+CALÇA)?', 'POSSUI CONJUNTO DE CIURB')),
          capa: titulo(txt(c(r, 'CAPA DE CIURB - CONDIÇÃO', 'CAPA DE CIURB'))),
          calca: titulo(txt(c(r, 'CALÇA DE CIURB - CONDIÇÃO', 'CALÇA DE CIURB'))),
          conjunto: titulo(txt(c(r, 'COR DO CONJUNTO DE CIURB', 'COR DO CONJUNTO'))),
          possuiBota: simNao(c(r, 'POSSUI BOTA DE CIURB?')),
          bota: titulo(txt(c(r, 'BOTA DE CIURB - CONDIÇÃO', 'BOTA DE CIURB'))),
          possuiLuva: simNao(c(r, 'POSSUI LUVA DE CIURB?')),
          luva: titulo(txt(c(r, 'LUVA DE CIURB - CONDIÇÃO', 'LUVA DE CIURB'))),
          balaclava: simNao(c(r, 'POSSUI BALACLAVA?', 'POSSUI BALACLAVA')),
          patrimonio: txt(c(r, 'Nº DO PATRIMÔNIO', 'PATRIMÔNIO')),
        },
        armamento: {
          possui: !!possuiArma,
          quantos: int(c(r, 'QUANTOS')),
          armas: possuiArma ? [arma(1), arma(2), arma(3)].filter((a) => a.desc || a.reg) : [],
          demais: possuiArma ? txt(c(r, 'DESCRIÇÃO DOS DEMAIS ARMAMENTOS')) : '',
        },
        academico: {
          possuiTecnico: simNao(c(r, 'POSSUI CURSO TÉCNICO DE NÍVEL MÉDIO')),
          tecnico: txt(c(r, 'CURSO(S) TÉCNICO DE NÍVEL MÉDIO', 'CURSO TÉCNICO')),
          superior: !!simNao(c(r, 'POSSUI CURSO DE NÍVEL SUPERIOR')) || !!txt(c(r, 'CURSO(S) DE NÍVEL SUPERIOR')),
          curso: txt(c(r, 'CURSO(S) DE NÍVEL SUPERIOR', 'CURSO SUPERIOR')),
          possuiPos: simNao(c(r, 'POSSUI PÓS GRADUAÇÃO')),
          tipoPos: titulo(txt(c(r, 'TIPO DE PÓS GRADUAÇÃO'))),
          pos: txt(c(r, 'PÓS GRADUAÇÃO', 'PÓS-GRADUAÇÃO')),
        },
      };
      const ant = porId.get(m.id);
      if (!ant || String(m.respondidoEm) >= String(ant.respondidoEm)) porId.set(m.id, m);
      if (ant) ctx.duplicadas = (ctx.duplicadas || 0) + 1;
    });
    // nomes dos cursos: mesma sigla com descrições diferentes vira cursos diferentes,
    // com a palavra que distingue cada um (ex.: "BREC" e "BREC Avançado", "CSV I" e "CSV II")
    const nomes = new Map(), descricoes = new Map();
    cursosMap.forEach((porDesc, sigla) => {
      const lista = [...porDesc.entries()];
      if (lista.length <= 1) { descricoes.set(sigla, lista.length ? frase(lista[0][1]) : ''); return; }
      const palavras = lista.map(([k]) => k.split(' '));
      const comuns = palavras[0].filter((w) => palavras.every((p) => p.includes(w)));
      lista.forEach(([k, original], i) => {
        const extra = palavras[i].filter((w) => !comuns.includes(w));
        const sufixo = original.split(/[\s\-–—/]+/).filter((t) => extra.includes(N(t)))
          .map((t) => (/^[IVX]+$/i.test(t) ? t.toUpperCase() : titulo(t))).slice(0, 3).join(' ');
        const nome = sufixo ? `${sigla} ${sufixo}` : sigla;
        nomes.set(sigla + '|' + k, nome);
        if (!descricoes.has(nome)) descricoes.set(nome, frase(original));
      });
    });
    const nomeCurso = (x) => nomes.get(x.sigla + '|' + N(x.desc)) || x.sigla;
    porId.forEach((m) => { m.cursos = [...new Set(m.cursos.map(nomeCurso))]; });

    // relatório de leitura (tela "Testar planilha")
    const usados = new Set(Object.values(c.mapa).filter(Boolean));
    const vistos = new Set();
    const militaresUnicos = [...porId.values()];
    ctx.relatorio = {
      linhas: linhas.length, militares: porId.size, repetidas: ctx.duplicadas || 0,
      titulos: c.titulos,
      mapa: Object.entries(c.mapa).filter(([k]) => { const a = k.split('|')[0]; if (vistos.has(a)) return false; vistos.add(a); return true; })
        .map(([k, h]) => ({ procura: k.split('|')[0], coluna: h, preenchidas: h ? linhas.filter((r) => !vazio(r[h])).length : 0 })),
      naoUsadas: c.titulos.filter((t) => !usados.has(t)),
      obmsDesconhecidas: [...new Set(militaresUnicos.map((m) => m.obm))].filter((o) => !OBM_ORDEM.includes(o)),
      postosDesconhecidos: [...new Set(militaresUnicos.map((m) => m.posto))].filter((x) => !(x in RANK)),
      semNBM: militaresUnicos.filter((m) => !m.nBM).length,
      // leitura das colunas de embarcação (tela "Condutores de embarcação")
      embarcacao: {
        manual: embManual,
        campos: ['resp', 'hab', 'reg', 'val'].map((k) => {
          const h = embCols[k], vals = h ? linhas.map((r) => txt(r[h])).filter(Boolean) : [];
          const freq = new Map(); vals.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
          return { campo: k, coluna: h, manual: !!embManual[k], preenchidas: vals.length,
            datas: k === 'val' ? vals.filter((v) => dataISO(v) || dataISO(v.replace(/^(\d{1,2})\/(\d{4})$/, '01/$1/$2'))).length : null,
            comuns: k === 'resp' || k === 'hab' ? [...freq].sort((a, b) => b[1] - a[1]).slice(0, 8) : [],
            ignorados: k === 'hab' ? [...freq].filter(([v]) => util(v) && !nauticas(v).length).sort((a, b) => b[1] - a[1]).slice(0, 10) : [] };
        }),
      },
    };
    const todosCursos = new Set(militaresUnicos.flatMap((m) => m.cursos));
    return { militares: militaresUnicos, cursos: [...todosCursos].map((sigla) => ({ sigla, nome: descricoes.get(sigla) || sigla })).sort((a, b) => a.sigla.localeCompare(b.sigla)) };
  };
})();
