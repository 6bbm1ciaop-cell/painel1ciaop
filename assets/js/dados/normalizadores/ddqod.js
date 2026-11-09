/* ==========================================================================
   NORMALIZADOR — DDQOD
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { C, N, vazio, leitor, num, txt, classeTxt, obmCanon, slug } = DADOS.util;

  /* DDQOD — planilha "DDQOD 1ª Cia Op", aba DDQOD: Onde | P/G | Previsto | Existente | Claro
     (também aceita o modelo GRUPO | OBMS | CLASSE | PREVISTO). "Onde" é traduzido por APP_CONFIG.ddqod.fracoes. */
  DADOS.NORM.ddqod = function (linhas, ctx) {
    const c = leitor(linhas), grupos = new Map();
    const conf = C.ddqod || { totais: [], fracoes: {} };
    const fr = (onde) => { const k = Object.keys(conf.fracoes).find((x) => N(x) === N(onde)); return k ? conf.fracoes[k] : null; };
    linhas.forEach((r) => {
      const onde = txt(c(r, 'Onde', 'GRUPO', 'FRAÇÃO')); if (!onde) return;
      if ((conf.totais || []).some((t) => N(t) === N(onde))) return; // linha de total da companhia
      const cl = classeTxt(c(r, 'P/G', 'CLASSE', 'CÍRCULO', 'POSTO'));
      const f = fr(onde);
      const g = grupos.get(onde) || { chave: slug(onde), grupo: f ? f.nome : onde, planilha: onde, prev: {}, exist: {}, obms: f ? f.obms.slice() : [] };
      g.prev[cl] = (g.prev[cl] || 0) + (num(c(r, 'Previsto', 'EFETIVO PREVISTO')) || 0);
      const ex = c(r, 'Existente');
      if (!vazio(ex)) g.exist[cl] = (g.exist[cl] || 0) + (num(ex) || 0);
      txt(c(r, 'OBMS')).split(/[,;]/).map(obmCanon).filter(Boolean).forEach((o) => { if (!g.obms.includes(o)) g.obms.push(o); });
      grupos.set(onde, g);
    });
    if (ctx) ctx.relDdqod = { linhas: linhas.length, fracoes: [...grupos.values()].map((g) => ({ planilha: g.planilha, nome: g.grupo, conhecida: !!fr(g.planilha) })) };
    return [...grupos.values()];
  };
})();
