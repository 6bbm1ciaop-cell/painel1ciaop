/* ==========================================================================
   DADOS › API — comunicação com o Apps Script (back-end)
   Toda chamada ao Apps Script passa por DADOS.pedirApi({ acao, ... }).
   Sem "acao", o Apps Script devolve todas as planilhas (dados + avisos).
   Ações: login, loginGoogle, usuarios, salvarUsuario, foto, salvarRegistro… (ver apps-script/Code.gs → responder_).
   Erros saem com .codigo: CONFIG, REDE, FORMATO, NAO_AUTENTICADO, TOKEN_INVALIDO, ACESSO_NEGADO, SESSAO_EXPIRADA.
   ========================================================================== */
(function () {
  const C = window.APP_CONFIG;

  /** Envia um pedido ao Apps Script e devolve o JSON da resposta (lança erro se ok = false). */
  /* Aquecimento: assim que a tela de entrada aparece, pede ao Apps Script para já ir lendo as planilhas
     (enquanto a pessoa digita a senha ou escolhe a conta Google). Não devolve dado nenhum; uma vez só. */
  let aquecido = false;
  DADOS.aquecer = function () {
    if (aquecido || C.fonteDados !== 'sheets' || !C.appsScriptUrl) return;
    aquecido = true;
    fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ acao: 'aquecer' }) }).catch(() => { /* só otimização */ });
  };

  /* Planilhas no formato compacto do Code.gs 5.4 ({ cab, lin, rep }) → linhas { título: valor }.
     aoRep(k, n): respostas repetidas que o Apps Script já deixou de fora. */
  DADOS.expande = function (dados, aoRep) {
    const out = {};
    Object.keys(dados || {}).forEach((k) => {
      const v = dados[k];
      if (v && !Array.isArray(v) && Array.isArray(v.cab) && Array.isArray(v.lin)) {
        out[k] = v.lin.map((l) => { const o = {}; v.cab.forEach((h, i) => { o[h] = l[i]; }); return o; });
        if (aoRep && v.rep) aoRep(k, v.rep);
      } else out[k] = v;
    });
    return out;
  };

  DADOS.pedirApi = async function (extra = {}) {
    if (!C.appsScriptUrl) throw Object.assign(new Error('Informe a URL do Apps Script em config.js (appsScriptUrl).'), { codigo: 'CONFIG' });
    let resp;
    try {
      // text/plain evita a verificação prévia de CORS; o Apps Script lê o corpo em doPost
      resp = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: window.AUTH ? AUTH.token : '' }, extra)) });
    } catch (e) {
      throw Object.assign(new Error('Sem resposta do Apps Script. Confira a URL, a implantação ("Qualquer pessoa") e a conexão.'), { codigo: 'REDE' });
    }
    let j;
    try { j = await resp.json(); } catch (e) { throw Object.assign(new Error('O Apps Script não devolveu JSON. Verifique se a implantação está como "App da Web" e acesso "Qualquer pessoa".'), { codigo: 'FORMATO' }); }
    if (!j.ok) {
      const cod = String(j.erro || '').split(':')[0];
      const msg = { NAO_AUTENTICADO: 'Entre para continuar.', TOKEN_INVALIDO: 'Sua sessão expirou. Entre novamente.', ACESSO_NEGADO: `O acesso do e-mail ${String(j.erro).split(':')[1] || ''} ao painel foi retirado pelo administrador.`, SESSAO_EXPIRADA: `A sessão passou de ${String(j.erro).split(':')[1] || 24} horas. Entre novamente.` }[cod] || j.erro;
      throw Object.assign(new Error(msg), { codigo: cod });
    }
    if (window.AUTH) AUTH.renova();   // o Apps Script renovou a sessão
    return j;
  };
})();
