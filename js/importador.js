/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Importador XLS
 */

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  document.getElementById('fileName').textContent = `Arquivo: ${file.name}`;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const extratos = processarExtratos(json);
      
      if (extratos.length > 0) {
        salvarExtratos(extratos);
        document.getElementById('resultMsg').textContent = `✓ ${extratos.length} extratos importados com sucesso!`;
        document.getElementById('importResult').style.display = 'block';
        
        // Reload tabela
        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    } catch (error) {
      alert('Erro ao processar arquivo: ' + error.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function processarExtratos(json) {
  const extratos = [];
  let headerRow = -1;
  let colMap = {};
  
  // Encontrar header
  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;
    
    const rowStr = row.join('|').toUpperCase();
    if (rowStr.includes('DATA') && (rowStr.includes('DESCRIÇÃO') || rowStr.includes('VALOR'))) {
      headerRow = i;
      colMap = detectarColunas(row);
      break;
    }
  }
  
  if (headerRow === -1 || Object.keys(colMap).length === 0) {
    alert('Estrutura do arquivo não reconhecida. Certifique-se de ter colunas: Data, Descrição, Valor, Saldo');
    return [];
  }
  
  // Processar dados
  for (let i = headerRow + 1; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0 || !row[colMap.data]) break;
    
    try {
      const valor = parseFloat(String(row[colMap.valor] || 0).replace(/[^\d,-]/g, '').replace(',', '.'));
      const saldo = parseFloat(String(row[colMap.saldo] || 0).replace(/[^\d,-]/g, '').replace(',', '.'));
      
      extratos.push({
        id: Date.now() + extratos.length,
        data: formatarData(row[colMap.data]),
        descricao: String(row[colMap.descricao] || '').trim(),
        valor: valor,
        saldo: saldo,
        tipo_pagamento: detectarTipo(String(row[colMap.descricao] || '')),
        tipo_operacao: valor < 0 ? 'débito' : 'crédito'
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
    const upper = String(col).toUpperCase();
    if (upper.includes('DATA')) map.data = idx;
    if (upper.includes('DESCRIÇÃO') || upper.includes('DESCRICAO')) map.descricao = idx;
    if (upper.includes('VALOR')) map.valor = idx;
    if (upper.includes('SALDO')) map.saldo = idx;
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

function detectarTipo(descricao) {
  const desc = descricao.toUpperCase();
  if (desc.includes('PIX')) return 'PIX';
  if (desc.includes('BOLETO') || desc.includes('COB')) return 'Boleto';
  if (desc.includes('TRANSF') || desc.includes('DOC') || desc.includes('TED')) return 'Transferência';
  return 'Outro';
}

function salvarExtratos(extratos) {
  const existentes = JSON.parse(localStorage.getItem('extratos') || '[]');
  const todos = [...existentes, ...extratos];
  localStorage.setItem('extratos', JSON.stringify(todos));
}
