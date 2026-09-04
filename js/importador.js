/**
 * Vettore Finances - Importador de Extratos v1.7.0
 * Salva em Supabase com suporte a edição
 */

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('📤 Upload iniciado:', file.name);
  
  const franquiaId = document.getElementById('franquiaFilter')?.value;
  const mes = document.getElementById('mesFilter')?.value;
  const ano = document.getElementById('anoFilter')?.value;

  if (!franquiaId || !mes || !ano) {
    alert('⚠️ Selecione Franquia, Mês e Ano!');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('❌ XLSX não disponível');
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
        alert('⚠️ Nenhum extrato válido encontrado');
        return;
      }
      
      salvarExtratosSupabase(extratos);
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('Erro: ' + error.message);
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
    throw new Error('Não foi possível detectar o formato');
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
      unidade_id: parseInt(franquiaId),
      mes: mes,
      ano: ano,
      data: dataFormatada,
      descricao: String(descricao).trim(),
      descricao_editada: null,
      valor: Math.abs(valor),
      saldo: saldo,
      tipo_operacao: valor > 0 ? 'crédito' : 'débito',
      tipo_pagamento: 'XLS'
    });
  }

  return extratos;
}

async function salvarExtratosSupabase(extratos) {
  try {
    for (const extrato of extratos) {
      await SupabaseAPI.insert('extratos', extrato);
    }

    console.log('✅ Importados:', extratos.length);
    alert(`✅ ${extratos.length} extratos importados com sucesso!`);
    
    document.getElementById('fileInput').value = '';
    if (typeof loadExtratos === 'function') {
      loadExtratos();
    }
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    alert('Erro ao salvar: ' + error.message);
  }
}

async function loadExtratos() {
  const franquiaId = document.getElementById('franquiaFilter')?.value;
  const mes = document.getElementById('mesFilter')?.value;
  const ano = document.getElementById('anoFilter')?.value;

  try {
    let extratos = await SupabaseAPI.get('extratos');

    if (franquiaId) extratos = extratos.filter(e => e.unidade_id === parseInt(franquiaId));
    if (mes) extratos = extratos.filter(e => e.mes === mes);
    if (ano) extratos = extratos.filter(e => e.ano === ano);

    const tbody = document.getElementById('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (extratos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Nenhum extrato</td></tr>';
      return;
    }

    extratos.forEach(e => {
      const tr = document.createElement('tr');
      const descricaoExibir = e.descricao_editada || e.descricao;
      
      tr.innerHTML = `
        <td>${e.data}</td>
        <td title="${e.descricao}">${descricaoExibir}</td>
        <td><span class="badge">${e.tipo_operacao}</span></td>
        <td>R$ ${parseFloat(e.valor).toFixed(2)}</td>
        <td>R$ ${parseFloat(e.saldo).toFixed(2)}</td>
        <td>
          <button class="btn-edit" onclick="abrirEdicao(${e.id}, '${e.descricao}', '${e.descricao_editada || e.descricao}')">Editar</button>
          <button class="btn-danger" onclick="deletarExtrato(${e.id})">Deletar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('❌ Erro ao carregar:', error);
  }
}

async function abrirEdicao(id, descricaoOriginal, descricaoEditada) {
  const novaDescricao = prompt(`Editar descrição:\n\nOriginal: ${descricaoOriginal}\n\nNova:`, descricaoEditada);
  
  if (novaDescricao !== null && novaDescricao !== descricaoEditada) {
    await SupabaseAPI.update('extratos', id, { descricao_editada: novaDescricao });
    loadExtratos();
    alert('✅ Descrição atualizada!');
  }
}

async function deletarExtrato(id) {
  if (!confirm('Deletar este extrato?')) return;
  
  try {
    await SupabaseAPI.delete('extratos', id);
    loadExtratos();
  } catch (error) {
    console.error('❌ Erro:', error);
    alert('Erro ao deletar: ' + error.message);
  }
}
