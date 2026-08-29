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
  reader.onload = (evt) => {
    try {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const extratos = processarExtratos(json);
      
      if (extratos.length > 0) {
        const existentes = JSON.parse(localStorage.getItem('extratos') || '[]');
        const todos = [...existentes, ...extratos];
        localStorage.setItem('extratos', JSON.stringify(todos));
        
        document.getElementById('resultMsg').textContent = `✓ ${extratos.length} extratos importados!`;
        document.getElementById('resultMsg').style.display = 'block';
        
        setTimeout(() => location.reload(), 1500);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function processarExtratos(json) {
  const extratos = [];
  let headerIdx = -1, colMap = {};
  
  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;
    const rowStr = row.join('|').toUpperCase();
    if (rowStr.includes('DATA') && rowStr.includes('VALOR')) {
      headerIdx = i;
      colMap = detectarColunas(row);
      break;
    }
  }
  
  if (headerIdx === -1) return [];
  
  for (let i = headerIdx + 1; i < json.length; i++) {
    const row = json[i];
    if (!row || !row[colMap.data]) break;
    
    try {
      const valor = parseFloat(String(row[colMap.valor] || 0).replace(/[^\d,-]/g, '').replace(',', '.'));
      extratos.push({
        id: Date.now() + extratos.length,
        data: String(row[colMap.data]),
        descricao: String(row[colMap.descricao] || '').trim(),
        valor: valor,
        saldo: parseFloat(String(row[colMap.saldo] || 0).replace(/[^\d,-]/g, '').replace(',', '.')),
        tipo_operacao: valor < 0 ? 'débito' : 'crédito',
        tipo_pagamento: detectarTipo(String(row[colMap.descricao] || ''))
      });
    } catch (e) {}
  }
  
  return extratos;
}

function detectarColunas(row) {
  const map = {};
  row.forEach((col, idx) => {
    const upper = String(col).toUpperCase();
    if (upper.includes('DATA')) map.data = idx;
    if (upper.includes('DESCRIÇÃO') || upper.includes('DESCRICAO')) map.descricao = idx;
    if (upper.includes('VALOR')) map.valor = idx;
    if (upper.includes('SALDO')) map.saldo = idx;
  });
  return map;
}

function detectarTipo(desc) {
  const d = desc.toUpperCase();
  if (d.includes('PIX')) return 'PIX';
  if (d.includes('BOLETO')) return 'Boleto';
  if (d.includes('TRANSF') || d.includes('TED')) return 'Transferência';
  return 'Outro';
}

function loadExtratos() {
  const extratos = JSON.parse(localStorage.getItem('extratos') || '[]');
  const tbody = document.getElementById('tbodyExtratos');
  const table = document.getElementById('extratosTable');
  const empty = document.getElementById('extratosEmpty');
  
  if (extratos.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  tbody.innerHTML = '';
  extratos.forEach(e => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${e.data}</td>
      <td>${e.descricao}</td>
      <td><span class="badge">${e.tipo_pagamento}</span></td>
      <td class="${e.valor < 0 ? 'negativo' : 'positivo'}">R$ ${Math.abs(e.valor).toFixed(2)}</td>
      <td>R$ ${e.saldo.toFixed(2)}</td>
    `;
  });
  
  empty.style.display = 'none';
  table.style.display = 'table';
}
