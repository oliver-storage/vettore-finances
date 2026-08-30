/**
 * Vettore Finances v1.5.2 - Importador Melhorado
 * Adiciona classificação automática e dupla interpretação
 */

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('📤 Upload iniciado:', file.name, 'Tamanho:', file.size);
  
  const franquiaId = document.getElementById('franquiaFilter')?.value;
  const mes = document.getElementById('mesFilter')?.value;
  const ano = document.getElementById('anoFilter')?.value;

  if (!franquiaId || !mes || !ano) {
    alert('⚠️ Selecione Franquia, Mês e Ano!');
    return;
  }

  // Detectar tipo de arquivo
  if (file.name.endsWith('.ofx')) {
    lerOFX(file, franquiaId, mes, ano);
  } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
    lerXLS(file, franquiaId, mes, ano);
  } else {
    alert('❌ Formato não suportado. Use XLS, XLSX ou OFX');
  }
}

function lerOFX(file, franquiaId, mes, ano) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const conteudo = e.target.result;
      const extratos = parseOFX(conteudo, franquiaId, mes, ano);
      
      if (extratos.length === 0) {
        alert('⚠️ Nenhuma transação encontrada no arquivo OFX');
        return;
      }
      
      // Classificar cada lançamento
      extratos.forEach(e => {
        e.classificacao = classificarLancamento(e);
      });
      
      // Mostrar modal de revisão
      mostrarRevisao(extratos, franquiaId, mes, ano);
    } catch (error) {
      console.error('❌ Erro ao processar OFX:', error);
      alert('Erro ao processar arquivo OFX: ' + error.message);
    }
  };
  reader.readAsText(file);
}

function parseOFX(conteudo, franquiaId, mes, ano) {
  let extratos = [];
  
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = regex.exec(conteudo)) !== null) {
    const transacao = match[1];
    
    const trntype = extrairTag(transacao, 'TRNTYPE');
    const dtposted = extrairTag(transacao, 'DTPOSTED');
    const trnamt = parseFloat(extrairTag(transacao, 'TRNAMT')) || 0;
    const memo = extrairTag(transacao, 'MEMO');
    
    if (!dtposted || trnamt === 0) continue;
    
    const ano_ofx = dtposted.substring(0, 4);
    const mes_ofx = dtposted.substring(4, 6);
    const dia_ofx = dtposted.substring(6, 8);
    const data = `${dia_ofx}/${mes_ofx}/${ano_ofx}`;
    
    extratos.push({
      id: Date.now() + Math.random(),
      unidade_id: parseInt(franquiaId),
      mes: mes,
      ano: ano,
      data: data,
      descricao: memo ? memo.trim() : 'Transação',
      valor: Math.abs(trnamt),
      saldo: 0,
      tipo_operacao: trnamt > 0 ? 'crédito' : 'débito',
      tipo_pagamento: 'OFX',
      // Novos campos
      categoria: '',
      cliente: '',
      servico: '',
      tipo_receita: '',
      observacao: ''
    });
  }
  
  console.log('✅ OFX: extratos encontrados:', extratos.length);
  return extratos;
}

function extrairTag(texto, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</`, 'i');
  const match = texto.match(regex);
  return match ? match[1].trim() : '';
}

function lerXLS(file, franquiaId, mes, ano) {
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
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const extratos = parseXLS(json, franquiaId, mes, ano);
      
      if (extratos.length === 0) {
        alert('⚠️ Nenhum extrato válido encontrado no arquivo XLS');
        return;
      }
      
      // Classificar cada lançamento
      extratos.forEach(e => {
        e.classificacao = classificarLancamento(e);
      });
      
      // Mostrar modal de revisão
      mostrarRevisao(extratos, franquiaId, mes, ano);
    } catch (error) {
      console.error('❌ Erro ao processar XLS:', error);
      alert('Erro ao processar arquivo XLS: ' + error.message);
    }
  };
  
  reader.readAsArrayBuffer(file);
}

function parseXLS(dados, franquiaId, mes, ano) {
  let extratos = [];
  
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, dados.length); i++) {
    const row = dados[i];
    if (!row) continue;
    
    const str = (row.join('') || '').toLowerCase();
    if ((str.includes('data') || str.includes('date')) && 
        (str.includes('descri') || str.includes('detail')) && 
        str.includes('valor')) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(20, dados.length); i++) {
      const row = dados[i];
      if (row && row.filter(cell => cell !== null && cell !== undefined && cell !== '').length >= 4) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    throw new Error('Não foi possível detectar o formato do arquivo XLS');
  }

  for (let i = headerIdx + 1; i < dados.length; i++) {
    const row = dados[i];
    if (!row || row.length < 2) continue;

    const data = row[0];
    const descricao = row[1];
    const valor = parseFloat(row[3]) || 0;
    const saldo = parseFloat(row[4]) || 0;

    if (!data || !descricao || (valor === 0 && saldo === 0)) continue;

    let dataFormatada = data;
    if (typeof data === 'number') {
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
      tipo_pagamento: 'XLS',
      // Novos campos
      categoria: '',
      cliente: '',
      servico: '',
      tipo_receita: '',
      observacao: ''
    });
  }

  console.log('✅ XLS: extratos processados:', extratos.length);
  return extratos;
}

// ===== CLASSIFICAÇÃO AUTOMÁTICA =====

function classificarLancamento(lancamento) {
  const texto = lancamento.descricao.toLowerCase();
  
  // Classificação por tipo de operação
  if (texto.includes('pix')) {
    return {
      tipo_receita: 'PIX',
      categoria: lancamento.tipo_operacao === 'débito' ? 'Saída' : 'Entrada',
      confianca: 85
    };
  }
  
  if (texto.includes('boleto') || texto.includes('cobrança')) {
    return {
      tipo_receita: 'Boleto',
      categoria: lancamento.tipo_operacao === 'débito' ? 'Custeio' : 'Receita',
      confianca: 80
    };
  }
  
  if (texto.includes('tarifa') || texto.includes('taxa') || texto.includes('juros')) {
    return {
      tipo_receita: 'Tarifa',
      categoria: 'Custeio',
      confianca: 90
    };
  }
  
  if (texto.includes('aluguel') || texto.includes('locação')) {
    return {
      tipo_receita: 'Aluguel',
      categoria: 'Custeio',
      confianca: 85
    };
  }
  
  if (texto.includes('folha') || texto.includes('salário')) {
    return {
      tipo_receita: 'Folha de Pagamento',
      categoria: 'Custeio',
      confianca: 90
    };
  }
  
  if (texto.includes('consultoria') || texto.includes('serviço') || texto.includes('honorário')) {
    return {
      tipo_receita: 'Serviço',
      categoria: 'Receita',
      confianca: 75
    };
  }
  
  // Default
  return {
    tipo_receita: lancamento.tipo_operacao === 'débito' ? 'Saída' : 'Entrada',
    categoria: lancamento.tipo_operacao === 'débito' ? 'Custeio' : 'Receita',
    confianca: 50
  };
}

// ===== MODAL DE REVISÃO =====

function mostrarRevisao(extratos, franquiaId, mes, ano) {
  // Criar modal se não existir
  let modal = document.getElementById('revisaoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'revisaoModal';
    modal.className = 'modal-revisao';
    document.body.appendChild(modal);
  }

  let html = `
    <div class="modal-content">
      <h2>Revisar Classificações</h2>
      <p class="subtitle">${extratos.length} lançamentos para revisar</p>
      
      <div class="revisao-items" id="revisaoItems">
  `;

  extratos.forEach((e, idx) => {
    html += `
      <div class="revisao-item">
        <div class="revisao-header">
          <strong>${idx + 1}. ${e.descricao}</strong>
          <span class="confianca">Confiança: ${e.classificacao.confianca}%</span>
        </div>
        
        <div class="revisao-fields">
          <div class="field">
            <label>Categoria</label>
            <input type="text" value="${e.categoria}" data-field="categoria" data-idx="${idx}" placeholder="Ex: Serviço, Custeio">
          </div>
          
          <div class="field">
            <label>Tipo de Receita</label>
            <input type="text" value="${e.tipo_receita}" data-field="tipo_receita" data-idx="${idx}" placeholder="Ex: PIX, Boleto">
          </div>
          
          <div class="field">
            <label>Cliente</label>
            <input type="text" value="${e.cliente}" data-field="cliente" data-idx="${idx}" placeholder="Nome do cliente">
          </div>
          
          <div class="field">
            <label>Serviço</label>
            <input type="text" value="${e.servico}" data-field="servico" data-idx="${idx}" placeholder="Tipo de serviço">
          </div>
          
          <div class="field full">
            <label>Observação</label>
            <textarea data-field="observacao" data-idx="${idx}" placeholder="Observações adicionais">${e.observacao}</textarea>
          </div>
          
          <div class="field readonly">
            <label>Valor</label>
            <input type="text" value="R$ ${e.valor.toFixed(2)}" disabled>
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" onclick="fecharRevisao()">Cancelar</button>
        <button class="btn-primary" onclick="confirmarImportacao('${franquiaId}', '${mes}', '${ano}')">Importar</button>
      </div>
    </div>
  `;

  modal.innerHTML = html;
  modal.style.display = 'flex';
  
  // Armazenar extratos para confirmação
  window.extratosRevisao = extratos;
}

function fecharRevisao() {
  document.getElementById('revisaoModal').style.display = 'none';
}

function confirmarImportacao(franquiaId, mes, ano) {
  const inputs = document.querySelectorAll('[data-field]');
  
  // Atualizar dados com valores editados
  inputs.forEach(input => {
    const idx = parseInt(input.dataset.idx);
    const field = input.dataset.field;
    window.extratosRevisao[idx][field] = input.value;
  });

  salvarExtratos(window.extratosRevisao);
  fecharRevisao();
}

// ===== SALVAR =====

function salvarExtratos(extratos) {
  let extratosExistentes = JSON.parse(localStorage.getItem('extratos') || '[]');
  extratosExistentes = extratosExistentes.concat(extratos);
  localStorage.setItem('extratos', JSON.stringify(extratosExistentes));

  console.log('✅ Salvos no banco de dados:', extratos.length);
  alert(`✅ ${extratos.length} extratos importados com sucesso!`);
  
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
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">Nenhum extrato</td></tr>';
    return;
  }

  extratos.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.data}</td>
      <td>${e.descricao}</td>
      <td><span class="badge">${e.tipo_operacao}</span></td>
      <td>R$ ${parseFloat(e.valor).toFixed(2)}</td>
      <td>${e.saldo ? `R$ ${parseFloat(e.saldo).toFixed(2)}` : '-'}</td>
      <td>${e.categoria || '-'}</td>
      <td>${e.cliente || '-'}</td>
      <td>
        <button class="btn-small" onclick="editarExtrato(${e.id})">Editar</button>
        <button class="btn-danger-small" onclick="deletarExtrato(${e.id})">Deletar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editarExtrato(id) {
  const extratos = JSON.parse(localStorage.getItem('extratos') || '[]');
  const extrato = extratos.find(e => e.id === id);
  
  if (!extrato) return;
  
  const novaCategoria = prompt('Categoria:', extrato.categoria);
  if (novaCategoria !== null) {
    extrato.categoria = novaCategoria;
    localStorage.setItem('extratos', JSON.stringify(extratos));
    loadExtratos();
  }
}

function deletarExtrato(id) {
  if (!confirm('Deletar este extrato?')) return;
  
  let extratos = JSON.parse(localStorage.getItem('extratos') || '[]');
  extratos = extratos.filter(e => e.id !== id);
  localStorage.setItem('extratos', JSON.stringify(extratos));
  
  loadExtratos();
}
