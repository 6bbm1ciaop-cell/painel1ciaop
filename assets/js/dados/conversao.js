/* ==========================================================================
   DADOS › CONVERSÃO — funções puras que transformam valores das planilhas
   (textos, datas, postos, OBMs, sim/não) no formato interno do painel.
   Não acessam a tela nem o Apps Script. Usadas pelos normalizadores
   (dados/normalizadores/*.js) e pela camada DS (dados/ds.js).
   Os títulos das colunas são procurados sem diferenciar acentos/maiúsculas e
   aceitam início de texto (ex.: "CREDENCIADO EM" encontra
   "CREDENCIADO EM QUAL(IS) CATEGORIA(S)").
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const pad = (n) => String(n).padStart(2, '0');
  // Date → "aaaa-mm-dd"
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  // "aaaa-mm-dd" → Date (meia-noite local)
  const parse = (s) => {
    if (!s) return null;
    if (s instanceof Date) return s;
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return y ? new Date(y, m - 1, d) : null;
  };
  // hoje à meia-noite
  const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  const RANK = { 'Cel': 0, 'Ten Cel': 0.5, 'Maj': 0.8, 'Cap': 1, '1º Ten': 2, '2º Ten': 3, 'Asp': 3.5, 'Sub Ten': 4, '1º Sgt': 5, '2º Sgt': 6, '3º Sgt': 7, 'Cb': 8, 'Sd': 9 };
  const OBM_ORDEM = C.obms.ordem;
  const SEDE = new Set(C.obms.sede);

  /* ====================== utilidades de conversão ====================== */
  const N = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  // célula vazia ou só traço ("-")
  const vazio = (v) => v === '' || v == null || /^[-–—]+$/.test(String(v).trim());

  /* cria uma função col(linha, 'TÍTULO 1', 'TÍTULO ALTERNATIVO', ...) */
  function leitor(linhas) {
    const heads = linhas.length ? Object.keys(linhas[0]).map((h) => [N(h), h]) : [];
    const memo = {};
    const fn = (row, ...nomes) => {
      const k = nomes.join('|');
      if (!(k in memo)) {
        memo[k] = null;
        // 1º título idêntico (diferencia "Nome de Guerra" de "NOME DE GUERRA"), 2º sem acento/maiúscula, 3º início do título
        const exatos = nomes.filter((a) => a[0] !== '~'), palavras = nomes.filter((a) => a[0] === '~');
        for (const a of exatos) { const x = heads.find((h) => h[1] === a); if (x) { memo[k] = x[1]; break; } }
        if (memo[k] == null) for (const a of exatos) { const x = heads.find((h) => h[0] === N(a)); if (x) { memo[k] = x[1]; break; } }
        // início de texto só para nomes compostos (evita 'NÚMERO' casar com 'NÚMERO DE BM')
        if (memo[k] == null) for (const a of exatos) {
          if (!N(a).includes(' ')) continue;
          const x = heads.find((h) => h[0].startsWith(N(a) + ' '));
          if (x) { memo[k] = x[1]; break; }
        }
        // 4º título que contenha todas as palavras-chave (ex.: '~CONDUTOR EMBARCAC')
        if (memo[k] == null) for (const a of palavras) {
          const ws = N(a.slice(1)).split(' ');
          const x = heads.find((h) => ws.every((w) => h[0].includes(w)));
          if (x) { memo[k] = x[1]; break; }
        }
      }
      const v = memo[k] ? row[memo[k]] : '';
      return v == null ? '' : typeof v === 'string' ? v.trim() : v;
    };
    fn.mapa = memo; fn.titulos = heads.map((h) => h[1]);
    return fn;
  }
  // só devolve datas reais (ano 1900–2200, mês 1–12, dia existente); "00/00/0000", "31/02/2027" etc. viram vazio
  const dataOk = (y, mo, d) => {
    if (!(y >= 1900 && y <= 2200 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return '';
    const t = new Date(y, mo - 1, d);
    return t.getMonth() === mo - 1 ? `${y}-${pad(mo)}-${pad(d)}` : '';
  };
  // qualquer data da planilha (dd/mm/aaaa, aaaa-mm-dd) → "aaaa-mm-dd" ou "" se inválida
  function dataISO(v) {
    if (vazio(v)) return '';
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return dataOk(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return dataOk(y, +m[2], +m[1]); }
    return '';
  }
  // data com hora (carimbo do formulário) → "aaaa-mm-ddThh:mm:ss"
  function dataHoraISO(v) {
    if (vazio(v)) return '';
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}T${pad(m[4] || 0)}:${m[5] || '00'}:${m[6] || '00'}` : '';
  }
  // "Sim"/"Não"/"Possui"… → true / false / null (não informado)
  function simNao(v) {
    if (v === true || v === false) return v;
    if (vazio(v)) return null;
    const n = N(v);
    if (/\bNAO\b|^N$|FALSE/.test(n)) return false;
    if (/SIM|POSSUI|HABILITAD|^S$|^X$|TRUE/.test(n)) return true;
    return null;
  }
  // só os dígitos, como número inteiro (0 se não houver)
  const int = (v) => { const n = parseInt(String(v).replace(/\D+/g, ''), 10); return isNaN(n) ? 0 : n; };
  // número com vírgula decimal (null se não for número)
  const num = (v) => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };
  // texto aparado ("" para vazio ou traço)
  const txt = (v) => (vazio(v) ? '' : String(v).trim());
  // "TEXTO" → "Texto"
  const frase = (s) => { s = String(s).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
  // "JOSÉ DA SILVA" → "José da Silva"
  const titulo = (s) => String(s).toLowerCase().replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (x) => x.toLowerCase());
  // só os dígitos (para casar nº BM)
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');

  // posto/graduação em forma padrão ("3º SGT" → "3º Sgt")
  function postoCanon(p) {
    const n = N(p).replace(/ /g, '');
    if (/^SD|SOLDADO/.test(n)) return 'Sd';
    if (/^CB|^CABO/.test(n)) return 'Cb';
    if (/^SUBTEN|^ST$|SUBTENENTE/.test(n)) return 'Sub Ten';
    let m = n.match(/^([123])O?(SGT|SARGENTO)/); if (m) return m[1] + 'º Sgt';
    m = n.match(/^([12])O?(TEN|TENENTE)(?!CEL)/); if (m) return m[1] + 'º Ten';
    if (/^TENCEL/.test(n)) return 'Ten Cel';
    if (/^CAP/.test(n)) return 'Cap';
    if (/^MAJ/.test(n)) return 'Maj';
    if (/^CEL/.test(n)) return 'Cel';
    if (/^ASP/.test(n)) return 'Asp';
    return txt(p);
  }
  // círculo do DDQOD a partir do posto (Cb/Sd, St/Sgt, Ten, Cap)
  function classeDe(posto) {
    if (posto === 'Sd' || posto === 'Cb') return 'Cb/Sd';
    if (/Sgt|Sub Ten/.test(posto)) return 'St/Sgt';
    if (/Ten$|Asp/.test(posto) && posto !== 'Ten Cel') return 'Ten';
    return 'Cap';
  }
  // círculo a partir de um texto livre da planilha
  function classeTxt(v) {
    const n = N(v);
    if (/\bCB\b|\bSD\b|CABO|SOLDADO/.test(n)) return 'Cb/Sd';
    if (/SGT|SUB|\bST\b|SARGENTO/.test(n)) return 'St/Sgt';
    if (/CAP|MAJ|CEL/.test(n)) return 'Cap';
    if (/TEN|ASP/.test(n)) return 'Ten';
    return txt(v);
  }
  // nome da OBM como em config.js → obms.ordem ("1 pelotão" → "1º Pel")
  function obmCanon(o) {
    let s = txt(o).replace(/°/g, 'º').replace(/\s+/g, ' ');
    const m = s.match(/^([1-9])\s*º?\s*pel(otão|otao)?\.?$/i); if (m) return m[1] + 'º Pel';
    const known = OBM_ORDEM.find((x) => N(x) === N(s));
    return known || s;
  }
  const RX_POSTO = /^(sd|cb|[123]\s*[º°o]?\s*sgt|sgt|sub\s*ten|st|[12]\s*[º°o]?\s*ten|ten\s*cel|ten|cap|maj|cel|asp)\.?\s+(bm\s+)?/i;
  // nome de guerra sem o posto (ou as palavras em maiúsculas do nome)
  function guerraDe(nomeGuerra, nome) {
    let g = txt(nomeGuerra).replace(RX_POSTO, '');
    if (!g) g = (String(nome).match(/\b[A-ZÀ-Ý]{2,}\b/g) || []).join(' ');
    return titulo(g || nome);
  }
  // link do Drive → link de miniatura
  function fotoUrl(v) {
    const s = txt(v); if (!s) return '';
    const id = (s.match(/\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/) || [])[1];
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w480` : (/^https?:/.test(s) ? s : '');
  }
  // texto → chave sem acento ("1º Pel" → "1-pel")
  const slug = (s) => N(s).toLowerCase().replace(/ /g, '-');

  /* militar com todos os campos vazios (para quem só aparece nas férias/horas) */
  function militarVazio(base) {
    return Object.assign({
      id: '', nBM: '', posto: '', classe: '', nome: '', nomeGuerra: '', guerraCompleto: '', obm: '', grupo: '', posicaoPel: null, foto: '',
      inclusao: '', nascimento: '', almanaque: null, idade: null, tempoServico: null, formacao: '', cursos: [],
      cnh: '-', cnhRegistro: '', cnhValidade: '', motorista: null, credenciado: '-', cve: null, condutorEmbarcacao: null, embarcacao: null, tipoSanguineo: '', municipio: '',
      contato: { celular: '', celular2: '', telefone: '', email: '', email2: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', cep: '' },
      pessoais: { estadoCivil: '', possuiFilhos: null, filhos: 0, filiacao: '', rg: '', cpf: '' },
      diaria: { banco: '', agencia: '', tipoConta: '', conta: '', pixTipo: '', pix: '', quinquenio: '', cpf: '' },
      epi: {}, armamento: { possui: false, quantos: 0, armas: [], demais: '' },
      academico: { possuiTecnico: null, tecnico: '', superior: false, curso: '', possuiPos: null, tipoPos: '', pos: '' },
    }, base);
  }

  /* Habilitações náuticas reconhecidas na tela "Condutores de embarcação".
     Outros cursos (ex.: Transporte de produtos perigosos, CVE) ficam de fora. */
  const NAUTICAS = [
    [/MOTONAUT|\bMTA\b|MOTO ?AQUATIC|JET ?SKI/, 'Motonauta'],
    [/ARRAIS|\bARA\b/, 'Arrais-Amador'],
    [/MESTRE ?AMADOR|\bMSA\b/, 'Mestre-Amador'],
    [/CAPITAO ?AMADOR|\bCPA\b/, 'Capitão-Amador'],
    [/VELEIRO|\bVLA\b/, 'Veleiro'],
    [/\bETSP\b/, 'ETSP'],
    [/\bCHA\b|NAUTIC|EMBARCAC|CONDUTOR DE EMBARC|MARINHEIRO|AQUAVIARI/, null],   // náutico, sem categoria definida: mantém o texto
  ];
  // respostas como "-", "NÃO", "NÃO POSSUI", "N/A" contam como vazio
  const util = (v) => { const t = txt(v), k = N(t); return !k || /^(N A|NA|NENHUM|NENHUMA|NAO|SEM)\b/.test(k) ? '' : t; };
  // habilitações náuticas reconhecidas num texto (lista NAUTICAS)
  function nauticas(texto) {
    const t = txt(texto); if (!t) return [];
    const out = [];
    t.split(/[,;\n/]+|\s+e\s+/i).map((x) => x.trim()).filter(Boolean).forEach((parte) => {
      const k = N(parte);
      let achou = false;
      for (const [re, nome] of NAUTICAS) {
        if (!re.test(k) || (!nome && achou)) continue;
        const v = nome || parte; achou = true; if (!out.includes(v)) out.push(v);
      }
    });
    return out;
  }

  /* tudo o que os normalizadores e o DS usam fica em DADOS.util */
  window.DADOS = {
    util: { C, pad, iso, parse, hoje, RANK, OBM_ORDEM, SEDE, N, vazio, leitor, dataOk, dataISO, dataHoraISO, simNao, int, num, txt, frase, titulo, soDigitos, postoCanon, classeDe, classeTxt, obmCanon, RX_POSTO, guerraDe, fotoUrl, slug, militarVazio, NAUTICAS, util, nauticas },
    NORM: {},   // preenchido por dados/normalizadores/*.js
  };
})();
