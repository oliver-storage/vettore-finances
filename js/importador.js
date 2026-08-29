/**
 * Vettore Finances - Importador de Extratos
 * Processamento de XLS/XLSX via XLSX library
 */

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Aguardar XLSX estar disponível
  if (typeof XLSX === 'undefined') {
    console.error('❌ XLSX não disponível');
    alert('XLSX não carregou. Recarregue a página.');
    return;
  }

  console.log('📤 Processando arquivo:', file.name);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON (array com headers)
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('✅ Arquivo lido:', json.length, 'linhas');
      
      processarExtratos(json);
    } catch (error) {
      console.error('❌ Erro ao processar:', error);
      alert('Erro ao processar arquivo: ' + error.message);
    }
  };
  
  reader.readAsArrayBuffer(file);
}

function processarExtratos(dados) {
  const franquiaId = document.getElementById('franquiaFilter')?.value;
  const mes = document.getElementById('mesFilter')?.value;
  const ano = document.getElementById('anoFilter')?.value;

  if (!franquiaId || !mes || !ano) {
    alert('⚠️ Selecione Franquia, Mês e Ano antes de importar!');
    return;
  }

  let headerRow = null;
  let extratos = [];

  // Procurar header
  for (let i = 0; i < Math.min(20, dados.length); i++) {
    const row = dados[i];
    if (!row || row.length === 0) continue;
    
    const rowStr = row.join('').toLowerCase();
    if (rowStr.includes('data') && rowStr.includes('descri') && rowStr.includes('valor')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === null) {
    alert('❌ Header não encontrado no arquivo');
    return;
  }

  console.log('📋 Header encontrado na linha:', headerRow);

  // Processar dados
  for (let i = headerRow + 1; i < dados.length; i++) {
    const row = dados[i];
    if (!row || row.length < 3) continue;

    const data = row[0];
    const descricao = row[1];
    const valor = parseFloat(row[3]) || 0;
    const saldo = parseFloat(row[4]) || 0;

    if (!data || !descricao || valor === 0) continue;

    const tipo = valor > 0 ? 'crédito' : 'débito';

    extratos.push({
      id: Date.now() + Math.random(),
      unidade_id: parseInt(franquiaId),
      mes: mes,
      ano: ano,
      data: data,
      descricao: descricao,
      valor: Math.abs(valor),
      saldo: saldo,
      tipo_operacao: tipo,
      tipo_pagamento: 'Importado'
    });
  }

  if (extratos.length === 0) {
    alert('⚠️ Nenhum extrato encontrado no arquivo');
    return;
  }

  // Salvar
  let extratosExistentes = JSON.parse(localStorage.getItem('extratos') || '[]');
  extratosExistentes = extratosExistentes.concat(extratos);
  localStorage.setItem('extratos', JSON.stringify(extratosExistentes));

  console.log('✅ Importados:', extratos.length, 'extratos');
  alert(`✅ ${extratos.length} extratos importados com sucesso!`);

  // Limpar input e recarregar
  document.getElementById('fileInput').value = '';
  if (typeof loadExtratos === 'function') {
    loadExtratos();
  }
}

function loadExtratos() {
  const franquiaId = document.getElementById('franquiaFilter')?.value;
  const mes = document.getElementById('mesFilter')?.value;
  const ano = document.getElementById('anoFilter')?.value;

  let extratos = JSON.parse(localStorage.getItem('extratos') || '[]');

  if (franquiaId) extratos = extratos.filter(e => e.unidade_id === parseInt(franquiaId));
  if (mes) extratos = extratos.filter(e => e.mes === mes);
  if (ano) extratos = extratos.filter(e => e.ano === ano);

  const tbody = document.getElementById('tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (extratos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Nenhum extrato encontrado</td></tr>';
    return;
  }

  extratos.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.data}</td>
      <td>${e.descricao}</td>
      <td><span class="badge">${e.tipo_operacao}</span></td>
      <td>R$ ${parseFloat(e.valor).toFixed(2)}</td>
      <td>R$ ${parseFloat(e.saldo).toFixed(2)}</td>
      <td>
        <button class="btn-edit" onclick="editarExtrato(${e.id})">Editar</button>
        <button class="btn-danger" onclick="deletarExtrato(${e.id})">Deletar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deletarExtrato(id) {
  if (!confirm('Deletar este extrato?')) return;
  
  let extratos = JSON.parse(localStorage.getItem('extratos') || '[]');
  extratos = extratos.filter(e => e.id !== id);
  localStorage.setItem('extratos', JSON.stringify(extratos));
  
  if (typeof loadExtratos === 'function') loadExtratos();
}

function editarExtrato(id) {
  alert('Função de edição será implementada');
}
