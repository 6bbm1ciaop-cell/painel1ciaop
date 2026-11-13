/* ==========================================================================
   NORMALIZADOR — FÉRIAS (Plano de Férias)
   Converte as linhas da planilha ({ "TÍTULO DA COLUNA": valor }) para o
   formato interno do painel. Chamado por DS.aplicar() em dados/ds.js.
   ========================================================================== */
(function () {
  const { iso, parse, vazio, leitor, dataISO, simNao, int, txt, titulo } = DADOS.util;

  /* FÉRIAS — planilha "Plano de Férias", aba PLANO ADAPTADO:
     NÚMERO DE BM | POSTO/GRADUAÇÃO | NOME DO MILITAR | NOME DE GUERRA | OBM | Período | Data Início | Data Final | Dias | Exercício | Abono | Tipo | … | OBSERVAÇÕES */
  DADOS.NORM.ferias = function (linhas, ctx) {
    const c = leitor(linhas);
    const out = linhas.map((r, i) => {
      const bm = c(r, 'NÚMERO DE BM', 'Nº BM'), guerra = c(r, 'NOME DE GUERRA');
      const inicio = dataISO(c(r, 'Data Início', 'INÍCIO')), fim = dataISO(c(r, 'Data Final', 'DATA FIM', 'TÉRMINO', 'FIM'));
      if (!inicio || (vazio(bm) && vazio(guerra))) { ctx.aviso('férias', i); return null; }
      const m = ctx.acha(bm, guerra) || ctx.avulso({ nBM: bm, posto: c(r, 'POSTO/GRADUAÇÃO'), nome: c(r, 'NOME DO MILITAR'), guerra, obm: c(r, 'OBM') }, 'ferias');
      const dias = int(c(r, 'Dias')) || Math.round((parse(fim || inicio) - parse(inicio)) / 864e5) + 1;
      const per = txt(c(r, 'Período', 'PERIODO'));
      const tipo = txt(c(r, 'Tipo'));
      return {
        id: 'f' + i, militar: m.id, periodo: int(per), periodoTxt: per, dias, inicio,
        fim: fim || iso(new Date(parse(inicio).getTime() + (dias - 1) * 864e5)),
        exercicio: int(c(r, 'Exercício')) || '', abono: !!simNao(c(r, 'Abono')),
        tipo: /^f[ap]$/i.test(tipo) ? tipo.toUpperCase() : titulo(tipo || 'FA'),
        obs: txt(c(r, 'OBSERVAÇÕES', 'OBS')),
        // férias de comandante de pelotão / administrativo (não concorrem com as FA/FP operacionais):
        // marcadas com "CMT" na OBM, no tipo, nas observações ou em uma coluna "CMT"/"CONCORRE"
        cmt: /\bCMT\b/i.test([c(r, 'OBM'), tipo, c(r, 'OBSERVAÇÕES', 'OBS'), c(r, '~CMT'), c(r, '~CONCORRE')].map((x) => txt(x)).join(' ')),
      };
    }).filter(Boolean);
    ctx.relFerias = { linhas: linhas.length, validas: out.length, avulsos: ctx.avulsos.ferias || 0 };
    return out;
  };
})();
