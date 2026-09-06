/**
 * Vettore Finances - Módulo Boletos v1.9.7.0
 */

let BOLETOS_CACHE = [];
let UNIDADE_ATIVA_BOLETO = null;

function handleFileUploadBoleto(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  const user = JSON.parse(localStorage.getItem('currentUser'));
  const franquiaFilter = document.getElementById('franquiaFilter');
  const unidadeIdAtivo = user.perfil === 'administrador' && franquiaFilter
    ? parseInt(franquiaFilter.value)
    : user.unidade_id;

  if (!unidadeIdAtivo) {
    alert('⚠️ Selecione uma franquia antes de importar');
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

      const { agencia, conta } = extrairContaBoleto(json);
      const boletos = parseBoletos(json, unidadeIdAtivo, agencia, conta);

      if (boletos.length === 0) {
        alert('⚠️ Nenhum boleto válido encontrado');
        return;
      }

      salvarBoletosSupabase(boletos, agencia, conta);
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('Erro: ' + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

function extrairContaBoleto(dados) {
  let agencia = '';
  let conta = '';

  for (let i = 0; i < Math.min(10, dados.length); i++) {
    const row = dados[i];
    if (!row || !row[0]) continue;
    const label = String(row[0]).toLowerCase();
    if (label.includes('cooperativa')) {
      agencia = String(row[1] || '').trim();
    }
    if (label.includes('conta corrente')) {
      conta = String(row[1] || '').trim();
    }
  }

  return { agencia, conta };
}

function parseDataBR(valor) {
  if (!valor) return null;
  if (typeof valor === 'number') {
    const d = new Date((valor - 25569) * 86400 * 1000);
    return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const s = String(valor).trim();
  const partes = s.split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }
  return null;
}

function parseValorBRBoleto(valor) {
  if (typeof valor === 'number') return valor;
  if (!valor) return null;
  const cleaned = String(valor).trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseBoletos(dados, unidadeId, agencia, conta) {
  let boletos = [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(30, dados.length); i++) {
    const row = dados[i];
    if (!row) continue;
    const str = (row.join('') || '').toLowerCase();
    if (str.includes('nosso') && str.includes('pagador')) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error('Não foi possível encontrar o cabeçalho da tabela (Cart, Nº Doc, Nosso Nº, Pagador...)');
  }

  for (let i = headerIdx + 1; i < dados.length; i++) {
    const row = dados[i];
    if (!row || row.length < 5) continue;

    const carteira = row[0];
    const numDoc = row[1];
    const nossoNumero = row[2];
    const txid = row[3];
    const pagador = row[4];
    const dataVencimento = row[5];
    const dataLiquidacao = row[6];
    const valor = row[7];
    const valorLiquidacao = row[8];
    const situacao = row[9];
    const motivo = row[10];

    if (!pagador && !nossoNumero) continue;

    boletos.push({
      unidade_id: unidadeId,
      agencia: agencia || null,
      conta: conta || null,
      carteira: carteira ? String(carteira).trim() : null,
      num_doc: numDoc ? String(numDoc).trim() : null,
      nosso_numero: nossoNumero ? String(nossoNumero).trim() : null,
      txid: txid ? String(txid).trim() : null,
      pagador: pagador ? String(pagador).trim() : null,
      data_vencimento: parseDataBR(dataVencimento),
      data_liquidacao: parseDataBR(dataLiquidacao),
      valor: parseValorBRBoleto(valor),
      valor_liquidacao: parseValorBRBoleto(valorLiquidacao),
      situacao: situacao ? String(situacao).trim() : null,
      motivo: motivo ? String(motivo).trim() : null
    });
  }

  return boletos;
}

async function salvarBoletosSupabase(boletos, agencia, conta) {
  const unidadeId = boletos[0]?.unidade_id;
  const existentes = await SupabaseAPI.get('boletos');
  const chaveBoleto = (b) => b.txid ? `txid:${b.txid}` : `nn:${b.nosso_numero}|${b.data_vencimento}|${b.valor}`;
  const chavesExistentes = new Set(
    existentes
      .filter(b => b.unidade_id === unidadeId)
      .map(chaveBoleto)
  );

  const novos = boletos.filter(b => !chavesExistentes.has(chaveBoleto(b)));
  const duplicados = boletos.length - novos.length;

  if (novos.length === 0) {
    alert(`⚠️ Todos os ${duplicados} boleto(s) desse arquivo já foram importados antes. Nada novo pra adicionar.`);
    document.getElementById('fileInputBoleto').value = '';
    return;
  }

  let sucesso = 0;
  const erros = [];

  for (const boleto of novos) {
    try {
      await SupabaseAPI.insert('boletos', boleto);
      sucesso++;
    } catch (error) {
      console.error('❌ Erro ao salvar linha:', boleto, error);
      erros.push({ pagador: boleto.pagador, vencimento: boleto.data_vencimento, erro: error.message });
    }
  }

  if (agencia) document.getElementById('infoAgenciaBoleto').textContent = agencia;
  if (conta) document.getElementById('infoContaBoleto').textContent = conta;

  if (erros.length > 0) {
    console.warn(`⚠️ ${erros.length} linha(s) falharam ao importar:`, erros);
    alert(`⚠️ Importado com falhas: ${sucesso} de ${novos.length} boletos salvos.\n${erros.length} linha(s) falharam — veja o Console (F12) pra detalhes.${duplicados > 0 ? `\n${duplicados} boleto(s) já existiam e foram ignorados.` : ''}`);
  } else {
    alert(`✅ ${sucesso} boletos importados com sucesso!${duplicados > 0 ? `\n${duplicados} boleto(s) já existiam e foram ignorados (não duplicados).` : ''}`);
  }

  if (typeof loadBoletos === 'function') {
    loadBoletos();
  }
}

async function aplicarClientesParametrosBoleto(boletos) {
  const parametros = await SupabaseAPI.get('clientes_parametros');
  if (parametros.length === 0) return boletos;

  const todosPj = await SupabaseAPI.get('clientes_pj');
  const pjMap = {};
  todosPj.forEach(pj => { pjMap[pj.id] = pj.razao_social; });

  const atualizacoes = [];

  const resultado = boletos.map(boleto => {
    if (boleto.cliente || !boleto.pagador) return boleto;

    const param = parametros.find(p =>
      boleto.pagador.toUpperCase().includes(p.palavra_chave)
    );

    if (param && pjMap[param.pj_id]) {
      boleto.cliente = pjMap[param.pj_id];
      boleto._clienteAutoPreenchido = true;
      atualizacoes.push(SupabaseAPI.update('boletos', boleto.id, { cliente: boleto.cliente }));
    }

    return boleto;
  });

  if (atualizacoes.length > 0) {
    await Promise.all(atualizacoes);
  }

  return resultado;
}

function atualizarResumoBoletos(boletos) {
  document.getElementById('cardQtdBoletos').textContent = boletos.length;

  const valorTotal = boletos.reduce((soma, b) => soma + (parseFloat(b.valor) || 0), 0);
  document.getElementById('cardValorBoletos').textContent = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const comCliente = boletos.filter(b => b.cliente && b.cliente.trim() !== '');
  document.getElementById('cardQtdBoletosComCliente').textContent = comCliente.length;

  const valorComCliente = comCliente.reduce((soma, b) => soma + (parseFloat(b.valor) || 0), 0);
  document.getElementById('cardValorBoletosComCliente').textContent = valorComCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const resumo = {};
  (typeof CATEGORIAS !== 'undefined' ? CATEGORIAS : []).forEach(cat => { resumo[cat] = 0; });

  boletos.forEach(b => {
    if (b.categoria && resumo.hasOwnProperty(b.categoria)) {
      resumo[b.categoria] += parseFloat(b.valor) || 0;
    }
  });

  const resumoDiv = document.getElementById('resumoCategoriasBoleto');
  let html = '';

  Object.entries(resumo).forEach(([cat, valor]) => {
    if (valor !== 0) {
      html += `
        <div class="categoria-box">
          <label>${cat}</label>
          <value style="color:var(--destaque);">${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</value>
        </div>
      `;
    }
  });

  if (html) {
    resumoDiv.innerHTML = html;
    resumoDiv.style.display = 'grid';
  } else {
    resumoDiv.style.display = 'none';
  }
}

async function aplicarCategoriaPadraoBoleto(boletos) {
  const atualizacoes = [];

  const resultado = boletos.map(b => {
    if (!b.categoria) {
      b.categoria = 'BOLETOS';
      b._categoriaAutoPreenchida = true;
      atualizacoes.push(SupabaseAPI.update('boletos', b.id, { categoria: 'BOLETOS' }));
    }
    return b;
  });

  if (atualizacoes.length > 0) {
    await Promise.all(atualizacoes);
  }

  return resultado;
}

// ========== LISTAGEM / FILTROS ==========
async function loadBoletos() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const franquiaFilter = document.getElementById('franquiaFilter');
  const unidadeIdAtivo = user.perfil === 'administrador' && franquiaFilter
    ? parseInt(franquiaFilter.value)
    : user.unidade_id;

  const mesAno = document.getElementById('mesAnoFilterBoleto').value; // formato: YYYY-MM

  try {
    let boletos = await SupabaseAPI.get('boletos');
    boletos = boletos.filter(b => b.unidade_id === unidadeIdAtivo);
    UNIDADE_ATIVA_BOLETO = unidadeIdAtivo;

    // Popular select de Mês/Ano só com os meses que existem de fato nos dados dessa franquia
    const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const selectMesAno = document.getElementById('mesAnoFilterBoleto');
    const mesesExistentes = [...new Set(boletos.map(b => b.data_liquidacao?.slice(0, 7)).filter(Boolean))].sort();
    const mesAnoAtual = selectMesAno.value;
    selectMesAno.innerHTML = '<option value="">Todos</option>' + mesesExistentes.map(ma => {
      const [anoOpt, mesOpt] = ma.split('-');
      return `<option value="${ma}">${nomesMeses[parseInt(mesOpt) - 1]}/${anoOpt}</option>`;
    }).join('');
    selectMesAno.value = mesAnoAtual;

    if (mesAno) {
      boletos = boletos.filter(b => b.data_liquidacao && b.data_liquidacao.slice(0, 7) === mesAno);
    }

    boletos.sort((a, b) => (a.data_liquidacao || '').localeCompare(b.data_liquidacao || ''));

    boletos = await aplicarClientesParametrosBoleto(boletos);
    boletos = await aplicarCategoriaPadraoBoleto(boletos);
    atualizarResumoBoletos(boletos);
    BOLETOS_CACHE = boletos;
    renderizarBoletos(boletos);

    if (boletos.length > 0 && boletos[0].agencia) {
      document.getElementById('infoAgenciaBoleto').textContent = boletos[0].agencia;
      document.getElementById('infoContaBoleto').textContent = boletos[0].conta || '-';
    }
  } catch (error) {
    console.error('❌ Erro ao carregar boletos:', error);
  }
}

function formatarDataBR(iso) {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarValorBR(valor) {
  if (valor === null || valor === undefined) return '-';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarBoletos(boletos) {
  const tbody = document.getElementById('tbodyBoleto');
  tbody.innerHTML = '';

  if (boletos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:20px;">Nenhum boleto encontrado</td></tr>';
    return;
  }

  boletos.forEach(b => {
    const tr = document.createElement('tr');
    const corSituacao = (b.situacao || '').toUpperCase().includes('LIQUIDADO') ? 'var(--destaque)' : 'var(--alerta)';
    const dataRef = b.data_referencia || b.data_liquidacao || '';
    tr.innerHTML = `
      <td style="width:20px; text-align:center; padding:12px 0;">
        <input type="checkbox" class="checkbox-sistema checkboxBoleto" value="${b.id}" onchange="atualizarContadorSelecionadosBoleto()">
      </td>
      <td style="padding:12px;">${b.pagador || '-'}</td>
      <td style="padding:12px;">${formatarDataBR(b.data_liquidacao)}</td>
      <td style="padding:12px; text-align:right;">${formatarValorBR(b.valor)}</td>
      <td style="padding:12px;">${formatarDataBR(b.data_vencimento)}</td>
      <td style="padding:12px; text-align:right;">${formatarValorBR(b.valor_liquidacao)}</td>
      <td style="padding:12px; color:${corSituacao}; font-weight:600;">${b.situacao || '-'}</td>
      <td><input type="date" value="${dataRef}" onchange="atualizarCampoBoleto(${b.id}, 'data_referencia', this.value)"></td>
      <td>
        <select onchange="atualizarCampoBoleto(${b.id}, 'categoria', this.value); this.style.backgroundColor = '';" style="${b._categoriaAutoPreenchida ? 'background-color: #FFFACD;' : ''}">
          <option value="">Selecione...</option>
          ${CATEGORIAS.map(c => `<option value="${c}" ${b.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </td>
      <td>
        <select onchange="atualizarCampoBoleto(${b.id}, 'servicos', this.value)">
          <option value="">Selecione...</option>
          ${SERVICOS.map(s => `<option value="${s}" ${b.servicos === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" list="listaClientesPJ" placeholder="Ex: Empresa X" value="${b.cliente || ''}" style="${b._clienteAutoPreenchido ? 'background-color: #FFFACD;' : ''}" onchange="atualizarCampoClienteBoleto(${b.id}, this.value); this.style.backgroundColor = '';"></td>
      <td><input type="text" placeholder="Observações" value="${b.observacao || ''}" onchange="atualizarCampoBoleto(${b.id}, 'observacao', this.value)"></td>
      <td style="padding:12px; text-align:center;">
        <button class="action-button delete" onclick="deletarBoleto(${b.id})" title="Deletar">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('secaoAcoesEmMassaBoleto').style.display = 'none';
  document.getElementById('contadorSelecionadosBoleto').textContent = '0';
  document.getElementById('selectTodosBoleto').checked = false;
  atualizarSelectsMassaBoleto();
}

function atualizarSelectsMassaBoleto() {
  const selectCat = document.getElementById('selectCategoriaEmMassaBoleto');
  if (selectCat) {
    selectCat.innerHTML = '<option value="">Selecione...</option>' +
      CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  const selectSrv = document.getElementById('selectServicoEmMassaBoleto');
  if (selectSrv) {
    selectSrv.innerHTML = '<option value="">Selecione...</option>' +
      SERVICOS.map(s => `<option value="${s}">${s}</option>`).join('');
  }
}

function obterSelecionadosBoleto() {
  const checkboxes = document.querySelectorAll('#tbodyBoleto .checkboxBoleto:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function selecionarTodosBoleto(checked) {
  document.querySelectorAll('.checkboxBoleto').forEach(cb => cb.checked = checked);
  atualizarContadorSelecionadosBoleto();
}

function atualizarContadorSelecionadosBoleto() {
  const selecionados = obterSelecionadosBoleto();
  document.getElementById('contadorSelecionadosBoleto').textContent = selecionados.length;
  const secao = document.getElementById('secaoAcoesEmMassaBoleto');
  if (selecionados.length > 0) {
    secao.style.display = 'block';
  } else {
    secao.style.display = 'none';
    document.getElementById('selectTodosBoleto').checked = false;
  }
}

async function aplicarCategoriaEmMassaBoleto() {
  const selecionados = obterSelecionadosBoleto();
  if (selecionados.length === 0) {
    alert('⚠️ Selecione pelo menos um boleto');
    return;
  }
  const categoria = document.getElementById('selectCategoriaEmMassaBoleto').value;
  if (!categoria) {
    alert('⚠️ Selecione uma categoria');
    return;
  }
  if (!confirm(`Aplicar categoria "${categoria}" a ${selecionados.length} boleto(s)?`)) return;

  await Promise.all(selecionados.map(id => SupabaseAPI.update('boletos', id, { categoria })));
  alert(`✅ Categoria aplicada a ${selecionados.length} boleto(s)`);
  document.getElementById('selectCategoriaEmMassaBoleto').value = '';
  await loadBoletos();
}

async function aplicarServicoEmMassaBoleto() {
  const selecionados = obterSelecionadosBoleto();
  if (selecionados.length === 0) {
    alert('⚠️ Selecione pelo menos um boleto');
    return;
  }
  const servico = document.getElementById('selectServicoEmMassaBoleto').value;
  if (!servico) {
    alert('⚠️ Selecione um serviço');
    return;
  }
  if (!confirm(`Aplicar serviço "${servico}" a ${selecionados.length} boleto(s)?`)) return;

  await Promise.all(selecionados.map(id => SupabaseAPI.update('boletos', id, { servicos: servico })));
  alert(`✅ Serviço aplicado a ${selecionados.length} boleto(s)`);
  document.getElementById('selectServicoEmMassaBoleto').value = '';
  await loadBoletos();
}

async function aplicarClienteEmMassaBoleto() {
  const selecionados = obterSelecionadosBoleto();
  if (selecionados.length === 0) {
    alert('⚠️ Selecione pelo menos um boleto');
    return;
  }
  const cliente = document.getElementById('inputClienteEmMassaBoleto').value;
  if (!cliente) {
    alert('⚠️ Digite um cliente');
    return;
  }
  if (!confirm(`Aplicar cliente "${cliente}" a ${selecionados.length} boleto(s)?`)) return;

  await Promise.all(selecionados.map(id => SupabaseAPI.update('boletos', id, { cliente })));
  alert(`✅ Cliente aplicado a ${selecionados.length} boleto(s)`);
  document.getElementById('inputClienteEmMassaBoleto').value = '';
  await loadBoletos();
}

async function atualizarCampoBoleto(id, campo, valor) {
  try {
    await SupabaseAPI.update('boletos', id, { [campo]: valor || null });
  } catch (error) {
    console.error('❌ Erro ao atualizar campo:', error);
  }
}

// Wrapper do campo Cliente: salva + "aprende" a palavra-chave pra próxima vez
async function atualizarCampoClienteBoleto(id, valor) {
  await atualizarCampoBoleto(id, 'cliente', valor);
  if (!valor) return;

  const pj = (await SupabaseAPI.get('clientes_pj')).find(p => p.razao_social === valor && p.unidade_id === UNIDADE_ATIVA_BOLETO);
  if (!pj) return;

  const boleto = BOLETOS_CACHE.find(b => b.id === id);
  if (!boleto || !boleto.pagador) return;

  const palavraChave = boleto.pagador.trim().toUpperCase();
  const parametrosExistentes = await SupabaseAPI.get('clientes_parametros');
  const jaExiste = parametrosExistentes.some(p => p.pj_id === pj.id && p.palavra_chave === palavraChave);

  if (!jaExiste) {
    await SupabaseAPI.insert('clientes_parametros', { pj_id: pj.id, palavra_chave: palavraChave });
    console.log(`🧠 Aprendido: "${palavraChave}" → ${pj.razao_social}`);
  }
}

async function deletarBoleto(id) {
  if (!confirm('Deletar este boleto?')) return;
  await SupabaseAPI.delete('boletos', id);
  await loadBoletos();
  alert('✅ Boleto deletado!');
}

async function deletarSelecionadosBoleto() {
  const ids = Array.from(document.querySelectorAll('.checkboxBoleto:checked')).map(cb => parseInt(cb.value));
  if (ids.length === 0) return;
  if (!confirm(`Deletar ${ids.length} boleto(s)?`)) return;

  await Promise.all(ids.map(id => SupabaseAPI.delete('boletos', id)));
  await loadBoletos();
  alert(`✅ ${ids.length} boleto(s) deletado(s)!`);
}
