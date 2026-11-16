/* ==========================================================================
   APP › NAVEGAÇÃO — estrutura do menu, atalhos do celular e planilha de cada tela
   Para criar uma tela nova: 1) acrescente o item no NAV; 2) crie o arquivo em
   assets/js/telas/ registrando PAGES['id'] = { title, render(view) };
   3) inclua o <script> em index.html; 4) se a tela depender de uma planilha
   que não seja o efetivo, informe em REQUER.
   ========================================================================== */
window.NAVEGACAO = (function () {
  /* Estrutura do menu — mesma ordem do painel original */
  const NAV = [
    { sec: 'Visão geral', items: [
      { id: 'inicio', label: 'Início', icon: 'home' },
      { id: 'geral', label: 'Geral', icon: 'grid' },
      { id: 'calendario', label: 'Calendário amplo', icon: 'calendar' },
      { id: 'dados', label: 'Dados completos', icon: 'user' },
    ] },
    { sec: 'Pessoal', items: [
      { group: 'Cursos e habilitações', icon: 'badge', children: [
        { id: 'cursos', label: 'Cursos operacionais' },
        { id: 'embarcacao', label: 'Condutores de embarcação' },
        { id: 'motoristas', label: 'Motoristas credenciados' },
      ] },
      { id: 'aniversariantes', label: 'Aniversariantes', icon: 'cake' },
      { group: 'Férias e licenças', icon: 'plane', children: [
        { id: 'ferias', label: 'Férias por período' },
        { id: 'ferias-data', label: 'Férias por data' },
        { id: 'licencas', label: 'Licenças e dispensas' },
      ] },
      { id: 'ddqod', label: 'DDQOD', icon: 'chart' },
    ] },
    { sec: 'Operações e logística', items: [
      { id: 'viaturas', label: 'Viaturas', icon: 'truck' },
      { group: 'Empenhos', icon: 'clock', children: [
        { id: 'empenhos', label: 'Empenhos semanais' },
        { id: 'empenhos-horas', label: 'Horas excedentes' },
      ] },
      { group: 'Mapas', icon: 'map', children: [
        { id: 'articulacao', label: 'Área de articulação' },
        { id: 'conservacao', label: 'Unidades de conservação' },
        { id: 'inundacoes', label: 'Inundações Rio Doce' },
        { id: 'balnearios', label: 'Balneários da região' },
      ] },
    ] },
    { sec: 'Escala', items: [
      { id: 'escala-mensal', label: 'Escala mensal', icon: 'sheet' },
    ] },
    { sec: 'Sistema', items: [
      { id: 'teste', label: 'Testar planilhas', icon: 'file' },
      { id: 'usuarios', label: 'Usuários e acessos', icon: 'users', soAdmin: true },   // só aparece para o administrador
    ] },
  ];
  const BOTTOM = [
    { id: 'inicio', label: 'Início', icon: 'home' },
    { id: 'geral', label: 'Geral', icon: 'grid' },
    { id: 'calendario', label: 'Escala', icon: 'calendar' },
    { id: 'dados', label: 'Efetivo', icon: 'user' },
  ];

  /* tabela de que cada tela depende (as demais dependem só do efetivo) */
  const REQUER = { teste: null, usuarios: null, ferias: 'ferias', 'ferias-data': 'ferias', licencas: 'licencas', ddqod: 'ddqod', viaturas: 'viaturas', empenhos: 'efetivo', 'empenhos-horas': 'horas', articulacao: null, conservacao: null, inundacoes: null, balnearios: null };

  return { NAV, BOTTOM, REQUER };
})();
