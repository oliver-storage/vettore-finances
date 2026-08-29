/**
 * VA Business - Vettore Finances v1.3.9
 * Desenvolvido por OliverStorage
 * Módulo: Importador de Extratos XLS/XLSX
 */

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const fileName = document.getElementById('fileName');
  const resultMsg = document.getElementById('resultMsg');
  
  console.log('📤 Iniciando upload:', file.name);
  
  // Validar filtros
  const franquiaFilt = document.getElementById('inputFranquiaFilt')?.value;
  const mesFilt = document.getElementById('inputMesFilt')?.value;
  const anoFilt = document.getElementById('inputAnoFilt')?.value;
  
  console.log('🔍 Validando filtros:');
  console.log('  Franquia:', franquiaFilt, franquiaFilt ? '✓' : '❌');
  console.log('  Mês:', mesFilt, mesFilt ? '✓' : '❌');
  console.log('  Ano:', anoFilt, anoFilt ? '✓' : '❌');
  
  if (!franquiaFilt || !mesFilt || !anoFilt) {
    resultMsg.textContent = '❌ Erro: Preencha Franquia, Mês e Ano antes de importar!';
    resultMsg.style.display = 'block';
    resultMsg.style.background = '#ffebee';
    resultMsg.style.color = '#c62828';
    fileName.textContent = '✗ Preencha todos os filtros';
    return;
  }
  
  fileName.textContent = `📂 ${file.name} (processando...)`;
  resultMsg.style.display = 'none';
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      console.log('=== IMPORTADOR XLS ===');
      console.log('Arquivo:', file.name);
      console.log('Tamanho:', (file.size / 1024).toFixed(2), 'KB');
      console.log('Filtros: Franquia=' + franquiaFilt + ', Mês=' + mesFilt + ', Ano=' + anoFilt);
      
      // Verificar XLSX
      if (typeof XLSX === 'undefined') {
        throw new Error('XLSX não disponível. Recarregue a página.');
      }
      
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('✓ Arquivo lido');
      console.log('  Planilha:', workbook.SheetNames[0]);
      console.log('  Linhas:', json.length);
      console.log('  Primeiras 10 linhas:');
      
      json.slice(0, 10).forEach((row, i) => {
        console.log(`    [${i}]`, row);
      });
      
      if (!json || json.length === 0) {
        throw new Error('Arquivo vazio ou sem dados');
      }
      
      // Processar com os filtros obtidos
      const extratos = processarExtratos(json, franquiaFilt, mesFilt, anoFilt);
      
      if (extratos.length === 0) {
        throw new Error('Nenhum lançamento válido encontrado. Verifique se há colunas DATA e VALOR');
      }
      
      // Salvar
      const existentes = JSON.parse(localStorage.getItem('extratos') || '[]');
      const todos = [...existentes, ...extratos];
      localStorage.setItem('extratos', JSON.stringify(todos));
      
      // Feedback
      fileName.textContent = `✓ ${file.name} (${extratos.length} lançamentos)`;
      resultMsg.textContent = `✓ Importação concluída! ${extratos.length} lançamento(s) adicionado(s).`;
      resultMsg.style.display = 'block';
      resultMsg.style.background = '#e8f5e9';
      resultMsg.style.color = '#2e7d32';
      
      console.log('✓ Salvos na localStorage:', extratos.length, 'extratos');
      console.log('=== FIM ===\n');
      
      // Recarregar tabela
      setTimeout(() => loadExtratos(), 500);
      
    } catch (error) {
      console.error('❌ Erro na importação:', error.message);
      console.error('Stack:', error.stack);
      
      fileName.textContent = `✗ ${file.name}`;
      resultMsg.textContent = `❌ Erro: ${error.message}`;
      resultMsg.style.display = 'block';
      resultMsg.style.background = '#ffebee';
      resultMsg.style.color = '#c62828';
    }
  };
  
  reader.onerror = () => {
    console.error('❌ Erro ao ler arquivo');
    fileName.textContent = `✗ Erro ao ler`;
    resultMsg.textContent = '❌ Erro ao ler arquivo';
    resultMsg.style.display = 'block';
    resultMsg.style.background = '#ffebee';
    resultMsg.style.color = '#c62828';
  };
  
  reader.readAsArrayBuffer(file);
}

function detectarColunas(row) {
  const map = {};
  
  if (!row) return map;
  
  row.forEach((col, idx) => {
    if (col === null || col === undefined || col === '') return;
    
    const upper = String(col).toUpperCase().trim();
    
    // Remover "(R$)" e caracteres especiais
    const limpo = upper
      .replace(/[\(\)R\$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Detectar colunas
    if (limpo.includes('DATA')) {
      map.data = idx;
      console.log(`  ✓ DATA detectada na coluna ${idx}`);
    }
    if (limpo.includes('DESCRIÇÃO') || limpo.includes('DESCRICAO') || limpo.includes('HISTÓRICO') || limpo.includes('HISTORICO')) {
      map.descricao = idx;
      console.log(`  ✓ DESCRIÇÃO detectada na coluna ${idx}`);
    }
    if (limpo.includes('VALOR') || limpo.includes('DÉBITO') || limpo.includes('CREDITO')) {
      map.valor = idx;
      console.log(`  ✓ VALOR detectada na coluna ${idx}`);
    }
    if (limpo.includes('SALDO')) {
      map.saldo = idx;
      console.log(`  ✓ SALDO detectada na coluna ${idx}`);
    }
    if (limpo.includes('DOCUMENTO')) {
      map.documento = idx;
      console.log(`  ℹ DOCUMENTO detectado na coluna ${idx}`);
    }
  });
  
  return map;
}

function processarExtratos(json, franquiaId, mes, ano) {
  console.log('📋 Processando extratos...');
  console.log('  Franquia ID:', franquiaId);
  console.log('  Período:', mes + '/' + ano);
  
  // Procurar header
  let headerIdx = -1;
  let colMap = {};
  
  console.log('🔍 Procurando header...');
  for (let i = 0; i < Math.min(json.length, 20); i++) {
    const row = json[i];
    if (!row || row.length < 2) continue;
    
    colMap = detectarColunas(row);
    
    if (colMap.data !== undefined && colMap.valor !== undefined) {
      headerIdx = i;
      console.log(`✓ Header encontrado na linha ${i}`);
      break;
    }
  }
  
  if (headerIdx === -1) {
    console.error('❌ Header não encontrado!');
    console.error('Primeiras 10 linhas:', JSON.stringify(json.slice(0, 10)));
    throw new Error('Arquivo inválido: não encontrados campos DATA e VALOR');
  }
  
  // Fallback se descrição não encontrada
  if (colMap.descricao === undefined) {
    colMap.descricao = Math.min(colMap.data + 1, colMap.valor - 1);
    console.log(`ℹ DESCRIÇÃO ajustada para coluna ${colMap.descricao}`);
  }
  
  // Fallback se saldo não encontrado
  if (colMap.saldo === undefined) {
    colMap.saldo = colMap.valor + 1;
    console.log(`ℹ SALDO ajustado para coluna ${colMap.saldo}`);
  }
  
  const extratos = [];
  
  console.log(`📊 Processando linhas ${headerIdx + 1} a ${json.length}...`);
  for (let i = headerIdx + 1; i < json.length; i++) {
    const row = json[i];
    
    if (!row || row.length === 0) break;
    if (!row[colMap.data]) continue; // Skip linhas sem data
    
    try {
      // Extrair dados
      const dataRaw = row[colMap.data];
      const dataStr = String(dataRaw || '').trim();
      
      const descricaoRaw = row[colMap.descricao];
      const descStr = String(descricaoRaw || '').trim();
      
      const valorRaw = row[colMap.valor];
      const valorStr = String(valorRaw || '0')
        .replace(/[^\d,-]/g, '')
        .replace(',', '.');
      
      const saldoRaw = row[colMap.saldo];
      const saldoStr = String(saldoRaw || '0')
        .replace(/[^\d,-]/g, '')
        .replace(',', '.');
      
      const valor = parseFloat(valorStr || 0);
      const saldo = parseFloat(saldoStr || 0);
      
      // Validar linha
      if (dataStr && !isNaN(valor) && valor !== 0) {
        extratos.push({
          id: Date.now() + extratos.length,
          unidade_id: parseInt(franquiaId),
          mes: mes,
          ano: ano,
          data: dataStr,
          descricao: descStr,
          valor: valor,
          saldo: saldo,
          tipo_operacao: valor < 0 ? 'débito' : 'crédito',
          tipo_pagamento: detectarTipo(descStr)
        });
      }
    } catch (e) {
      console.warn(`⚠ Erro na linha ${i}:`, e.message);
    }
  }
  
  console.log(`✓ Total processado: ${extratos.length} extratos válidos`);
  return extratos;
}

function detectarTipo(descricao) {
  if (!descricao) return 'Outro';
  
  const desc = descricao.toUpperCase();
  
  if (desc.includes('PIX')) return 'PIX';
  if (desc.includes('BOLETO') || desc.includes('BANCO')) return 'Boleto';
  if (desc.includes('TED') || desc.includes('TRANSFERÊNCIA') || desc.includes('TRANSFERENCIA')) return 'Transferência';
  if (desc.includes('SALDO')) return 'Saldo';
  if (desc.includes('CHEQUE')) return 'Cheque';
  
  return 'Outro';
}

function loadExtratos() {
  console.log('📊 Carregando extratos...');
  
  const user = JSON.parse(localStorage.getItem('currentUser'));
  let extratos = JSON.parse(localStorage.getItem('extratos') || '[]');
  
  const franquiaFilt = document.getElementById('inputFranquiaFilt')?.value;
  const mesFilt = document.getElementById('inputMesFilt')?.value;
  const anoFilt = document.getElementById('inputAnoFilt')?.value;
  
  console.log('  Filtros: Franquia=' + franquiaFilt + ', Mês=' + mesFilt + ', Ano=' + anoFilt);
  console.log('  Total antes de filtro:', extratos.length);
  
  // Filtrar por franquia
  if (franquiaFilt) {
    extratos = extratos.filter(e => e.unidade_id === parseInt(franquiaFilt));
  } else if (user.perfil !== 'administrador') {
    extratos = extratos.filter(e => e.unidade_id === user.unidade_id);
  }
  
  console.log('  Após filtro franquia:', extratos.length);
  
  // Filtrar por mês e ano
  if (mesFilt && anoFilt) {
    extratos = extratos.filter(e => e.mes === mesFilt && e.ano === anoFilt);
  }
  
  console.log('  Após filtro período:', extratos.length);
  
  const tbody = document.getElementById('tbodyExtratos');
  const table = document.getElementById('extratosTable');
  const empty = document.getElementById('extratosEmpty');
  
  if (extratos.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    console.log('  Nenhum resultado');
    return;
  }
  
  tbody.innerHTML = '';
  extratos.forEach(e => {
    const podeEditar = user.perfil === 'administrador' || user.perfil === 'gerente';
    
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${e.data}</td>
      <td>${e.descricao}</td>
      <td><span class="badge">${e.tipo_pagamento}</span></td>
      <td class="${e.valor < 0 ? 'negativo' : 'positivo'}">R$ ${Math.abs(e.valor).toFixed(2)}</td>
      <td>R$ ${e.saldo.toFixed(2)}</td>
      <td>
        ${podeEditar ? `<button class="btn-edit" onclick="editarExtrato(${e.id})">Editar</button>` : ''}
        ${podeEditar ? `<button class="btn-danger" onclick="deleteExtrato(${e.id})">Deletar</button>` : '-'}
      </td>
    `;
  });
  
  empty.style.display = 'none';
  table.style.display = 'table';
  console.log('✓ Tabela atualizada:', extratos.length, 'registros');
}

function editarExtrato(id) {
  alert('Edição de extratos - Em breve');
}

function deleteExtrato(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  
  if (user.perfil !== 'administrador' && user.perfil !== 'gerente') {
    alert('Sem permissão para deletar');
    return;
  }
  
  if (!confirm('Deletar lançamento? Esta ação é irreversível.')) return;
  
  let extratos = JSON.parse(localStorage.getItem('extratos') || '[]');
  extratos = extratos.filter(e => e.id !== id);
  localStorage.setItem('extratos', JSON.stringify(extratos));
  loadExtratos();
  alert('Lançamento deletado!');
}

function aplicarFiltros() {
  console.log('🔄 Aplicando filtros...');
  loadExtratos();
}
