/* ==========================================================================
   DADOS FICTÍCIOS DE DEMONSTRAÇÃO
   Gerados de forma determinística. Nenhum nome, número de BM, CPF, telefone
   ou conta corresponde a pessoa real. O efetivo por OBM e por círculo segue
   o DDQOD (existente/previsto) para que os totais batam entre as telas.
   Substituído automaticamente quando APP_CONFIG.fonteDados = 'sheets'.
   ========================================================================== */
(function () {
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  let seed = 61024;
  // números "aleatórios" sempre iguais (semente fixa)
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const wpick = (pairs) => {
    const t = pairs.reduce((s, p) => s + p[1], 0);
    let r = rnd() * t;
    for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
    return pairs[0][0];
  };
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const FIRST_M = ['Rafael', 'Leonardo', 'Igor', 'Paulo', 'Roberto', 'Márcio', 'Anderson', 'Thiago', 'Gustavo', 'Felipe', 'Diego', 'Bruno', 'Rodrigo', 'Marcelo', 'Fábio', 'Vinícius', 'Lucas', 'Mateus', 'Henrique', 'Eduardo', 'Wesley', 'Caio', 'Renato', 'Alexandre', 'Júlio', 'Sérgio', 'Cristiano', 'Wellington', 'Gabriel', 'Daniel', 'Luciano', 'Juliano', 'André', 'Fernando', 'Otávio', 'Samuel', 'Davi', 'Jonas', 'Emanuel', 'Ramon', 'Hugo', 'Murilo', 'Cláudio', 'Edson', 'Geraldo', 'Ronaldo'];
  const FIRST_F = ['Thaís', 'Larissa', 'Renata', 'Camila', 'Patrícia', 'Juliana', 'Aline', 'Fernanda', 'Raquel', 'Débora', 'Natália', 'Priscila', 'Bianca', 'Letícia'];
  const SURN = ['Almeida', 'Azevedo', 'Barros', 'Batista', 'Borges', 'Campos', 'Cardoso', 'Castro', 'Coelho', 'Costa', 'Cunha', 'Duarte', 'Esteves', 'Farias', 'Ferraz', 'Fonseca', 'Freitas', 'Gomes', 'Guedes', 'Lacerda', 'Lima', 'Lopes', 'Macedo', 'Machado', 'Magalhães', 'Martins', 'Medeiros', 'Mendes', 'Monteiro', 'Moraes', 'Moreira', 'Moura', 'Nogueira', 'Nunes', 'Pacheco', 'Paiva', 'Peixoto', 'Pereira', 'Pimentel', 'Prates', 'Queiroz', 'Ramos', 'Rangel', 'Rezende', 'Ribeiro', 'Rocha', 'Salgado', 'Sampaio', 'Santana', 'Siqueira', 'Soares', 'Tavares', 'Teixeira', 'Torres', 'Valente', 'Vasconcelos', 'Viana', 'Vieira', 'Xavier', 'Andrade', 'Brandão', 'Carvalho', 'Dias', 'Figueiredo', 'Leal', 'Linhares', 'Miranda', 'Paranhos', 'Quintão', 'Resende', 'Silveira', 'Toledo', 'Werneck', 'Bastos', 'Calixto', 'Drumond', 'Frade', 'Godinho', 'Horta', 'Jardim', 'Lobato', 'Maia', 'Neves', 'Otoni', 'Pires', 'Rabelo'];
  const MIDDLE = ['da Silva', 'de Souza', 'de Oliveira', 'dos Santos', 'Ferreira', 'Rodrigues', 'Alves', 'de Jesus', 'Gonçalves', 'Pereira', 'Araújo', 'Cordeiro'];

  /* ---- DDQOD (previsto) e efetivo existente por grupo e círculo ---- */
  const QOD = [
    { chave: 'sede', grupo: '1º ao 4º Pel – Sede', prev: { 'Cb/Sd': 52, 'St/Sgt': 26, 'Ten': 4 }, exist: { 'Cb/Sd': 27, 'St/Sgt': 25, 'Ten': 4 },
      obms: ['1º Pel', '2º Pel', '3º Pel', '4º Pel'] },
    { chave: 'pemad', grupo: 'PEMAD', prev: { 'Cb/Sd': 17, 'St/Sgt': 6, 'Ten': 1 }, exist: { 'Cb/Sd': 14, 'St/Sgt': 6, 'Ten': 1 },
      obms: ['1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD'], por: { 'Ten': ['PEMAD ADM'], 'St/Sgt': ['PEMAD ADM', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD'] } },
    { chave: 'pbresc', grupo: 'PBRESC', prev: { 'Cb/Sd': 3, 'St/Sgt': 2 }, exist: { 'Cb/Sd': 2, 'St/Sgt': 2 }, obms: ['PBRESC'] },
    { chave: 'ciad', grupo: 'CIAD/COBOM', prev: { 'Cb/Sd': 5, 'St/Sgt': 15, 'Ten': 1 }, exist: { 'Cb/Sd': 2, 'St/Sgt': 15, 'Ten': 1 }, obms: ['CIAD/COBOM'] },
    { chave: 'resplendor', grupo: '6º Pel Resplendor', prev: { 'Cb/Sd': 17, 'St/Sgt': 10, 'Ten': 1 }, exist: { 'Cb/Sd': 14, 'St/Sgt': 9, 'Ten': 0 }, obms: ['6º Pel Resplendor'] },
    { chave: 'sje', grupo: '7º Pel São João Ev.', prev: { 'Cb/Sd': 17, 'St/Sgt': 10, 'Ten': 1 }, exist: { 'Cb/Sd': 12, 'St/Sgt': 12, 'Ten': 1 }, obms: ['7º Pel São João Ev.'] },
    { chave: 'guanhaes', grupo: '7º Pel PA Guanhães', prev: { 'Cb/Sd': 10, 'St/Sgt': 8 }, exist: { 'Cb/Sd': 11, 'St/Sgt': 9 }, obms: ['PA Guanhães'] },
    { chave: 'conspena', grupo: 'Brigada Cons. Pena', prev: { 'St/Sgt': 2, 'Cb/Sd': 0 }, exist: { 'St/Sgt': 1, 'Cb/Sd': 0 }, obms: ['Brigada Cons. Pena'] },
    { chave: 'cmt', grupo: '1ª Cia Op – Comando', prev: { 'Cap': 1, 'St/Sgt': 1, 'Cb/Sd': 0 }, exist: { 'Cap': 1, 'St/Sgt': 1, 'Cb/Sd': 0 }, obms: ['1ª Cia ADM'] },
  ];
  const MUNICIPIO = { '6º Pel Resplendor': 'Resplendor', '7º Pel São João Ev.': 'São João Evangelista', 'PA Guanhães': 'Guanhães', 'Brigada Cons. Pena': 'Conselheiro Pena' };
  const BAIRROS = {
    'Governador Valadares': ['Centro', 'Santa Rita', 'Vila Isa', 'Grã-Duquesa', 'São Pedro', 'Lourdes', 'Esplanada', 'Ilha dos Araújos', 'Jardim Pérola', 'Vila Bretas'],
    'Resplendor': ['Centro', 'Vila Nova', 'São Sebastião'],
    'São João Evangelista': ['Centro', 'Alvorada', 'Bela Vista'],
    'Guanhães': ['Centro', 'Cidade Nova', 'Nações'],
    'Conselheiro Pena': ['Centro', 'Vila Formosa'],
  };

  const CURSOS = [
    ['TEM', 'Emergências médicas', .55], ['CSTER', 'Salvamento terrestre', .24], ['CSALT', 'Salvamento em altura', .14],
    ['CSV', 'Salvamento veicular – nível I', .2], ['BREC', 'Estruturas colapsadas', .08], ['CSSEI', 'Enchentes e inundações', .16],
    ['CIURB', 'Incêndio urbano', .18], ['CMAUT', 'Mergulho autônomo', .06], ['CRED MERG', 'Credenciamento de mergulho', .05],
    ['COAT', 'Tripulante operacional', .04], ['RPA', 'Operador de drone', .07], ['MOTO OP', 'Motociclista operacional', .05],
    ['1º INT', '1º interventor – produtos perigosos', .1], ['CATS', 'Tentativa de suicídio', .06], ['CPCIF', 'Incêndio florestal', .15],
    ['CCOA', 'Comando de operações de área', .03],
  ];

  const POSTO_DE = {
    'Cb/Sd': () => wpick([['Cb', 45], ['Sd', 55]]),
    'St/Sgt': () => wpick([['3º Sgt', 45], ['2º Sgt', 25], ['1º Sgt', 20], ['Sub Ten', 10]]),
    'Ten': () => wpick([['1º Ten', 50], ['2º Ten', 50]]),
    'Cap': () => 'Cap',
  };

  const usedGuerra = new Set();
  const militares = [];
  let seq = 0;

  // cria um militar fictício completo
  function novoMilitar(posto, classe, obm, grupo) {
    const fem = rnd() < .11;
    const first = fem ? pick(FIRST_F) : pick(FIRST_M);
    let last = pick(SURN);
    let tries = 0;
    while (usedGuerra.has(last) && tries++ < 12) last = pick(SURN);
    let guerra = last;
    if (usedGuerra.has(guerra)) guerra = first + ' ' + last;
    usedGuerra.add(guerra);
    const mid = pick(MIDDLE);
    // nome completo com o nome de guerra em caixa alta, como no assentamento
    const nome = guerra === last
      ? (rnd() < .5 ? `${first} ${last.toUpperCase()} ${mid}` : `${first} ${mid.split(' ').pop()} ${last.toUpperCase()}`)
      : `${first.toUpperCase()} ${last.toUpperCase()} ${mid}`;
    const municipio = MUNICIPIO[obm] || 'Governador Valadares';
    const idade = posto === 'Sd' ? ri(22, 32) : posto === 'Cb' ? ri(27, 40) : /Sgt|Sub/.test(posto) ? ri(32, 51) : ri(26, 45);
    const nasc = new Date(TODAY.getFullYear() - idade, ri(0, 11), ri(1, 28));
    const incAno = Math.min(TODAY.getFullYear() - 1, nasc.getFullYear() + ri(20, 27));
    const inclusao = new Date(incAno, ri(0, 11), ri(1, 28));
    const cnh = wpick([['B', 34], ['AB', 30], ['AD', 12], ['D', 8], ['AE', 5], ['A', 3], ['-', 8]]);
    const cred = cnh === '-' ? '-' : wpick([['-', 30], [cnh, 55], ['B', 15]]);
    const cve = cred === '-' ? null : rnd() < .58;
    const cursos = CURSOS.filter((c) => rnd() < c[2] * (obm === 'PBRESC' && c[0] === 'CSSEI' ? 4 : 1)).map((c) => c[0]);
    const embProb = obm === 'PBRESC' ? .8 : /PEMAD/.test(obm) ? .3 : .12;
    const embarcacao = rnd() < embProb ? {
      hab: wpick([['ETSP', 60], ['Arrais Amador', 22], ['Motonauta', 10], ['Mestre Amador', 8]]),
      validade: rnd() < .2 ? '' : iso(new Date(ri(2023, 2029), ri(0, 11), ri(1, 28))),
    } : null;
    const bairro = pick(BAIRROS[municipio]);
    const id = 'm' + pad(++seq, 3);
    const nBM = `${ri(100, 189)}.${pad(ri(0, 999), 3)}-${ri(0, 9)}`;
    const cpfFake = `${pad(ri(0, 999), 3)}.${pad(ri(0, 999), 3)}.${pad(ri(0, 999), 3)}-${pad(ri(0, 99))}`;
    militares.push({
      id, nBM, posto, classe, nome, nomeGuerra: guerra, obm, grupo, municipio, sexo: fem ? 'F' : 'M',
      nascimento: iso(nasc), inclusao: iso(inclusao),
      formacao: /Ten|Cap/.test(posto) ? (rnd() < .7 ? 'CFO' : 'CHO') : /Sgt|Sub/.test(posto) ? (rnd() < .6 ? 'CFS' : 'CFSd') : 'CFSd',
      cnh, credenciado: cred, cve,
      cursos,
      embarcacao,
      tipoSanguineo: wpick([['O+', 38], ['A+', 30], ['B+', 9], ['AB+', 3], ['O-', 9], ['A-', 7], ['B-', 2], ['AB-', 2]]),
      contato: {
        celular: `(33) 9${ri(8, 9)}${pad(ri(0, 999), 3)}-${pad(ri(0, 9999), 4)}`,
        email: (first + '.' + last).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@exemplo.mg.gov.br',
        logradouro: pick(['Rua', 'Avenida', 'Travessa']) + ' ' + pick(['das Acácias', 'Israel Pinheiro', 'Minas Gerais', 'Rio Doce', 'São Paulo', 'Marechal Floriano', 'dos Ipês', 'Bárbara Heliodora', 'Sete de Setembro']),
        numero: String(ri(10, 2400)),
        complemento: pick(['Casa', 'Apto 101', 'Apto 302', '-', 'Fundos']),
        bairro, municipio,
        cep: `${ri(35000, 35099)}-${pad(ri(0, 999), 3)}`,
      },
      epi: {
        capacete: wpick([['Ótimo', 40], ['Bom', 35], ['Regular', 15], ['Péssimo', 10]]),
        corCapacete: wpick([['Vermelho', 60], ['Amarelo', 25], ['Branco', 15]]),
        capa: wpick([['Ótimo', 30], ['Bom', 35], ['Regular', 20], ['Péssimo', 15]]),
        calca: wpick([['Ótimo', 30], ['Bom', 35], ['Regular', 20], ['Péssimo', 15]]),
        bota: wpick([['Ótimo', 30], ['Bom', 40], ['Regular', 20], ['Péssimo', 10]]),
        luva: wpick([['Ótimo', 30], ['Bom', 40], ['Regular', 20], ['Péssimo', 10]]),
        conjunto: wpick([['Preto', 55], ['Caqui', 45]]),
      },
      armamento: rnd() < .45 ? { possui: true, desc1: pick(['Pistola .40', 'Pistola .380', 'Pistola 9 mm']), reg1: 'EX' + ri(100000, 999999), desc2: rnd() < .15 ? 'Revólver .38' : '', reg2: '' } : { possui: false },
      pessoais: { estadoCivil: wpick([['Casado(a)', 45], ['Solteiro(a)', 30], ['União estável', 18], ['Divorciado(a)', 7]]), filhos: wpick([[0, 40], [1, 28], [2, 24], [3, 8]]) },
      academico: (() => {
        const sup = rnd() < .55;
        return {
          superior: sup,
          curso: sup ? pick(['Direito', 'Educação Física', 'Enfermagem', 'Engenharia Civil', 'Administração', 'Gestão Pública', 'Licenciatura em Química', 'Ciências Contábeis']) : '',
          tecnico: rnd() < .2 ? pick(['Técnico em Enfermagem', 'Técnico em Segurança do Trabalho', 'Eletricista – NR10', 'Técnico em Edificações']) : '',
          pos: sup && rnd() < .3 ? pick(['Gestão de Emergências', 'Direito Público', 'Gestão de Pessoas', 'Docência do Ensino Superior']) : '',
        };
      })(),
      diaria: {
        cpf: cpfFake,
        banco: pick(['001 – Banco do Brasil', '104 – Caixa', '341 – Itaú', '237 – Bradesco', '033 – Santander', '756 – Sicoob']),
        tipoConta: wpick([['Conta corrente', 80], ['Poupança', 20]]),
        agencia: `${pad(ri(0, 9999), 4)}-${ri(0, 9)}`,
        conta: `${ri(10000, 99999)}-${ri(0, 9)}`,
        quinquenio: Math.floor((TODAY.getFullYear() - incAno) / 5),
      },
    });
  }

  for (const g of QOD) {
    for (const classe of Object.keys(g.exist)) {
      const n = g.exist[classe];
      const alvo = (g.por && g.por[classe]) || g.obms;
      let k = ri(0, alvo.length - 1);
      for (let i = 0; i < n; i++) {
        const obm = classe === 'Ten' && g.chave === 'sede' ? alvo[i % alvo.length] : alvo[k++ % alvo.length];
        novoMilitar(POSTO_DE[classe](), classe, obm, g.chave);
      }
    }
  }

  /* ---- Férias ---- */
  const ferias = [];
  const fid = () => 'f' + pad(ferias.length + 1, 3);
  // garante alguns militares de férias hoje, espalhados pelas OBMs
  const sorteio = militares.slice().sort(() => rnd() - .5);
  const hojeSet = sorteio.slice(0, 12);
  hojeSet.forEach((m) => {
    const dias = pick([10, 15, 15, 30]);
    const ini = addDays(TODAY, -ri(0, dias - 2));
    ferias.push({ id: fid(), militar: m.id, periodo: ri(1, 10), dias, inicio: iso(ini), fim: iso(addDays(ini, dias - 1)), exercicio: 2026, abono: rnd() < .3, tipo: rnd() < .8 ? 'FA' : 'FP', obs: '' });
  });
  sorteio.slice(12, 70).forEach((m) => {
    const n = ri(1, 2);
    for (let i = 0; i < n; i++) {
      const dias = pick([10, 15, 15, 20, 30]);
      const ini = addDays(TODAY, ri(-200, 150));
      if (Math.abs((ini - TODAY) / 864e5) < 2) continue;
      ferias.push({ id: fid(), militar: m.id, periodo: ri(1, 10), dias, inicio: iso(ini), fim: iso(addDays(ini, dias - 1)), exercicio: ini.getFullYear() - (rnd() < .2 ? 1 : 0), abono: rnd() < .25, tipo: rnd() < .8 ? 'FA' : 'FP', obs: rnd() < .08 ? 'Alteração a pedido – publicar no SIGP' : '' });
    }
  });

  /* ---- Licenças / afastamentos ---- */
  const licencas = sorteio.slice(70, 79).map((m, i) => {
    const dias = pick([3, 5, 10, 15, 30]);
    const ini = addDays(TODAY, ri(-20, 10));
    const tipo = pick(['Dispensa', 'Licença', 'Licença', 'Licença Paternidade', 'Dispensa', 'Licença Luto']);
    const disp = tipo === 'Dispensa';
    const ITENS = ['XIX – tiro', 'XX – uso e manuseio de armamento', 'XXI – condução de viatura caracterizada', 'XVI – atividade física: a) terrestre', 'XII – combate a incêndio', 'XXXI – atividades físicas de impacto: a) corrida', 'XXXVI – serviço noturno'];
    return { id: 'l' + pad(i + 1, 3), militar: m.id, tipo, categoria: disp ? 'Dispensa' : 'Licença', inicio: iso(ini), fim: iso(addDays(ini, dias - 1)), dias,
      itens: disp ? (ITENS.filter(() => rnd() < .45).slice(0, 4).concat([]).length ? ITENS.filter((_, k) => (k + i) % 3 === 0) : [ITENS[0]]) : [], aposTermino: pick(['PRONTO PARA O SERVIÇO', 'RETORNAR AO NAIS']), ata: disp ? String(ri(2400000000000000, 2499999999999999)) : '', documento: '' };
  });


  /* ---- Viaturas (fictícias) ---- */
  const TIPOS_VTR = { UR: 'Unidade de Resgate', ABTS: 'Auto Bomba Tanque Salvamento', ASL: 'Auto Salvamento Leve', ASF: 'Auto Salvamento Florestal', ASM: 'Auto Salvamento Médio', AT: 'Auto Tanque', ACA: 'Auto Comando de Área', MO: 'Motocicleta operacional', TAN: 'Transporte de animais', APV: 'Auto Prevenção', APP: 'Auto Produtos Perigosos', ABS: 'Auto Busca e Salvamento', TLP: 'Transporte leve de pessoal', ABT: 'Auto Bomba Tanque' };
  const MARCAS = { UR: 'Mercedes Sprinter', ABTS: 'Mercedes Atego', ASL: 'Toyota Hilux', ASF: 'Ford F-4000', ASM: 'Iveco Daily', AT: 'VW Constellation', ACA: 'Chevrolet S10', MO: 'Honda XRE 300', TAN: 'Bote Flexboat', APV: 'Mitsubishi L200', APP: 'Renault Duster', ABS: 'Mercedes Atego', TLP: 'Fiat Strada', ABT: 'Mercedes Atego' };
  const FROTA = [
    ['1º Pel', ['UR', 'UR', 'MO', 'MO', 'ASM', 'ABTS', 'ASF', 'AT', 'ACA']], ['CIAD/COBOM', ['TLP']],
    ['PEMAD ADM', ['TAN', 'TAN', 'MO', 'MO', 'MO', 'ASL', 'ASL', 'ASF']], ['PBRESC', ['ABS']],
    ['7º Pel São João Ev.', ['UR', 'ASL', 'ABTS', 'ABT']], ['Brigada Cons. Pena', ['ASL', 'UR', 'UR', 'ASL']],
    ['6º Pel Resplendor', ['APV', 'ASL', 'APP', 'UR', 'ASL', 'ABS']], ['PA Guanhães', ['UR', 'TLP', 'ASL', 'APV', 'ABTS']],
  ];
  const viaturas = [];
  FROTA.forEach(([obm, tipos]) => tipos.forEach((sg) => {
    const L = () => String.fromCharCode(65 + ri(0, 25));
    const sem = sg === 'TAN';
    const km = sem ? null : ri(18000, 240000);
    viaturas.push({
      id: 'v' + pad(viaturas.length + 1, 2), prefixo: `${sg} ${pad(ri(1, 9999), 4)}`, tipo: TIPOS_VTR[sg], sigla: sg, marca: sem ? '' : MARCAS[sg],
      placa: sem ? '' : `${L()}${L()}${L()}${ri(0, 9)}${L()}${ri(10, 99)}`, obm,
      situacao: wpick([['Operante', 74], ['Manutenção', 10], ['Baixada', 16]]),
      km, proxRevisao: km ? Math.ceil((km + ri(500, 9000)) / 10000) * 10000 : null,
      ano: String(ri(2008, 2025)), ultimaVistoria: iso(addDays(TODAY, -ri(2, 60))),
    });
  }));

  /* ---- Inundações (valores ILUSTRATIVOS, substituir pela série oficial) ---- */
  const inundacoes = [
    { ano: 1979, data: '1979-02-05', cota: 6.45, bairros: 22, desalojados: 0, obs: 'Valor ilustrativo' },
    { ano: 1997, data: '1997-01-04', cota: 5.10, bairros: 15, desalojados: 0, obs: 'Valor ilustrativo' },
    { ano: 2003, data: '2003-01-17', cota: 4.62, bairros: 11, desalojados: 0, obs: 'Valor ilustrativo' },
    { ano: 2008, data: '2008-12-20', cota: 4.95, bairros: 13, desalojados: 0, obs: 'Valor ilustrativo' },
    { ano: 2012, data: '2012-01-08', cota: 4.18, bairros: 9, desalojados: 0, obs: 'Valor ilustrativo' },
    { ano: 2020, data: '2020-01-26', cota: 5.32, bairros: 17, desalojados: 0, obs: 'Valor ilustrativo' },
    { ano: 2022, data: '2022-01-12', cota: 4.80, bairros: 12, desalojados: 0, obs: 'Valor ilustrativo' },
  ];

  /* ---- completa cada militar com os campos do formulário "Respostas" ---- */
  const posPel = {};
  militares.slice().sort((a, b) => ({ 'Cap': 1, '1º Ten': 2, '2º Ten': 3, 'Sub Ten': 4, '1º Sgt': 5, '2º Sgt': 6, '3º Sgt': 7, 'Cb': 8, 'Sd': 9 }[a.posto] - { 'Cap': 1, '1º Ten': 2, '2º Ten': 3, 'Sub Ten': 4, '1º Sgt': 5, '2º Sgt': 6, '3º Sgt': 7, 'Cb': 8, 'Sd': 9 }[b.posto]))
    .forEach((m) => { posPel[m.obm] = (posPel[m.obm] || 0) + 1; m.posicaoPel = posPel[m.obm]; });
  militares.forEach((m) => {
    const anos = (d) => Math.floor((TODAY - new Date(d)) / (365.25 * 864e5));
    m.guerraCompleto = `${m.posto} ${m.nomeGuerra}`;
    m.respondidoEm = iso(addDays(TODAY, -ri(20, 900))) + 'T' + pad(ri(7, 21)) + ':' + pad(ri(0, 59)) + ':00';
    m.idade = anos(m.nascimento);
    m.tempoServico = anos(m.inclusao);
    m.almanaque = null;
    m.motorista = m.credenciado !== '-';
    m.cnhRegistro = m.cnh === '-' ? '' : String(ri(10000, 99999)) + String(ri(100000, 999999));
    m.cnhValidade = m.cnh === '-' ? '' : iso(new Date(ri(2025, 2034), ri(0, 11), ri(1, 28)));
    m.condutorEmbarcacao = !!m.embarcacao;
    if (m.embarcacao) m.embarcacao.registro = 'OP/' + pad(ri(1, 60)) + '/' + ri(2010, 2024);
    m.contato.celular2 = rnd() < .2 ? `(33) 9${ri(8, 9)}${pad(ri(0, 999), 3)}-${pad(ri(0, 9999), 4)}` : '';
    m.contato.telefone = '';
    m.contato.email2 = '';
    m.pessoais.possuiFilhos = m.pessoais.filhos > 0;
    m.pessoais.filiacao = `${pick(FIRST_F)} ${pick(SURN)} / ${pick(FIRST_M)} ${pick(SURN)}`;
    m.pessoais.rg = 'MG-' + ri(10, 22) + '.' + pad(ri(0, 999), 3) + '.' + pad(ri(0, 999), 3);
    m.pessoais.cpf = m.diaria.cpf;
    m.diaria.pixTipo = rnd() < .6 ? 'CPF/CNPJ' : 'Celular';
    m.diaria.pix = m.diaria.pixTipo === 'CPF/CNPJ' ? m.diaria.cpf : m.contato.celular;
    m.diaria.quinquenio = m.diaria.quinquenio ? `${m.diaria.quinquenio * 10}%` + (rnd() < .4 ? ' ADE' : '') : '0%';
    Object.assign(m.epi, { possuiCapacete: true, capaceteCondiz: rnd() < .9, possuiConjunto: true, possuiBota: true, possuiLuva: rnd() < .9, balaclava: rnd() < .7, patrimonio: rnd() < .6 ? String(ri(4000000, 7999999)) + '-' + ri(0, 9) : '' });
    const a = m.armamento;
    m.armamento = a.possui ? { possui: true, quantos: a.desc2 ? 2 : 1, armas: [{ desc: a.desc1, reg: a.reg1 }].concat(a.desc2 ? [{ desc: a.desc2, reg: '' }] : []), demais: '' } : { possui: false, quantos: 0, armas: [], demais: '' };
    m.academico.possuiTecnico = !!m.academico.tecnico;
    m.academico.possuiPos = !!m.academico.pos;
    m.academico.tipoPos = m.academico.pos ? 'Especialização' : '';
  });

  /* ---- horas excedentes (quadro para dashboard) ---- */
  const SEDE_HE = ['1º Pel', '2º Pel', '3º Pel', '4º Pel', 'CIAD/COBOM', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PBRESC', '1ª Cia ADM', 'PEMAD ADM'];
  const OPER = ['1º Pel', '2º Pel', '3º Pel', '4º Pel', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD'];
  const horas = militares.filter((m) => SEDE_HE.includes(m.obm)).map((m, i) => ({ id: 'h' + i, militar: m.id, obm: m.obm, nome: m.guerraCompleto, he: rnd() < .22 ? 0 : ri(1, 142), ...(OPER.includes(m.obm) ? { plantoes: ri(0, 20) } : {}) }));

  window.MOCK = { horas, militares, ferias, licencas, viaturas, inundacoes, qod: QOD, cursos: CURSOS.map((c) => ({ sigla: c[0], nome: c[1] })), geradoEm: new Date() };
})();
