/* ==========================================================================
   CONFIGURAÇÃO GERAL DO PAINEL — é aqui que se ajusta o painel (sem mexer no resto do código)
   ========================================================================== */
window.APP_CONFIG = {
  versao: '4.69',

  unidade: {
    sigla: '1ª Cia Op',
    nome: '1ª Companhia Operacional',
    batalhao: '6º BBM',
    corporacao: 'CBMMG',
    sede: 'Governador Valadares',
    comandante: 'Danilo Bruner Lopes Barbosa',
    comandantePosto: 'Cap BM',
    // brasões (PNG/SVG). Vazio = escudo genérico.
    brasao: 'assets/img/cbmmg.png',          // CBMMG
    brasaoBatalhao: 'assets/img/6bbm.png',   // 6º BBM
  },

  /* Ordem em que as OBMs aparecem nas listas e quais ficam na sede.
     OBMs que vierem da planilha e não estiverem aqui aparecem no fim. */
  obms: {
    ordem: ['1ª Cia ADM', '1º Pel', '2º Pel', '3º Pel', '4º Pel', 'CIAD/COBOM', 'CIAD/COBOM ADM', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PEMAD ADM', 'PBRESC', '6º Pel Resplendor', '7º Pel São João Ev.', 'PA Guanhães', 'Brigada Cons. Pena'],
    // quadros exibidos na aba Geral, nesta ordem
    quadrosGeral: ['1º Pel', '2º Pel', '3º Pel', '4º Pel', 'CIAD/COBOM', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PBRESC'],
    // na aba Geral estes quadros ficam na coluna da direita (ao lado do 4º Pel / 4ª Ala), como no Data Studio
    quadrosLado: ['CIAD/COBOM', 'PBRESC'],
    // nestes quadros os militares ficam em ordem de posto/graduação (Cap, Ten, Sub Ten, Sgt, Cb, Sd),
    // sem usar a coluna POSIÇÃO NO PEL; nos demais vale a posição no pelotão
    ordemPorPosto: ['CIAD/COBOM', 'CIAD/COBOM ADM'],
    sede: ['1ª Cia ADM', '1º Pel', '2º Pel', '3º Pel', '4º Pel', 'CIAD/COBOM', 'CIAD/COBOM ADM', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PEMAD ADM', 'PBRESC'],
  },

  /* Abas usadas de cada planilha (quando o arquivo/planilha tem várias). */
  abas: {
    efetivo: 'Respostas ao formulário 1',   // planilha "Respostas"
    ferias: 'PLANO ADAPTADO',               // "Plano de Férias da 1ª Companhia Operacional"
    ddqod: 'DDQOD',                         // "DDQOD 1ª Cia Op"
    horas: 'QUADRO PARA DASHBOARD',         // "Novo Controle de horas 1ª Cia. Op. 2026"
    viaturas: 'VIATURAS',                   // "VIATURAS 1ª CIA. OP"
    licencas: 'LICENÇASDISPENSAS',          // "LICENÇAS E DISPENSAS POR MOTIVO DE SAÚDE (respostas)"
  },

  /* DDQOD: coluna "Onde" da planilha → nome exibido e OBMs que compõem a fração.
     Linhas cujo "Onde" esteja em "totais" são o total da companhia. */
  ddqod: {
    totais: ['1ª Cia'],
    fracoes: {
      'Cia Op Adm': { nome: '1ª Cia Op – Comando', obms: ['1ª Cia ADM'] },
      '1 ao 4 Pel': { nome: '1º ao 4º Pel – Sede', obms: ['1º Pel', '2º Pel', '3º Pel', '4º Pel'] },
      'COBOM':      { nome: 'CIAD/COBOM', obms: ['CIAD/COBOM', 'CIAD/COBOM ADM'] },
      'PEMAD':      { nome: 'PEMAD', obms: ['1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PEMAD ADM'] },
      'PBRESC':     { nome: 'PBRESC', obms: ['PBRESC'] },
      '6º Pel':     { nome: '6º Pel Resplendor', obms: ['6º Pel Resplendor'] },
      '7º Pel':     { nome: '7º Pel São João Ev.', obms: ['7º Pel São João Ev.'] },
      '7º Pel PA':  { nome: '7º Pel PA Guanhães', obms: ['PA Guanhães'] },
      'Brigada':    { nome: 'Brigada Cons. Pena', obms: ['Brigada Cons. Pena'] },
    },
  },

  /* Férias por data: limites do percentual de FA/FP no dia (efetivo dos quadros da sede)
     abaixo de "verde" → verde; de "verde" até "vermelho" → laranja; acima de "vermelho" → vermelho */
  ferias: {
    limites: { verde: 0.12, vermelho: 0.15 },
    maxBM: 11,   // nº máximo de militares em gozo de férias no dia
    // quadro "CMT Pelotão/ADM": férias marcadas com "CMT" na planilha + militares destas OBMs
    cmtObms: ['1ª Cia ADM', 'PEMAD ADM', 'CIAD/COBOM ADM'],
    // oficiais (Ten, Cap, Maj…) destas OBMs também entram no quadro "CMT Pelotão/ADM" (não concorrem no %)
    cmtOficiaisObms: ['6º Pel Resplendor', '7º Pel São João Ev.', 'CIAD/COBOM'],
  },

  /* Viaturas: quadros da carta de situação, nesta ordem. Uma viatura entra no quadro se a OBM
     estiver em "obms" ou se a coluna OBM da planilha contiver uma das "chaves". Sobras vão para "Demais". */
  viaturas: {
    // tipos (sigla) que NÃO entram no "Disponível – Sede e PEMAD" da tela inicial (MO = motocicleta, emprego limitado)
    foraDoDisponivel: ['MO'],
    // nome de cada tipo de viatura (sigla da coluna TIPO da planilha)
    siglas: {
      ABTS: 'Auto Bomba Tanque Salvamento',
      ABT: 'Auto Bomba Tanque',
      AB: 'Auto Bomba',
      ABS: 'Auto Busca e Salvamento',
      ACA: 'Auto Comando de Área',
      AT: 'Auto Tanque',
      ATB: 'Auto Tanque Bomba',
      ASL: 'Auto Salvamento Leve',
      ASM: 'Auto Salvamento Médio',
      ASF: 'Auto Salvamento Florestal',
      ASA: 'Auto Salvamento',
      UR: 'Unidade de Resgate',
      MO: 'Motocicleta',
      TAN: 'Transporte de animais',
      APV: 'Auto Prevenção',
      APP: 'Auto Produtos Perigosos',
      TLP: 'Transporte leve de pessoal',
      TPO: 'Transporte de pessoal operacional',
      UTP: 'Transporte de pessoal',
    },
    quadros: [
      { nome: '1º ao 4º Pel – Sede', obms: ['1ª Cia ADM', '1º Pel', '2º Pel', '3º Pel', '4º Pel', 'CIAD/COBOM', 'CIAD/COBOM ADM'], chaves: ['SEDE', 'COBOM', 'CIA ADM'] },
      { nome: 'PEMAD/PBRESC', obms: ['1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PEMAD ADM', 'PBRESC'], chaves: ['PEMAD', 'PBRESC'] },
      { nome: '7º Pel São João Ev.', obms: ['7º Pel São João Ev.'], chaves: ['SAO JOAO', 'SJE'] },
      { nome: 'Brigada Cons. Pena', obms: ['Brigada Cons. Pena'], chaves: ['BRIGADA', 'BRIG', 'PENA'] },
      { nome: '6º Pel Resplendor', obms: ['6º Pel Resplendor'], chaves: ['RESPLENDOR', '6 PEL', 'RESP'] },
      { nome: '7º Pel PA Guanhães', obms: ['PA Guanhães'], chaves: ['GUANHAES', 'PA GUA', 'GUANH'] },
    ],
  },

  /* Tabela semanal de empenhos (como a planilha EMPENHOS GERAIS) */
  empenhos: {
    // status disponíveis na lista; o 2º item é a cor: op, ferias, lic, folga, curso, outro, gcif, missao
    status: [
      ['Plantão Op', 'op'], ['P. Op 12D', 'op'], ['P. Op 12N', 'op'],
      ['Férias', 'ferias'], ['Trânsito', 'ferias'],
      ['Licenciado', 'lic'], ['Dispensado', 'lic'], ['DSP', 'lic'],
      ['Folga 24h', 'folga'], ['Liberado', 'folga'], ['Folga APA', 'folga'],
      ['Curso', 'curso'], ['CEFS BH', 'curso'], ['TPB', 'curso'],
      ['Obra', 'outro'], ['Cedido', 'outro'], ['OS', 'outro'], ['NIF', 'outro'], ['NAC', 'outro'], ['Agregado', 'outro'], ['Outro', 'outro'],
      ['GCIF', 'gcif'], ['REF. GCIF', 'gcif'], ['OF. GCIF', 'gcif'], ['APA GCIF', 'gcif'], ['REF.GCIF 12HD', 'gcif'],
      ['APA Mucuri', 'missao'], ['IF Área 6º BBM', 'missao'],
    ],
    // status em que se escolhe a data de RETORNO (lança nos serviços antes dela), em vez de "Termina em"
    comRetorno: ['Folga APA'],
    // mesmas regras das fórmulas da planilha
    diurno: ['Plantão Op', 'P. Op 12D'],
    noturno: ['Plantão Op', 'P. Op 12N', 'REF. GCIF'],
    // destaque do TOTAL GERAL (sede + PEMAD): ≥ verde fica verde; = amarelo fica AMARELO; abaixo fica VERMELHO
    limites: { verde: 12, amarelo: 11 },
    // destaque dos motoristas pesados (MP, cat. D) somando sede + PEMAD: = amarelo fica AMARELO; abaixo fica VERMELHO
    limitesMP: { verde: 4, amarelo: 3 },
    // página pública (empenhos.html): mostrar também a observação no nome de cada militar? (a do dia sempre aparece)
    publicoObsMilitar: false,
    // motorista "categoria D" = credenciado em categoria que contenha uma destas letras
    motoristaD: ['D', 'E'],
  },

  /* Grupos (quadros) da aba Horas excedentes, na ordem do Data Studio:
     linha 1 = 1º ao 4º Pel + CIAD/COBOM; linha 2 = 1ª a 4ª Ala PEMAD + PBRESC.
     Quem for de outra OBM vai para "Demais OBMs", no fim. */
  horas: {
    grupos: ['1º Pel', '2º Pel', '3º Pel', '4º Pel', 'CIAD/COBOM', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD', 'PBRESC'],
    // regras de destaque que já vêm ligadas ao abrir a tela (pode deixar [] ):
    // op: '>', '>=', '=', '<=', '<', 'entre'; cor: vermelho, amarelo, azul, verde
    destaques: [],
    // plantões: só para os pelotões operacionais; a cada "ciclo" plantões o militar soma 24 h (a planilha já faz a conta)
    plantoes: { ciclo: 21, obms: ['1º Pel', '2º Pel', '3º Pel', '4º Pel', '1ª Ala PEMAD', '2ª Ala PEMAD', '3ª Ala PEMAD', '4ª Ala PEMAD'], perto: 18 },
  },

  /* Escala 24x72 dos pelotões da sede.
     Âncora: em 01/01/2026 o 1º Pel estava de serviço; o ciclo segue 1→2→3→4. */
  escala: {
    ancora: '2026-01-01',
    pelotaoNaAncora: 1,
    ciclo: 4,
    trocaHora: 7,
    trocaMinuto: 30,
  },

  /* Escala mensal (aba "Escala mensal"): textos e regras usados quando o mês ainda não tem nada
     lançado. Depois, cada mês começa com o que foi usado no mês anterior (funções, textos, legendas). */
  escalaMensal: {
    // marca do dia de serviço por dia da semana (0 = domingo, 6 = sábado): XF = faxina, XV = limpeza de viaturas
    marcas: { 6: 'XF', 0: 'XV' },
    // linhas mínimas de cada quadro na folha (sobra fica com "-")
    linhasPelotao: 17,
    linhasAla: 7,
    // sugestões de função e de motorista (dá para digitar qualquer outra)
    funcoes: ['CBU', 'AUX/CH', 'CM/CH', 'CH', 'CM/CBT', 'CBT', 'CD', 'CR'],
    motoristas: ['ML', 'MP', 'MP*', '-'],
    // afastamentos que aparecem ao lado do nome (FA, FP, TR = trânsito, LM, LL, LN, DM = dispensa médica)
    afastamentos: ['FA', 'FP', 'TR', 'LM', 'LL', 'LN', 'DM'],
    // pilotos de RPA/drone: quem tiver um curso com uma destas palavras (coluna de cursos do efetivo)
    cursosRpa: ['RPA', 'RPAS', 'ARP', 'DRONE', 'VANT', 'REMOTAMENTE PILOTAD'],
    // sugestão "previsão de retorno": afastamentos que terminam no mês ou até estes dias depois dele
    retornoAte: 7,
    legenda: [
      ['AUX', 'Auxiliar do CBU'], ['CBU', 'Comandante do Pelotão'], ['CBT', 'Combatente'], ['CD', 'Cedido'],
      ['CH', 'Comandante de Guarnição'], ['CM', 'Chefe dos motoristas'], ['CR', 'Curso Operacional'], ['DM', 'Dispensa Médica'],
      ['FA', 'Férias Anuais'], ['FP', 'Férias Prêmio'], ['LL', 'Licença Luto'], ['LM', 'Licença Médica'],
      ['LN', 'Licença Núpcias'], ['ML', 'Motorista Leve'], ['MP', 'Motorista Pesado'], ['TR', 'Trânsito'],
    ],
    turnosCobom: ['06:00', '14:00', '22:00', 'Adm', 'Sobreaviso'],
    /* PBRESC: 12/36h nos dias de semana e sobreaviso (SCA) no fim de semana, em 2 equipes que se alternam por semana:
         uma semana a equipe trabalha seg, qua e qui (sem sobreaviso); na outra, ter, qui e sex + SCA sáb e dom.
         Toda quinta as duas trabalham. Referência usada quando não há escala do mês anterior: na semana que
         começa em "semanaRef", a equipe "equipeSegQuaQui" trabalha seg, qua e qui (a letra vem do nome: "A) Sgt …"). */
    pbresc: { semanaRef: '2026-11-02', equipeSegQuaQui: 'A', semana1: { 1: 'X', 3: 'X', 4: 'X' }, semana2: { 2: 'X', 4: 'X', 5: 'X', 6: 'SCA', 0: 'SCA' } },
    prescricoesPbresc: [
      'a) Referência Normativa: Instrução Operacional nº 03 que trata do emprego operacional de Cães;',
      'b) A atividade do Cinotécnico será nos horários compreendidos entre 07h e 19h, não poderá ser desarticulada;',
      'c) Nos momentos que não estiverem realizando os treinamentos com cães, a equipe cinotécnica irá compor o efetivo do PEMAD;',
      'd) Os militares escalados para treinamento com cães deverão confeccionar REDS diário alusivo à atividade - Q03007;',
      'e) Além das atividades de rotina, os militares do Cinotécnico compõem reserva do PEMAD, devendo ser acionados para eventuais reforços;',
      'f) O serviço de Cinotécnico somente será desativado com a anuência do Comandante da 1ª Cia Operacional ou o Comandante do PEMAD.',
      'g) Os militares do PBRESC deverão fazer uma limpeza geral nas viaturas de transporte de animais toda última quinta feira do mês.',
    ].join('\n'),
    faxinaTitulo: '1 - Faxina da Prontidão de Incêndio / Checagem de Motores de Popa',
    faxina: [
      '1.1 Locais: Estacionamento; Entorno da piscina; Área de garagem da Prontidão de Incêndio; Hall de entrada; Fachada/frente do quartel.',
      '1.2 Atividades: Limpeza, lavagem, capina, varrição, organização de equipamentos e materiais, dentre outras coisas que se fizerem necessárias para asseio da prontidão.',
      '1.3 Escala: XF - Todo sábado, o Pelotão que estiver de plantão, horário a critério do CBU/Auxiliar do CBU.',
      '1.4 Observações: O pelotão responsável pela faxina providenciará antecipadamente os materiais necessários; os militares deverão se manter em condições de atender os chamados que porventura surgirem durante a faxina; deverá constar no Relatório de Serviço, com indicação de horário do início e final da faxina; sem prejuízo de verificação por outras autoridades, a faxina será objeto de fiscalização por parte do Pelotão escalado no Domingo; a faxina aqui mencionada não exclui a obrigação de se limpar as demais dependências do quartel, conforme ordem de serviço.',
      '1.5 Conferência de Motores (Sede e PEMAD): conferir e testar todos os motores de popa/rabeta; conferir e testar geradores, compressores e motosserras.',
      'PEMAD e PBRESC, adaptar a faxina da Prontidão de Incêndio nos moldes da Sede.',
    ].join('\n'),
    limpezaTitulo: '2 - Limpeza de Viaturas / Checagem de Rodas/Pneus',
    limpeza: [
      '2.1 Viaturas: Conforme escala prévia da Seção de Transporte, no total de 01 viatura por Pelotão, todo domingo;',
      '2.2 Atividades: Limpeza, lavagem (aspiração, escovação, retirada de poeira, etc) de parte interna (habitáculo, assentos, consoles, portas, vidros, carpetes, etc.), boxes, compartimentos, suportes, equipamentos, parte externa, com aplicação de cera de polimento e brilho para pneus.',
      '2.3 Escala: XV - Todo domingo, o Pelotão que estiver de plantão, horário a critério do CBU/Auxiliar do CBU.',
      '2.4 Observações: O pelotão responsável pela limpeza providenciará antecipadamente os materiais necessários; atentar para a indisponibilidade da viatura durante a realização da limpeza, providenciando viatura reserva, acionando apoio e informando o COBOM; os militares deverão se manter em condições de atender os chamados que porventura surgirem durante a limpeza; deverá constar no relatório de serviço, com indicação de horário de início e final da limpeza da viatura; sem prejuízo de verificação por outras autoridades, a limpeza da viatura será objeto de fiscalização por parte do pelotão escalado na Segunda-feira; a limpeza aqui mencionada não exclui a obrigação de se limpar as demais viaturas, conforme disposto em escala de serviço.',
      '2.7 Conf. Rodas/Pneus (Sede e PEMAD): conferir calibragem, desgaste da banda de rodagem e aperto dos parafusos das rodas de todas as viaturas.',
      'PEMAD e PBRESC, adaptar a limpeza nos moldes da Sede.',
    ].join('\n'),
  },

  /* Fonte de dados:
     'mock'   → dados fictícios de demonstração (mock-data.js)
     'sheets' → planilhas Google, lidas pelo Apps Script (pasta apps-script/) */
  fonteDados: 'sheets',

  /* URL do Web App do Apps Script (termina em /exec).
     Os IDs das planilhas ficam no próprio Apps Script, não aqui. */
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyUrcJOQ667uaXdS2mTx9ul2J6aDHrQ4Psw4ds9f7Dz4KkB2JY5DBrsagGQu-bmVXsJ/exec',

  /* Login (o Apps Script confere; nenhuma senha fica no site):
     modo 'ambos'  = botão "Fazer login com o Google" + "Entrar com usuário e senha"
     modo 'google' = só conta Google · modo 'senha' = só usuário e senha
     clientId = ID do cliente OAuth do Google Cloud (o mesmo de CONFIG.CLIENT_ID no Apps Script).
     Sem clientId, aparece só o usuário e senha. Quem entra com a conta Google pela primeira vez
     pede acesso, e o administrador libera e escolhe o perfil em "Usuários e acessos". */
  auth: {
    habilitado: true,
    modo: 'google',   // usuário e senha desligados (painel na internet): só a conta Google
    clientId: '722396672365-va1e6hgcrp6tuss1g34njkbnt7pk72qv.apps.googleusercontent.com',
  },

  /* Mapas do My Maps (Articulação). Use a URL de incorporação (…/embed?mid=…). */
  mapas: {
    articulacao: 'https://www.google.com/maps/d/embed?mid=1hwTToKYnAtGVq1W0MXQghIW4_kJ1WVA&ehbc=2E312F',
    conservacao: 'https://www.google.com/maps/d/embed?mid=16jpH3l1n2_Qc8T-70kftGfcceHsdk-E&ehbc=2E312F',
    inundacoes: 'https://www.google.com/maps/d/embed?mid=18_xN0wgC1wuDVrlnu-61f-sy9vrkCXs&hl=pt-BR&ehbc=2E312F',
    balnearios: 'https://www.google.com/maps/d/embed?mid=1wiqbKK2xpQea68WrgpW4cbiauo9OJ8w&ehbc=2E312F',
  },
  /* Atalhos (botão com o ícone de link no topo das telas) para as planilhas e formulários Google.
     Para trocar, cole o endereço copiado do navegador (com a aba aberta, ele termina em #gid=…).
       efetivo  → Geral, Dados completos e Aniversariantes
       ferias   → Férias por período e Férias por data
       licencas → Licenças e dispensas (formulário)
       ddqod    → DDQOD · viaturas → Viaturas · horas → Horas excedentes */
  planilhas: {
    efetivo: 'https://docs.google.com/spreadsheets/d/1jJzELku8ijFKc3OwAoe0dvIYCjQtP7gjBfAOLlawj8E/edit?gid=1580039233#gid=1580039233',
    ferias: 'https://docs.google.com/spreadsheets/d/1p_HNFzNYXy6s-Eo7f6m4MMGc3VQJN2l29bNdXEoejmM/edit?gid=1227546750#gid=1227546750',
    licencas: 'https://docs.google.com/forms/d/e/1FAIpQLSfgvH7YjDEGBYqSVVrjeNn3WK9szpw51db1LqtqMlE1Y4nO5g/viewform',
    ddqod: 'https://docs.google.com/spreadsheets/d/18PMB4jIC3cou8nH3l7-KtJRATxPMX9dQ4L8AcTpuVN0/edit?gid=0#gid=0',
    viaturas: 'https://docs.google.com/spreadsheets/d/1dc6JjreAM6FXoBemf3aAQAB77NkOYktrXFn0ChNX2eM/edit?gid=0#gid=0',
    horas: 'https://docs.google.com/spreadsheets/d/1Gzl37rWCd3myktGmipFf7TIyN9dredWW8iVVHjI99ng/edit?gid=353195594#gid=353195594',
  },

  /* Imagens de consulta rápida de cada mapa: aparecem na seta ▾ ao lado do botão do mapa selecionado
     (passe o mouse para ver; clique para fixar ou abrir em tamanho grande). */
  mapasExtras: {
    inundacoes: [
      { titulo: 'Réguas CPRM × SAAE', descricao: 'Comparação das réguas de nível do Rio Doce',
        img: 'https://s2-g1.glbimg.com/BiwPm7OCOLxWBH3z0bpyEoawn4U=/0x0:850x1015/600x0/smart/filters:gifv():strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2020/z/Y/XBNGDzSTKME7dhy3pWeQ/regua-saae.jpg' },
    ],
  },

  /* Datas de "atualizado em" exibidas em cada módulo. */
  atualizacoes: {
    cursos: '2026-01-07',
    embarcacao: '2024-09-15',
    motoristas: '2024-09-11',
    ddqod: '2026-09-18',
  },
};
