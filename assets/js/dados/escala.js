/* ==========================================================================
   DADOS › DATAS, ESCALA 24×72 E FERIADOS
   Pelotão de serviço de cada dia (config.js → escala), troca de serviço
   e feriados nacionais (fixos + móveis calculados pela Páscoa).
   Acrescenta métodos ao DS (dados/ds.js).
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const { hoje, iso, parse } = DADOS.util;

  Object.assign(DS, {
  /* ---------- utilidades de data ---------- */
  hoje, iso, parse,

  /* ---------- escala 24x72 ---------- */
  pelotaoDoDia(d) {
    const a = parse(C.escala.ancora);
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const diff = Math.round((x - a) / 864e5);
    const n = C.escala.ciclo;
    return ((((diff % n) + n) % n) + C.escala.pelotaoNaAncora - 1) % n + 1;
  },
  servicoAgora(now = new Date()) {
    const troca = new Date(now); troca.setHours(C.escala.trocaHora, C.escala.trocaMinuto || 0, 0, 0);
    const dia = now < troca ? new Date(now.getTime() - 864e5) : now;
    const inicio = now < troca ? new Date(troca.getTime() - 864e5) : troca;
    const fim = new Date(inicio.getTime() + 864e5);
    return { pel: this.pelotaoDoDia(dia), inicio, fim, progresso: (now - inicio) / 864e5 };
  },

  /* ---------- feriados nacionais (fixos + móveis via Páscoa) ---------- */
  feriados(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    const pascoa = new Date(ano, mes - 1, dia);
    const rel = (n) => iso(new Date(pascoa.getTime() + n * 864e5 + 3600e3));
    const lista = [
      [`${ano}-01-01`, 'Confraternização Universal'], [rel(-48), 'Carnaval'], [rel(-47), 'Carnaval'], [rel(-2), 'Paixão de Cristo'],
      [`${ano}-04-21`, 'Tiradentes'], [`${ano}-05-01`, 'Dia do Trabalho'], [rel(60), 'Corpus Christi'], [`${ano}-09-07`, 'Independência do Brasil'],
      [`${ano}-10-12`, 'Nossa Senhora Aparecida'], [`${ano}-11-02`, 'Finados'], [`${ano}-11-15`, 'Proclamação da República'],
      [`${ano}-11-20`, 'Dia Nacional de Zumbi e da Consciência Negra'], [`${ano}-12-25`, 'Natal'],
    ];
    return lista.sort((x, y) => x[0].localeCompare(y[0])).map(([data, nome]) => ({ data, nome }));
  },
  });
})();
