/* ==========================================================================
   NORMALIZADOR — HORAS EXCEDENTES (Controle de horas)
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { C, N, leitor, num, txt, obmCanon } = DADOS.util;

  /* HORAS EXCEDENTES — planilha "Novo Controle de horas", aba QUADRO PARA DASHBOARD: OBM | Nome de Guerra | HE */
  DADOS.NORM.horas = function (linhas, ctx) {
    const c = leitor(linhas);
    let ignoradas = 0;
    const out = linhas.map((r, i) => {
      const nome = txt(c(r, 'Nome de Guerra', 'NOME DE GUERRA', 'MILITAR'));
      const obmTxt = txt(c(r, 'OBM'));
      if (!nome || /^#|N\/A/i.test(obmTxt) || /^#/.test(nome)) { ignoradas++; return null; }
      const obm = obmCanon(obmTxt);
      const m = ctx.acha('', nome, obm) || ctx.avulso({ nome, guerra: nome, obm }, 'horas');
      return { id: 'h' + i, militar: m.id, obm, nome, he: num(c(r, 'HE', 'HORAS EXCEDENTES', 'SALDO')) || 0 };
    }).filter(Boolean);
    ctx.relHoras = { linhas: linhas.length, validas: out.length, ignoradas, avulsos: ctx.avulsos.horas || 0 };
    return out;
  };

  /* PLANTÕES NO CICLO — aba RESUMO da mesma planilha (coluna PLANTÕES).
     Liga cada linha de horas pela OBM + nome de guerra com posto e grava h.plantoes,
     só para as OBMs operacionais de config.js → horas.plantoes.obms. */
  DADOS.NORM.plantoes = function (horas, linhasResumo) {
    const PL = (C.horas && C.horas.plantoes) || { obms: [] };
    const c = leitor(linhasResumo), mapa = new Map();
    linhasResumo.forEach((r) => {
      const nome = txt(c(r, 'NOME DE GUERA COM P/G', 'NOME DE GUERRA COM P/G', '~GUER COM P G', 'NOME DE GUERRA'));
      if (!nome) return;
      const v = c(r, 'PLANTÕES', 'PLANTOES', '~PLANT');
      const n = typeof v === 'number' ? v : /^\d+$/.test(String(v).trim()) ? +String(v).trim() : null;
      mapa.set(N(obmCanon(txt(c(r, 'OBM')))) + '|' + N(nome), n);
      if (!mapa.has('|' + N(nome))) mapa.set('|' + N(nome), n);
    });
    horas.forEach((h) => {
      if (!PL.obms.includes(h.obm)) return;
      const k = N(h.obm) + '|' + N(h.nome);
      const n = mapa.has(k) ? mapa.get(k) : mapa.get('|' + N(h.nome));
      if (n != null) h.plantoes = n;
    });
  };
})();
