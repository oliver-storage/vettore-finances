/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Importador XLS
 */

async function importarExtratoXLS(file) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const extratos = processarDadosExtrato(json);
    
    if (extratos.length > 0) {
      renderizarTabela(extratos);
      salvarExtratos(extratos);
      mostrarMensagem(`${extratos.length} extratos importados com sucesso!`);
    } else {
      alert('Nenhum dado encontrado no arquivo');
    }
  } catch (error) {
    console.error('Erro ao importar:', error);
    alert('Erro ao importar arquivo: ' + error.message);
  }
}

function processarDadosExtrato(json) {
  const extratos = [];
  let startRow = 0;
  let colMap = {};
  
  // Encontrar header
  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;
    
    const rowStr = row.join('|').toUpperCase();
    if (rowStr.includes('DATA') || rowStr.includes('DATA DE')) {
      colMap = detectarColunas(row);
      startRow = i + 1;
      break;
    }
  }
  
  if (Object.keys(colMap).length === 0) return [];
  
  // Processar linhas
  for (let i = startRow; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0 || !row[colMap.data]) break;
    
    try {
      const valor = parseFloat(String(row[colMap.valor] || 0).replace(/[^\d,-]/g, '').replace(',', '.'));
      
      extratos.push({
        data: formatarData(row[colMap.data]),
        descricao: String(row[colMap.descricao] || '').trim(),
        valor: valor,
        saldo: parseFloat(String(row[colMap.saldo] || 0).replace(/[^\d,-]/g, '').replace(',', '.')),
        tipo_operacao: valor < 0 ? 'débito' : 'crédito',
        tipo_pagamento: detectarTipoPagamento(String(row[colMap.descricao] || '')),
        documento: row[colMap.documento] || '',
        data_importacao: new Date().toLocaleDateString('pt-BR')
      });
    } catch (e) {
      console.warn('Erro ao processar linha:', e);
    }
  }
  
  return extratos;
}

function detectarColunas(headerRow) {
  const map = {};
  
  headerRow.forEach((col, idx) => {
    if (!col) return;
    const colUpper = String(col).toUpperCase();
    
    if (colUpper.includes('DATA')) map.data = idx;
    if (colUpper.includes('DESCRIÇÃO') || colUpper.includes('DESCRICAO')) map.descricao = idx;
    if (colUpper.includes('VALOR')) map.valor = idx;
    if (colUpper.includes('SALDO')) map.saldo = idx;
    if (colUpper.includes('DOCUMENTO') || colUpper.includes('DOC')) map.documento = idx;
  });
  
  return map;
}

function formatarData(data) {
  if (!data) return '';
  if (typeof data === 'number') {
    const epoch = new Date(1900, 0, data);
    return epoch.toLocaleDateString('pt-BR');
  }
  return String(data);
}

function detectarTipoPagamento(descricao) {
  if (!descricao) return 'outro';
  const desc = descricao.toUpperCase();
  
  if (desc.includes('PIX')) return 'pix';
  if (desc.includes('BOLETO') || desc.includes('COB')) return 'boleto';
  if (desc.includes('TRANSF') || desc.includes('DOC') || desc.includes('TED')) return 'transferencia';
  if (desc.includes('TARIFA')) return 'tarifa';
  
  return 'outro';
}

function renderizarTabela(extratos) {
  const table = document.getElementById('extratosTable');
  const tbody = document.getElementById('tbody-extratos');
  
  tbody.innerHTML = '';
  
  extratos.forEach((e, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${e.data}</td>
      <td>${e.descricao}</td>
      <td><span class="badge ${e.tipo_pagamento}">${e.tipo_pagamento}</span></td>
      <td class="${e.valor < 0 ? 'negativo' : 'positivo'}">R$ ${Math.abs(e.valor).toFixed(2)}</td>
      <td>R$ ${e.saldo.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
  
  table.style.display = 'table';
}

function salvarExtratos(extratos) {
  try {
    const existentes = JSON.parse(localStorage.getItem('extratos') || '[]');
    const todos = [...existentes, ...extratos];
    localStorage.setItem('extratos', JSON.stringify(todos));
    console.log('Extratos salvos:', todos.length);
  } catch (error) {
    console.error('Erro ao salvar:', error);
  }
}

function mostrarMensagem(msg) {
  const resultado = document.getElementById('resultado');
  const msgEl = document.getElementById('msg-resultado');
  
  if (resultado && msgEl) {
    msgEl.textContent = msg;
    resultado.style.display = 'block';
  }
}
