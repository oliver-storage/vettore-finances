/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Matching Levenshtein
 */

function calcularSimilaridade(str1, str2) {
  const s1 = String(str1).toLowerCase().trim();
  const s2 = String(str2).toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  const dist = distanciaLevenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  
  return 1 - (dist / maxLen);
}

function distanciaLevenshtein(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[len1][len2];
}

function matchClienteAExtrato(descricaoExtrato, clientes) {
  const matches = [];
  
  clientes.forEach(cliente => {
    const score1 = calcularSimilaridade(descricaoExtrato, cliente.nome_cliente);
    const score2 = cliente.possível_pagante ? calcularSimilaridade(descricaoExtrato, cliente.possível_pagante) : 0;
    const score = Math.max(score1, score2);
    
    if (score > 0.5) {
      matches.push({
        cliente_id: cliente.id,
        cliente_nome: cliente.nome_cliente,
        confianca: parseFloat(score.toFixed(2)),
        tipo_match: score > 0.7 ? 'automático' : 'revisão'
      });
    }
  });
  
  return matches.sort((a, b) => b.confianca - a.confianca)[0] || null;
}

function processarMatchingEmLote(extratos, clientes) {
  const resultado = [];
  
  extratos.forEach(extrato => {
    const match = matchClienteAExtrato(extrato.descricao, clientes);
    
    resultado.push({
      extrato_id: extrato.id,
      ...extrato,
      match_encontrado: !!match,
      cliente_match: match?.cliente_id || null,
      cliente_nome: match?.cliente_nome || '',
      confianca_match: match?.confianca || 0,
      tipo_match: match?.tipo_match || 'nenhum'
    });
  });
  
  return resultado;
}
