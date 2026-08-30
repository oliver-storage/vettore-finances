/**
 * Vettore Finances - Importador de Extratos
 * Suporta XLS, XLSX, OFX
 */

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('📤 Upload iniciado:', file.name);
  
  // Aguardar XLSX estar disponível
  if (typeof XLSX === 'undefined') {
    alert('❌ Sistema de leitura não carregou. Recarregue a página.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para array simples
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('✅ Arquivo lido:', json.length, 'linhas');
      console.log('📋 Primeiras linhas:', json.slice(0, 5));
      
      processarExtratos(json);
    } catch (error) {
      console.error('❌ Erro:', error);
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
    alert('⚠️ Selecione Franquia, Mês e Ano!');
    return;
  }

  // Encontrar header (procura por linha com "Data" ou similar)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, dados.length); i++) {
    const row = dados[i];
    if (!row) continue;
    
    const str = (row.join('') || '').toLowerCase();
    // Procura por qualquer combinação de data, descrição, valor
    if ((str.includes('data') || str.includes('date')) && 
        (str.includes('descri') || str.includes('detail') || str.includes('desc')) && 
        str.includes('valor')) {
      headerIdx = i;
      console.log('✅ Header encontrado na linha:', i);
      break;
    }
  }

  // Se não encontrar, assume que linha 0 é header ou linha com muitos dados
  if (headerIdx === -1) {
    // Procura pela primeira linha com 4+ colunas preenchidas
    for (let i = 0; i < Math.min(20, dados.length); i++) {
      const row = dados[i];
      if (row && row.filter(cell => cell !== null && cell !== undefined && cell !== '').length >= 4) {
        headerIdx = i;
        console.log('✅ Header detectado na linha:', i);
        break;
      }
    }
  }

  if (headerIdx === -1) {
    alert('❌ Não foi possível detectar o formato do arquivo');
    return;
  }

  // Extrair dados
  let extratos = [];
  let dataIdx = 0, descIdx = 1, valIdx = 3, saldoIdx = 4;

  // Processar linhas após o header
  for (let i = headerIdx + 1; i < dados.length; i++) {
    const row = dados[i];
    if (!row || row.length < 2) continue;

    const data = row[dataIdx];
    const descricao = row[descIdx];
    const valor = parseFloat(row[valIdx]) || 0;
    const saldo = parseFloat(row[saldoIdx]) || 0;

    // Pular linhas vazias ou inválidas
    if (!data || !descricao || (valor === 0 && saldo === 0)) continue;

    // Converter data se necessário
    let dataFormatada = data;
    if (typeof data === 'number') {
      // Excel serial date
      const d = new Date((data - 25569) * 86400 * 1000);
      dataFormatada = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    extratos.push({
      id: Date.now() + Math.random(),
      unidade_id: parseInt(franquiaId),
      mes: mes,
      ano: ano,
      data: dataFormatada,
      descricao: String(descricao).trim(),
      valor: Math.abs(valor),
      saldo: saldo,
      tipo_operacao: valor > 0 ? 'crédito' : 'débito',
      tipo_pagamento: 'Importado'
    });
  }

  if (extratos.length === 0) {
    alert('⚠️ Nenhum extrato válido encontrado no arquivo');
    return;
  }

  // Salvar no localStorage
  let extratosExistentes = JSON.parse(localStorage.getItem('extratos') || '[]');
  extratosExistentes = extratosExistentes.concat(extratos);
  localStorage.setItem('extratos', JSON.stringify(extratosExistentes));

  console.log('✅ Importação completa:', extratos.length, 'extratos');
  alert(`✅ ${extratos.length} extratos importados com sucesso!`);
  
  // Limpar e recarregar
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
  
  loadExtratos();
}

function editarExtrato(id) {
  alert('Função será implementada');
}
