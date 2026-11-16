/* ==========================================================================
   DADOS › PÁGINA PÚBLICA DOS EMPENHOS (empenhos.html?c=CÓDIGO)
   A página pública não tem login nem acesso às planilhas: ela mostra a "cópia pública"
   de cada semana gravada, montada aqui pelo painel (administrador, CBU ou auxiliar logado)
   com a mesma conta da tela Empenhos semanais (EMP.publica) e guardada pelo Apps Script
   (Code.gs 5.8, aba PUBLICO da planilha GRAVA EMPENHOS).
   - Ao gravar uma semana: a cópia pública dela é atualizada logo em seguida.
   - Ao abrir o painel: confere as semanas carregadas e regrava só as que mudaram
     (ex.: férias ou licenças lançadas depois da gravação) e completa, aos poucos, as
     semanas da janela do link público (a atual e as 8 seguintes, 4.80): as gravadas como foram gravadas e as
     não gravadas como prévia automática. Semanas passadas não entram.
   Acrescenta métodos ao DS (dados/ds.js).
   ========================================================================== */
(function () {
  // resumo curto do conteúdo (para saber se a cópia pública mudou)
  function hash(t) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + t.length.toString(36); }
  const LOTE = 6;
  // a página pública mostra a semana atual e as 8 seguintes (gravadas ou não); as passadas não precisam de cópia
  const SEMANAS_PUB = 8;
  const janelaPublica = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Array.from({ length: SEMANAS_PUB + 1 }, (_, k) => DS.iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * k))); };

  Object.assign(DS, {
    podePublicar() { return this.fonte === 'sheets' && !!this.pubResumo && ['admin', 'cbu', 'auxiliar'].includes(this.perfil) && !!window.EMP && !!EMP.publica; },
    /** link da página pública (só o administrador recebe o código) */
    linkPublicoUrl() {
      if (!this.linkPublico) return '';
      return location.origin + location.pathname.replace(/[^/]*$/, '') + 'empenhos.html?c=' + encodeURIComponent(this.linkPublico);
    },
    publicaDepois(segs, ms = 1200) { if (this.podePublicar()) setTimeout(() => this.publicaSemanas(segs).catch(() => {}), ms); },
    /** atualiza a cópia pública das semanas da janela do link público: a atual e as 8 seguintes (4.80),
        gravadas ou não (não gravada = prévia automática). segs = só estas (ex.: logo depois de gravar). */
    async publicaSemanas(segs) {
      if (!this.podePublicar() || this._publicando) return 0;
      this._publicando = true;
      let feitas = 0;
      try {
        const pub = this.pubResumo, janela = janelaPublica();
        const lista = (segs ? segs.filter((s) => janela.includes(s)) : janela);
        // semanas gravadas da janela que ainda não vieram do Apps Script: traz o conteúdo antes de montar
        const faltam = lista.filter((s) => this.semanaGravada(s) && !this.gravacaoCarregada(s));
        for (let i = 0; i < faltam.length; i += 4) await this.carregaSemanas(faltam.slice(i, i + 4));
        const itens = [];
        for (const seg of lista) {
          const d = EMP.publica(seg); if (!d) continue;
          const h = hash(JSON.stringify(d));
          if (pub[seg] && pub[seg].hash === h && pub[seg].versao === d.versao) continue;
          itens.push({ seg, versao: d.versao, hash: h, dados: d });
        }
        for (let i = 0; i < itens.length; i += LOTE) {
          const j = await DADOS.pedirApi({ acao: 'publicarSemanas', itens: itens.slice(i, i + LOTE) });
          if (j.publico) this.pubResumo = Object.assign(this.pubResumo || {}, j.publico);
          feitas += (j.feitos || []).length;
        }
      } catch (e) { console.warn('página pública dos empenhos:', e.message || e); }
      finally { this._publicando = false; }
      return feitas;
    },
  });
})();
