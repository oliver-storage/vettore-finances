/**
 * Vettore Finances - Configuração com Supabase v1.9.0
 */

const CATEGORIAS_PADRAO = [
  'IMPOSTOS', 'CUSTEIO', 'BOLETOS', 'HONORÁRIOS', 'TARIFAS'
];

let CATEGORIAS = [...CATEGORIAS_PADRAO];
let UNIDADES_CACHE = [];

async function inicializar() {
  try {
    checkAuth();
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const unidades = await SupabaseAPI.get('unidades');
    UNIDADES_CACHE = unidades;
    const franquia = unidades.find(u => u.id === user.unidade_id);
    const nomefranquia = franquia?.nomefranquia || 'Sistema';
    
    document.getElementById('userName').textContent = `${nomefranquia} - ${user.nome} (${user.perfil})`;
    
    // Máscara CPF na aba usuários (criar)
    const inputCPF = document.getElementById('inputCPFUsuario');
    if (inputCPF) {
      inputCPF.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraCPF(e.target.value);
      });
    }
    
    // Máscara CPF no modal (editar)
    const modalCPF = document.getElementById('modalCPFUsuario');
    if (modalCPF) {
      modalCPF.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraCPF(e.target.value);
      });
    }
    
    // Verificar se é admin para mostrar privilégios
    if (user.perfil === 'administrador') {
      document.getElementById('tabPrivilegios').style.display = 'inline-block';
    }

    // Preencher informações do usuário na ABA Geral
    document.getElementById('infoUsuarioNome').textContent = user.nome;
    document.getElementById('infoUsuarioEmail').textContent = user.email;
    document.getElementById('infoUsuarioFranquia').textContent = franquia?.nomefranquia || '-';
    document.getElementById('infoUsuarioPerfil').textContent = user.perfil;
    await carregarUnidades(user);
    await carregarFranquiasSelect(unidades, user);
    await carregarUsuarios(user);
    await carregarPrivilegios();
    carregarServicos();
    await carregarCategorias();
    await carregarLista();
    await carregarParametros();
    await atualizarSelectsParametros();
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

function aplicarMascaraCPF(valor) {
  const clean = valor.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return clean.slice(0, 3) + '.' + clean.slice(3);
  if (clean.length <= 9) return clean.slice(0, 3) + '.' + clean.slice(3, 6) + '.' + clean.slice(6);
  return clean.slice(0, 3) + '.' + clean.slice(3, 6) + '.' + clean.slice(6, 9) + '-' + clean.slice(9, 11);
}

async function carregarUnidades(user) {
  const unidades = await SupabaseAPI.get('unidades');
  const tbody = document.getElementById('tbodyUnidades');
  
  tbody.innerHTML = '';
  
  let unidadesFiltradas = unidades;
  
  // Gestor/Usuário vê apenas sua franquia
  if (user && user.perfil !== 'administrador' && user.unidade_id) {
    unidadesFiltradas = unidades.filter(u => u.id === user.unidade_id);
  }
  
  unidadesFiltradas.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nomefranquia}</td>
      <td>${u.cnpj || '-'}</td>
      <td>${u.telefone || '-'}</td>
      <td>
        <button class="btn-edit" onclick="editarUnidade(${u.id})">Editar</button>
        ${user && user.perfil === 'administrador' ? `<button class="btn-danger" onclick="deletarUnidade(${u.id})">Deletar</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function carregarFranquiasSelect(unidades, user) {
  const select = document.getElementById('selectFranquiaUsuario');
  
  select.innerHTML = '<option value="">Selecione...</option>';
  
  let unidadesFiltradas = unidades;
  
  // Gestor vê apenas sua franquia
  if (user && user.perfil === 'gestor' && user.unidade_id) {
    unidadesFiltradas = unidades.filter(u => u.id === user.unidade_id);
  }
  
  unidadesFiltradas.forEach(u => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = u.nomefranquia;
    select.appendChild(option);
  });
}

async function carregarUsuarios(user) {
  const usuarios = await SupabaseAPI.get('usuarios');
  const unidades = await SupabaseAPI.get('unidades');
  const tbody = document.getElementById('tbodyUsuarios');
  
  tbody.innerHTML = '';
  
  let usuariosFiltrados = usuarios;
  
  // Gestor vê apenas usuários de sua franquia
  if (user && user.perfil === 'gestor' && user.unidade_id) {
    usuariosFiltrados = usuarios.filter(u => u.unidade_id === user.unidade_id);
  }
  
  usuariosFiltrados.forEach(u => {
    const unidade = unidades.find(un => un.id === u.unidade_id);
    const nomeUnidade = unidade?.nomefranquia || '-';
    const cpfFormatado = u.cpf ? formatarCPF(u.cpf) : '-';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${cpfFormatado}</td>
      <td>${nomeUnidade}</td>
      <td><span class="badge">${u.perfil}</span></td>
      <td>
        <button class="btn-edit" onclick="editarUsuario(${u.id})">Editar</button>
        <button class="btn-danger" onclick="deletarUsuario(${u.id})">Deletar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

async function carregarPrivilegios() {
  const privilegios = await SupabaseAPI.get('privilegios');
  const tbody = document.getElementById('tbodyPrivilegios');
  const funcionalidades = [...new Set(privilegios.map(p => p.funcionalidade))];
  
  tbody.innerHTML = '';
  funcionalidades.forEach((func) => {
    const tr = document.createElement('tr');
    let cells = `<td>${func}</td>`;
    
    ['administrador', 'gerente', 'usuario'].forEach(perfil => {
      const priv = privilegios.find(p => p.perfil === perfil && p.funcionalidade === func);
      const checked = priv?.permissao ? 'checked' : '';
      cells += `<td><input type="checkbox" data-perfil="${perfil}" data-func="${func}" ${checked}></td>`;
    });
    
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
}

async function handleNovaUnidade(e) {
  e.preventDefault();
  
  try {
    const nova = {
      nomefranquia: document.getElementById('inputNomeFranquia').value,
      razaosocial: document.getElementById('inputRazaoSocial').value,
      cnpj: document.getElementById('inputCNPJ').value,
      email: document.getElementById('inputEmail').value,
      telefone: document.getElementById('inputTelefone').value,
      cep: document.getElementById('inputCEP').value,
      rua: document.getElementById('inputRua').value,
      numero: document.getElementById('inputNumero').value,
      complemento: document.getElementById('inputComplemento').value,
      bairro: document.getElementById('inputBairro').value,
      cidade: document.getElementById('inputCidade').value,
      estado: document.getElementById('inputEstado').value,
      banco: document.getElementById('inputBanco').value,
      agencia: document.getElementById('inputAgencia').value,
      conta: document.getElementById('inputConta').value,
      tipoconta: document.getElementById('inputTipoConta').value
    };
    
    console.log('📝 Dados a enviar:', nova);
    
    const result = await SupabaseAPI.insert('unidades', nova);
    
    console.log('📥 Resposta:', result);
    
    if (result && result.length > 0) {
      alert('✅ Unidade criada com sucesso!');
      e.target.reset();
      await carregarUnidades();
      const unidades = await SupabaseAPI.get('unidades');
      await carregarFranquiasSelect(unidades);
    } else {
      alert('❌ Erro ao criar unidade');
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
    console.error('Erro completo:', error);
  }
}

async function handleNovoUsuario(e) {
  e.preventDefault();
  
  const cpfRaw = document.getElementById('inputCPFUsuario').value.replace(/\D/g, '');
  
  const novo = {
    nome: document.getElementById('inputNomeUsuario').value,
    email: document.getElementById('inputEmailUsuario').value,
    cpf: cpfRaw || null,
    unidade_id: parseInt(document.getElementById('selectFranquiaUsuario').value),
    perfil: document.getElementById('selectPerfilUsuario').value,
    senha: document.getElementById('inputSenhaUsuario').value,
    ativo: true
  };
  
  const result = await SupabaseAPI.insert('usuarios', novo);
  
  if (result && result.length > 0) {
    alert('✅ Usuário criado com sucesso!');
    e.target.reset();
    await carregarUsuarios();
  } else {
    alert('❌ Erro ao criar usuário');
    console.error('Resposta:', result);
  }
}

async function salvarPrivilegios() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  let updates = [];
  
  checkboxes.forEach(check => {
    const perfil = check.dataset.perfil;
    const func = check.dataset.func;
    const permissao = check.checked;
    
    updates.push({ perfil, funcionalidade: func, permissao });
  });
  
  for (const update of updates) {
    // Encontrar ID do privilégio
    const privilegios = await SupabaseAPI.query('privilegios', {
      perfil: update.perfil,
      funcionalidade: update.funcionalidade
    });
    
    if (privilegios.length > 0) {
      await SupabaseAPI.update('privilegios', privilegios[0].id, { permissao: update.permissao });
    }
  }
  
  alert('✅ Privilégios salvos!');
}

async function editarUnidade(id) {
  const unidades = await SupabaseAPI.get('unidades');
  const unidade = unidades.find(u => u.id === id);
  
  if (!unidade) {
    alert('❌ Franquia não encontrada');
    return;
  }
  
  // Preencher modal
  document.getElementById('modalFranquiaId').value = id;
  document.getElementById('modalNomeFranquia').value = unidade.nomefranquia || '';
  document.getElementById('modalRazaoSocial').value = unidade.razaosocial || '';
  document.getElementById('modalCNPJ').value = unidade.cnpj || '';
  document.getElementById('modalEmailFranquia').value = unidade.email || '';
  document.getElementById('modalTelefoneFranquia').value = unidade.telefone || '';
  document.getElementById('modalCEPFranquia').value = unidade.cep || '';
  document.getElementById('modalRuaFranquia').value = unidade.rua || '';
  document.getElementById('modalNumeroFranquia').value = unidade.numero || '';
  document.getElementById('modalComplementoFranquia').value = unidade.complemento || '';
  document.getElementById('modalBairroFranquia').value = unidade.bairro || '';
  document.getElementById('modalCidadeFranquia').value = unidade.cidade || '';
  document.getElementById('modalEstadoFranquia').value = unidade.estado || '';
  document.getElementById('modalBancoFranquia').value = unidade.banco || '';
  document.getElementById('modalAgenciaFranquia').value = unidade.agencia || '';
  document.getElementById('modalContaFranquia').value = unidade.conta || '';
  document.getElementById('modalTipoContaFranquia').value = unidade.tipoconta || '';
  
  // Mostrar modal
  document.getElementById('modalEditarFranquia').style.display = 'flex';
}

function fecharModalFranquia() {
  document.getElementById('modalEditarFranquia').style.display = 'none';
}

async function salvarEdicaoFranquia(e) {
  e.preventDefault();
  
  const id = parseInt(document.getElementById('modalFranquiaId').value);
  
  const updateData = {
    nomefranquia: document.getElementById('modalNomeFranquia').value,
    razaosocial: document.getElementById('modalRazaoSocial').value,
    cnpj: document.getElementById('modalCNPJ').value,
    email: document.getElementById('modalEmailFranquia').value,
    telefone: document.getElementById('modalTelefoneFranquia').value,
    cep: document.getElementById('modalCEPFranquia').value,
    rua: document.getElementById('modalRuaFranquia').value,
    numero: document.getElementById('modalNumeroFranquia').value,
    complemento: document.getElementById('modalComplementoFranquia').value,
    bairro: document.getElementById('modalBairroFranquia').value,
    cidade: document.getElementById('modalCidadeFranquia').value,
    estado: document.getElementById('modalEstadoFranquia').value,
    banco: document.getElementById('modalBancoFranquia').value,
    agencia: document.getElementById('modalAgenciaFranquia').value,
    conta: document.getElementById('modalContaFranquia').value,
    tipoconta: document.getElementById('modalTipoContaFranquia').value
  };
  
  try {
    await SupabaseAPI.update('unidades', id, updateData);
    alert('✅ Franquia atualizada!');
    fecharModalFranquia();
    await carregarUnidades();
    const unidades = await SupabaseAPI.get('unidades');
    await carregarFranquiasSelect(unidades);
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

async function deletarUnidade(id) {
  if (!confirm('Deletar esta unidade?')) return;
  
  try {
    await SupabaseAPI.delete('unidades', id);
    alert('✅ Unidade deletada!');
    await carregarUnidades();
    const unidades = await SupabaseAPI.get('unidades');
    await carregarFranquiasSelect(unidades);
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}
async function editarUsuario(id) {
  const usuarios = await SupabaseAPI.get('usuarios');
  const unidades = await SupabaseAPI.get('unidades');
  const user = usuarios.find(u => u.id === id);
  
  if (!user) {
    alert('❌ Usuário não encontrado');
    return;
  }
  
  // Preencher modal
  document.getElementById('modalUsuarioId').value = id;
  document.getElementById('modalNomeUsuario').value = user.nome;
  document.getElementById('modalEmailUsuario').value = user.email;
  document.getElementById('modalCPFUsuario').value = user.cpf ? formatarCPF(user.cpf) : '';
  document.getElementById('modalPerfilUsuario').value = user.perfil;
  document.getElementById('modalSenhaUsuario').value = '';
  
  // Preencher franquias
  const selectFranquia = document.getElementById('modalFranquiaUsuario');
  selectFranquia.innerHTML = '';
  unidades.forEach(u => {
    const option = document.createElement('option');
    option.value = u.id;
    option.textContent = u.nomefranquia;
    if (u.id === user.unidade_id) option.selected = true;
    selectFranquia.appendChild(option);
  });
  
  // Mostrar modal
  document.getElementById('modalEditarUsuario').style.display = 'flex';
}

function fecharModalUsuario() {
  document.getElementById('modalEditarUsuario').style.display = 'none';
}

async function salvarEdicaoUsuario(e) {
  e.preventDefault();
  
  const id = parseInt(document.getElementById('modalUsuarioId').value);
  const cpfRaw = document.getElementById('modalCPFUsuario').value.replace(/\D/g, '');
  
  const updateData = {
    nome: document.getElementById('modalNomeUsuario').value,
    email: document.getElementById('modalEmailUsuario').value,
    cpf: cpfRaw || null,
    unidade_id: parseInt(document.getElementById('modalFranquiaUsuario').value),
    perfil: document.getElementById('modalPerfilUsuario').value
  };
  
  const novaSenha = document.getElementById('modalSenhaUsuario').value;
  if (novaSenha) {
    updateData.senha = novaSenha;
  }
  
  try {
    await SupabaseAPI.update('usuarios', id, updateData);
    alert('✅ Usuário atualizado!');
    fecharModalUsuario();
    await carregarUsuarios();
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

async function deletarUsuario(id) {
  if (!confirm('Deletar este usuário?')) return;
  
  try {
    await SupabaseAPI.delete('usuarios', id);
    alert('✅ Usuário deletado!');
    await carregarUsuarios();
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

// GERENCIAR CATEGORIAS (adicionarCategoria via UI: usar adicionarItem/removerItemLista)

async function carregarCategorias() {
  const registros = await SupabaseAPI.get('categorias');
  CATEGORIAS = registros.map(r => r.nome);

  const tbody = document.getElementById('tbodyCategorias');
  if (!tbody) return;

  tbody.innerHTML = '';
  CATEGORIAS.forEach(cat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat}</td>
      <td><button class="btn-danger" onclick="deletarCategoria('${cat}')">Deletar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function deletarCategoria(categoria) {
  if (!confirm(`Deletar categoria "${categoria}"?`)) return;

  const registros = await SupabaseAPI.get('categorias');
  const registro = registros.find(r => r.nome === categoria);
  if (registro) await SupabaseAPI.delete('categorias', registro.id);

  await carregarCategorias();
  alert('✅ Categoria deletada!');
}

// GERENCIAR SERVIÇOS
const SERVICOS_KEY = 'servicos_list';

async function adicionarServico() {
  const input = document.getElementById('inputNovoServico');
  const servico = input.value.trim();
  
  if (!servico) {
    alert('⚠️ Digite um nome para o serviço');
    return;
  }
  
  let servicos = JSON.parse(localStorage.getItem(SERVICOS_KEY) || '[]');
  
  if (servicos.includes(servico)) {
    alert('⚠️ Serviço já existe');
    return;
  }
  
  servicos.push(servico);
  localStorage.setItem(SERVICOS_KEY, JSON.stringify(servicos));
  input.value = '';
  carregarServicos();
  alert('✅ Serviço adicionado!');
}

function carregarServicos() {
  const servicos = JSON.parse(localStorage.getItem(SERVICOS_KEY) || '[]');
  const tbody = document.getElementById('tbodyServicos');
  tbody.innerHTML = '';
  
  servicos.forEach(srv => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${srv}</td>
      <td><button class="btn-danger" onclick="deletarServico('${srv}')">Deletar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function deletarServico(servico) {
  if (!confirm(`Deletar serviço "${servico}"?`)) return;
  
  let servicos = JSON.parse(localStorage.getItem(SERVICOS_KEY) || '[]');
  servicos = servicos.filter(s => s !== servico);
  localStorage.setItem(SERVICOS_KEY, JSON.stringify(servicos));
  carregarServicos();
  alert('✅ Serviço deletado!');
}

// ========== FIM SERVIÇOS ==========

async function atualizarSelectsParametros() {
  const categorias = CATEGORIAS.length ? CATEGORIAS : (await SupabaseAPI.get('categorias')).map(r => r.nome);

  const selectCat = document.getElementById('selectParamCategoria');
  if (selectCat) {
    selectCat.innerHTML = '<option value="">Selecione...</option>';
    categorias.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      selectCat.appendChild(option);
    });
  }

  // Carregar subcategorias
  const selectSub = document.getElementById('selectParamSubcategoria');
  if (selectSub) {
    selectSub.innerHTML = '<option value="">Nenhuma</option>';
    const subcategorias = await SupabaseAPI.get('subcategorias');
    subcategorias.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub.nome;
      option.textContent = sub.nome;
      selectSub.appendChild(option);
    });
  }

  // Checkboxes de franquias
  const containerFranquias = document.getElementById('checkboxesFranquiasParam');
  if (containerFranquias) {
    if (UNIDADES_CACHE.length === 0) UNIDADES_CACHE = await SupabaseAPI.get('unidades');
    containerFranquias.innerHTML = UNIDADES_CACHE.map(u => `
      <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; cursor:pointer;">
        <input type="checkbox" class="checkbox-sistema franquiaParamCheckbox" value="${u.id}">
        ${u.nomefranquia}
      </label>
    `).join('');
  }
}

async function carregarParametros() {
  const tbody = document.getElementById('tbodyParametros');
  if (!tbody) return;

  tbody.innerHTML = '';
  const parametros = await SupabaseAPI.get('parametros_auto');
  if (UNIDADES_CACHE.length === 0) UNIDADES_CACHE = await SupabaseAPI.get('unidades');

  if (parametros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--tinta-40);">Nenhum parâmetro cadastrado</td></tr>';
    document.getElementById('acoesMassaParametros').style.display = 'none';
    document.getElementById('checkAllParametros').checked = false;
    return;
  }

  parametros.forEach((param) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--linha)';
    const franquiasTexto = (!param.unidade_ids || param.unidade_ids.length === 0)
      ? '<span style="color:var(--tinta-40);">Todas</span>'
      : param.unidade_ids.map(id => UNIDADES_CACHE.find(u => u.id === id)?.nomefranquia || id).join(', ');
    tr.innerHTML = `
      <td style="text-align:center; padding: 12px 6px;">
        <input type="checkbox" class="checkbox-sistema checkboxParametro" data-id="${param.id}" onchange="atualizarAcoesMassa()">
      </td>
      <td style="padding:12px;">${param.descricao}</td>
      <td style="padding:12px;">${param.categoria}</td>
      <td style="padding:12px;">${param.subcategoria || '-'}</td>
      <td style="padding:12px; font-size:12px;">${franquiasTexto}</td>
      <td style="padding:12px; text-align:center; display:flex; gap:6px; justify-content:center;">
        <button class="action-button" onclick="abrirModalEditarParametro(${param.id})" title="Editar Parâmetro">✏️</button>
        <button class="action-button delete" onclick="deletarParametro(${param.id})" title="Deletar Parâmetro">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById('acoesMassaParametros').style.display = 'none';
  document.getElementById('checkAllParametros').checked = false;
}

async function carregarLista() {
  const lista = document.getElementById('selectLista')?.value || 'categorias';
  const container = document.getElementById('containerChips');
  if (!container) return;

  container.innerHTML = '';

  const items = lista === 'categorias'
    ? (await SupabaseAPI.get('categorias')).map(r => r.nome)
    : (await SupabaseAPI.get('subcategorias')).map(r => r.nome);

  if (lista === 'categorias') CATEGORIAS = items;

  if (items.length === 0) {
    container.innerHTML = '<p style="color:var(--tinta-40); font-size:12px;">Nenhum item nessa lista</p>';
    return;
  }

  items.forEach(itemText => {
    const chip = document.createElement('div');
    chip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--papel);
      border: 1px solid var(--linha);
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 13px;
      color: var(--tinta);
    `;
    chip.innerHTML = `
      ${itemText}
      <span onclick="removerItemLista('${lista}', '${itemText}')" style="cursor:pointer; font-weight:bold; color:var(--alerta); padding:0 4px; line-height:1;">×</span>
    `;
    container.appendChild(chip);
  });
}

async function adicionarItem() {
  const input = document.getElementById('inputNovoItem');
  const item = input.value.trim().toUpperCase();
  if (!item) {
    alert('⚠️ Digite um item');
    return;
  }

  const lista = document.getElementById('selectLista').value;
  const tabela = lista === 'categorias' ? 'categorias' : 'subcategorias';

  const existentes = await SupabaseAPI.get(tabela);
  if (existentes.some(r => r.nome === item)) {
    alert('⚠️ Este item já existe');
    return;
  }

  await SupabaseAPI.insert(tabela, { nome: item });

  input.value = '';
  await carregarLista();
  await atualizarSelectsParametros();
  alert('✅ Item adicionado!');
}

async function removerItemLista(lista, item) {
  if (!confirm(`Remover "${item}"?`)) return;

  const tabela = lista === 'categorias' ? 'categorias' : 'subcategorias';
  const registros = await SupabaseAPI.get(tabela);
  const registro = registros.find(r => r.nome === item);
  if (registro) await SupabaseAPI.delete(tabela, registro.id);

  await carregarLista();
  await atualizarSelectsParametros();
  alert('✅ Item removido!');
}

async function adicionarParametro() {
  const descricao = document.getElementById('inputParamDescricao')?.value.trim().toUpperCase();
  const categoria = document.getElementById('selectParamCategoria')?.value;
  const subcategoria = document.getElementById('selectParamSubcategoria')?.value;
  const unidadeIds = Array.from(document.querySelectorAll('.franquiaParamCheckbox:checked')).map(cb => parseInt(cb.value));

  if (!descricao || !categoria) {
    alert('⚠️ Preencha Descrição e Categoria');
    return;
  }

  const parametros = await SupabaseAPI.get('parametros_auto');
  if (parametros.some(p => p.descricao === descricao)) {
    alert('⚠️ Este parâmetro já existe');
    return;
  }

  await SupabaseAPI.insert('parametros_auto', {
    descricao,
    categoria,
    subcategoria: subcategoria || null,
    unidade_ids: unidadeIds.length > 0 ? unidadeIds : null
  });

  document.getElementById('inputParamDescricao').value = '';
  document.getElementById('selectParamCategoria').value = '';
  document.getElementById('selectParamSubcategoria').value = '';
  document.querySelectorAll('.franquiaParamCheckbox:checked').forEach(cb => cb.checked = false);

  await carregarParametros();
  alert('✅ Parâmetro adicionado!');
}

async function deletarParametro(id) {
  if (!confirm('Deletar este parâmetro?')) return;

  await SupabaseAPI.delete('parametros_auto', id);

  await carregarParametros();
  alert('✅ Parâmetro deletado!');
}

// ========== EDIÇÃO INDIVIDUAL ==========
async function abrirModalEditarParametro(id) {
  const parametros = await SupabaseAPI.get('parametros_auto');
  const param = parametros.find(p => p.id === id);

  if (!param) {
    alert('⚠️ Parâmetro não encontrado');
    return;
  }

  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'modalEditarParam';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3); display: flex; align-items: center;
    justify-content: center; z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <h3 style="margin: 0 0 20px 0;">Editar Parâmetro</h3>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Descrição</label>
        <input type="text" id="modalParamDescricao" value="${param.descricao}" readonly style="width: 100%; padding: 10px; border: 1px solid var(--linha); border-radius: 4px; background: var(--papel);">
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Categoria</label>
        <select id="modalParamCategoria" style="width: 100%; padding: 10px; border: 1px solid var(--linha); border-radius: 4px;">
          <option value="">Selecione...</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Subcategoria</label>
        <select id="modalParamSubcategoria" style="width: 100%; padding: 10px; border: 1px solid var(--linha); border-radius: 4px;">
          <option value="">Nenhuma</option>
        </select>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Franquias (nenhuma marcada = todas)</label>
        <div id="modalFranquiasParam" style="display:flex; flex-wrap:wrap; gap:10px;"></div>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick="fecharModalParametro()" class="btn-danger" style="padding: 10px 16px;">Cancelar</button>
        <button onclick="salvarEdicaoParametro(${id})" class="btn-primary" style="padding: 10px 16px;">Salvar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);

  // Popular selects
  const categorias = CATEGORIAS.length ? CATEGORIAS : (await SupabaseAPI.get('categorias')).map(r => r.nome);
  const selectCat = document.getElementById('modalParamCategoria');
  categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === param.categoria) option.selected = true;
    selectCat.appendChild(option);
  });

  const subcategorias = (await SupabaseAPI.get('subcategorias')).map(r => r.nome);
  const selectSub = document.getElementById('modalParamSubcategoria');
  subcategorias.forEach(sub => {
    const option = document.createElement('option');
    option.value = sub;
    option.textContent = sub;
    if (sub === param.subcategoria) option.selected = true;
    selectSub.appendChild(option);
  });

  if (UNIDADES_CACHE.length === 0) UNIDADES_CACHE = await SupabaseAPI.get('unidades');
  const jaMarcadas = param.unidade_ids || [];
  document.getElementById('modalFranquiasParam').innerHTML = UNIDADES_CACHE.map(u => `
    <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; cursor:pointer;">
      <input type="checkbox" class="checkbox-sistema modalFranquiaCheckbox" value="${u.id}" ${jaMarcadas.includes(u.id) ? 'checked' : ''}>
      ${u.nomefranquia}
    </label>
  `).join('');
}

function fecharModalParametro() {
  const modal = document.getElementById('modalEditarParam');
  if (modal) modal.remove();
}

async function salvarEdicaoParametro(id) {
  const categoria = document.getElementById('modalParamCategoria').value;
  const subcategoria = document.getElementById('modalParamSubcategoria').value;
  const unidadeIds = Array.from(document.querySelectorAll('.modalFranquiaCheckbox:checked')).map(cb => parseInt(cb.value));

  if (!categoria) {
    alert('⚠️ Selecione uma categoria');
    return;
  }

  await SupabaseAPI.update('parametros_auto', id, {
    categoria,
    subcategoria: subcategoria || null,
    unidade_ids: unidadeIds.length > 0 ? unidadeIds : null
  });

  fecharModalParametro();
  await carregarParametros();
  alert('✅ Parâmetro atualizado!');
}

// ========== EDIÇÃO EM MASSA ==========
function atualizarAcoesMassa() {
  const selecionados = document.querySelectorAll('.checkboxParametro:checked').length;
  const container = document.getElementById('acoesMassaParametros');
  
  if (selecionados > 0) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

function toggleAllParametros(checked) {
  document.querySelectorAll('.checkboxParametro').forEach(cb => {
    cb.checked = checked;
  });
  atualizarAcoesMassa();
}

async function editarCategoryEmLote() {
  const ids = Array.from(document.querySelectorAll('.checkboxParametro:checked')).map(cb => parseInt(cb.dataset.id));

  if (ids.length === 0) {
    alert('⚠️ Selecione parâmetros');
    return;
  }

  const categoria = prompt('Digite a categoria a aplicar:', '');
  if (!categoria || !categoria.trim()) return;

  const categoriaUpper = categoria.trim().toUpperCase();
  if (!confirm(`Aplicar categoria "${categoriaUpper}" a ${ids.length} parâmetro(s)?`)) return;

  await Promise.all(ids.map(id => SupabaseAPI.update('parametros_auto', id, { categoria: categoriaUpper })));

  await carregarParametros();
  alert(`✅ ${ids.length} parâmetro(s) atualizado(s)!`);
}

async function editarSubcategoryEmLote() {
  const ids = Array.from(document.querySelectorAll('.checkboxParametro:checked')).map(cb => parseInt(cb.dataset.id));

  if (ids.length === 0) {
    alert('⚠️ Selecione parâmetros');
    return;
  }

  const subcategorias = (await SupabaseAPI.get('subcategorias')).map(r => r.nome);
  const modal = prompt(`Aplicar subcategoria a ${ids.length} parâmetro(s)?\n\nOpções: ${subcategorias.join(', ') || 'Nenhuma'}\n\n(deixe em branco para "Nenhuma")`, '');

  if (modal === null) return;

  const subcategoria = modal.trim().toUpperCase();

  await Promise.all(ids.map(id => SupabaseAPI.update('parametros_auto', id, { subcategoria: subcategoria || null })));

  await carregarParametros();
  alert(`✅ ${ids.length} parâmetro(s) atualizado(s)!`);
}

async function editarFranquiasEmLote() {
  const ids = Array.from(document.querySelectorAll('.checkboxParametro:checked')).map(cb => parseInt(cb.dataset.id));

  if (ids.length === 0) {
    alert('⚠️ Selecione parâmetros');
    return;
  }

  if (UNIDADES_CACHE.length === 0) UNIDADES_CACHE = await SupabaseAPI.get('unidades');

  const modal = document.createElement('div');
  modal.id = 'modalFranquiasLote';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3); display: flex; align-items: center;
    justify-content: center; z-index: 1000;
  `;
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      <h3 style="margin: 0 0 8px 0;">Editar Franquias em Lote</h3>
      <p style="font-size:12px; color:var(--tinta-70); margin-bottom:16px;">Aplicando a ${ids.length} parâmetro(s). Nenhuma marcada = todas as franquias.</p>
      <div id="loteFranquiasCheckboxes" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
        ${UNIDADES_CACHE.map(u => `
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; cursor:pointer;">
            <input type="checkbox" class="checkbox-sistema loteFranquiaCheckbox" value="${u.id}">
            ${u.nomefranquia}
          </label>
        `).join('')}
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick="document.getElementById('modalFranquiasLote').remove()" class="btn-danger" style="padding: 10px 16px;">Cancelar</button>
        <button onclick="salvarFranquiasEmLote([${ids.join(',')}])" class="btn-primary" style="padding: 10px 16px;">Aplicar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function salvarFranquiasEmLote(ids) {
  const unidadeIds = Array.from(document.querySelectorAll('.loteFranquiaCheckbox:checked')).map(cb => parseInt(cb.value));

  await Promise.all(ids.map(id => SupabaseAPI.update('parametros_auto', id, { unidade_ids: unidadeIds.length > 0 ? unidadeIds : null })));

  document.getElementById('modalFranquiasLote').remove();
  await carregarParametros();
  alert(`✅ ${ids.length} parâmetro(s) atualizado(s)!`);
}

async function deletarSelecionados() {
  const ids = Array.from(document.querySelectorAll('.checkboxParametro:checked')).map(cb => parseInt(cb.dataset.id));

  if (ids.length === 0) {
    alert('⚠️ Selecione parâmetros');
    return;
  }

  if (!confirm(`Deletar ${ids.length} parâmetro(s)?`)) return;

  await Promise.all(ids.map(id => SupabaseAPI.delete('parametros_auto', id)));

  await carregarParametros();
  alert(`✅ ${ids.length} parâmetro(s) deletado(s)!`);
}

// ========== FIM LISTAS DO SISTEMA ==========

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
