/**
 * VA Business - Vettore Finances v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Configuração (Unidades e Usuários)
 */

function switchTab(e, tabName) {
  const contents = document.querySelectorAll('.tab-content');
  const btns = document.querySelectorAll('.tab-btn');
  
  contents.forEach(c => c.classList.remove('active'));
  btns.forEach(b => b.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  e.target.classList.add('active');
}

// ===== UNIDADES =====

function handleNovaUnidade(e) {
  e.preventDefault();
  
  const nomeFranquia = document.getElementById('inputNomeFranquia').value.trim();
  const razaoSocial = document.getElementById('inputRazaoSocial').value.trim();
  const cnpj = document.getElementById('inputCNPJ').value.trim();
  const email = document.getElementById('inputEmailUnidade').value.trim();
  const telefone = document.getElementById('inputTelefone').value.trim();
  const cep = document.getElementById('inputCEP').value.trim();
  const rua = document.getElementById('inputRua').value.trim();
  const numero = document.getElementById('inputNumero').value.trim();
  const complemento = document.getElementById('inputComplemento').value.trim();
  const bairro = document.getElementById('inputBairro').value.trim();
  const cidade = document.getElementById('inputCidade').value.trim();
  const estado = document.getElementById('inputEstado').value.trim();
  const banco = document.getElementById('inputBanco').value.trim();
  const agencia = document.getElementById('inputAgencia').value.trim();
  const conta = document.getElementById('inputConta').value.trim();
  const tipoConta = document.getElementById('inputTipoConta').value;
  
  if (!nomeFranquia || !razaoSocial || !cnpj || !cep || !rua || !numero || !cidade || !estado) {
    alert('Preencha todos os campos obrigatórios (*)');
    return;
  }
  
  const unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  const editId = document.getElementById('inputNomeFranquia').dataset.editId;
  
  // Se for edição, remover CNPJ antigo da validação
  if (!editId && unidades.find(u => u.cnpj.replace(/\D/g, '') === cnpj.replace(/\D/g, ''))) {
    alert('CNPJ já cadastrado');
    return;
  }
  
  if (editId) {
    // EDITAR
    const idx = unidades.findIndex(u => u.id === parseInt(editId));
    unidades[idx] = {
      ...unidades[idx],
      nomeFranquia,
      razaoSocial,
      cnpj,
      email,
      telefone,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      banco,
      agencia,
      conta,
      tipoConta,
      endereco_completo: `${rua}, ${numero}${complemento ? ', ' + complemento : ''} - ${bairro}, ${cidade} - ${estado} ${cep}`,
      data_atualizacao: new Date().toLocaleDateString('pt-BR')
    };
    alert('Franquia atualizada!');
  } else {
    // CRIAR
    const novaUnidade = {
      id: Date.now(),
      nomeFranquia,
      razaoSocial,
      cnpj,
      email,
      telefone,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      banco,
      agencia,
      conta,
      tipoConta,
      endereco_completo: `${rua}, ${numero}${complemento ? ', ' + complemento : ''} - ${bairro}, ${cidade} - ${estado} ${cep}`,
      data_criacao: new Date().toLocaleDateString('pt-BR')
    };
    unidades.push(novaUnidade);
    alert('Franquia criada!');
  }
  
  localStorage.setItem('unidades', JSON.stringify(unidades));
  
  // Limpar formulário
  document.getElementById('inputNomeFranquia').dataset.editId = '';
  document.getElementById('inputNomeFranquia').value = '';
  document.getElementById('inputRazaoSocial').value = '';
  document.getElementById('inputCNPJ').value = '';
  document.getElementById('inputEmailUnidade').value = '';
  document.getElementById('inputTelefone').value = '';
  document.getElementById('inputCEP').value = '';
  document.getElementById('inputRua').value = '';
  document.getElementById('inputNumero').value = '';
  document.getElementById('inputComplemento').value = '';
  document.getElementById('inputBairro').value = '';
  document.getElementById('inputCidade').value = '';
  document.getElementById('inputEstado').value = '';
  document.getElementById('inputBanco').value = '';
  document.getElementById('inputAgencia').value = '';
  document.getElementById('inputConta').value = '';
  document.getElementById('inputTipoConta').value = '';
  
  loadUnidades();
}

function editarUnidade(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  
  // Apenas admin pode editar
  if (user.perfil !== 'administrador') {
    alert('Sem permissão para editar');
    return;
  }
  
  const unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  const unidade = unidades.find(u => u.id === id);
  
  if (!unidade) return;
  
  // Preencher formulário com dados
  document.getElementById('inputNomeFranquia').dataset.editId = id;
  document.getElementById('inputNomeFranquia').value = unidade.nomeFranquia;
  document.getElementById('inputRazaoSocial').value = unidade.razaoSocial;
  document.getElementById('inputCNPJ').value = unidade.cnpj;
  document.getElementById('inputEmailUnidade').value = unidade.email || '';
  document.getElementById('inputTelefone').value = unidade.telefone || '';
  document.getElementById('inputCEP').value = unidade.cep || '';
  document.getElementById('inputRua').value = unidade.rua || '';
  document.getElementById('inputNumero').value = unidade.numero || '';
  document.getElementById('inputComplemento').value = unidade.complemento || '';
  document.getElementById('inputBairro').value = unidade.bairro || '';
  document.getElementById('inputCidade').value = unidade.cidade || '';
  document.getElementById('inputEstado').value = unidade.estado || '';
  document.getElementById('inputBanco').value = unidade.banco || '';
  document.getElementById('inputAgencia').value = unidade.agencia || '';
  document.getElementById('inputConta').value = unidade.conta || '';
  document.getElementById('inputTipoConta').value = unidade.tipoConta || '';
  
  // Scroll para formulário
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function loadUnidades() {
  const unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  const tbody = document.getElementById('tbodyUnidades');
  const table = document.getElementById('unidadesTable');
  const empty = document.getElementById('unidadesEmpty');
  
  if (unidades.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  tbody.innerHTML = '';
  unidades.forEach(u => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${u.nomeFranquia || u.nome}</td>
      <td>${u.razaoSocial || '-'}</td>
      <td>${u.cnpj || '-'}</td>
      <td>${u.telefone || '-'}</td>
      <td>${u.cidade || '-'}</td>
      <td>
        <button class="btn-edit" onclick="editarUnidade(${u.id})">Editar</button>
        <button class="btn-danger" onclick="deleteUnidade(${u.id})">Deletar</button>
      </td>
    `;
  });
  
  empty.style.display = 'none';
  table.style.display = 'table';
  
  // Atualizar select de usuários
  const select = document.getElementById('inputUnidadeUser');
  select.innerHTML = '<option value="">Selecionar...</option>';
  unidades.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.nomeFranquia || u.nome;
    select.appendChild(opt);
  });
}

function deleteUnidade(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  
  // Apenas admin pode deletar
  if (user.perfil !== 'administrador') {
    alert('Sem permissão para deletar');
    return;
  }
  
  if (!confirm('Deletar franquia? Esta ação é irreversível.')) return;
  
  let unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  unidades = unidades.filter(u => u.id !== id);
  localStorage.setItem('unidades', JSON.stringify(unidades));
  loadUnidades();
  alert('Franquia deletada!');
}

// ===== USUÁRIOS =====

function handleNovoUsuario(e) {
  e.preventDefault();
  
  const user = JSON.parse(localStorage.getItem('currentUser'));
  
  // Validar permissão
  if (user.perfil !== 'administrador' && user.perfil !== 'gerente') {
    alert('Sem permissão para criar usuários');
    return;
  }
  
  const nome = document.getElementById('inputNomeUser').value.trim();
  const email = document.getElementById('inputEmailUser').value.trim();
  const unidade_id = document.getElementById('inputUnidadeUser').value;
  const perfil = document.getElementById('inputPerfilUser').value;
  const senha = document.getElementById('inputSenhaUser').value;
  const confirm = document.getElementById('inputConfirmUser').value;
  
  if (!nome || !email || !unidade_id || !perfil || !senha) {
    alert('Preencha todos os campos');
    return;
  }
  
  if (senha.length < 6) {
    alert('Senha mín. 6 caracteres');
    return;
  }
  
  // Se não for edição, validar confirmação de senha
  const editId = document.getElementById('inputNomeUser').dataset.editId;
  if (!editId && senha !== confirm) {
    alert('Senhas não conferem');
    return;
  }
  
  // Se gerente, só pode criar em sua franquia
  if (user.perfil === 'gerente' && user.unidade_id !== parseInt(unidade_id)) {
    alert('Gerente só pode criar usuários da sua franquia');
    return;
  }
  
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  
  if (editId) {
    // EDITAR
    const idx = usuarios.findIndex(u => u.id === parseInt(editId));
    
    // Validar email único (exceto o do usuário sendo editado)
    if (usuarios.some(u => u.email === email && u.id !== parseInt(editId))) {
      alert('Email já cadastrado');
      return;
    }
    
    usuarios[idx] = {
      ...usuarios[idx],
      nome,
      email,
      unidade_id: parseInt(unidade_id),
      perfil,
      ...(senha && { senha }),
      data_atualizacao: new Date().toLocaleDateString('pt-BR')
    };
    alert('Usuário atualizado!');
  } else {
    // CRIAR
    if (usuarios.find(u => u.email === email)) {
      alert('Email já cadastrado');
      return;
    }
    
    const novoUsuario = {
      id: Date.now(),
      nome,
      email,
      unidade_id: parseInt(unidade_id),
      perfil,
      senha,
      ativo: true,
      data_criacao: new Date().toLocaleDateString('pt-BR')
    };
    usuarios.push(novoUsuario);
    alert('Usuário criado!');
  }
  
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  
  // Limpar formulário
  document.getElementById('inputNomeUser').dataset.editId = '';
  document.getElementById('inputNomeUser').value = '';
  document.getElementById('inputEmailUser').value = '';
  document.getElementById('inputUnidadeUser').value = '';
  document.getElementById('inputPerfilUser').value = '';
  document.getElementById('inputSenhaUser').value = '';
  document.getElementById('inputConfirmUser').value = '';
  
  loadUsuarios();
}

function loadUsuarios() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  
  // Filtrar por franquia se for gerente
  let filtered = usuarios;
  if (user.perfil === 'gerente') {
    filtered = usuarios.filter(u => u.unidade_id === user.unidade_id);
  }
  
  const tbody = document.getElementById('tbodyUsuarios');
  const table = document.getElementById('usuariosTable');
  const empty = document.getElementById('usuariosEmpty');
  
  if (filtered.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  tbody.innerHTML = '';
  filtered.forEach(u => {
    const unidade = unidades.find(ud => ud.id === u.unidade_id);
    const podeEditar = user.perfil === 'administrador' || (user.perfil === 'gerente' && u.unidade_id === user.unidade_id);
    
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${unidade?.nomeFranquia || unidade?.nome || '-'}</td>
      <td><span class="badge">${u.perfil}</span></td>
      <td>
        ${podeEditar ? `<button class="btn-edit" onclick="editarUsuario(${u.id})">Editar</button>` : ''}
        ${podeEditar ? `<button class="btn-danger" onclick="deleteUsuario(${u.id})">Deletar</button>` : '-'}
      </td>
    `;
  });
  
  empty.style.display = 'none';
  table.style.display = 'table';
}

function editarUsuario(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuarioEditar = usuarios.find(u => u.id === id);
  
  if (!usuarioEditar) return;
  
  // Validar permissão
  if (user.perfil !== 'administrador' && 
      (user.perfil !== 'gerente' || usuarioEditar.unidade_id !== user.unidade_id)) {
    alert('Sem permissão para editar');
    return;
  }
  
  // Preencher formulário
  document.getElementById('inputNomeUser').dataset.editId = id;
  document.getElementById('inputNomeUser').value = usuarioEditar.nome;
  document.getElementById('inputEmailUser').value = usuarioEditar.email;
  document.getElementById('inputUnidadeUser').value = usuarioEditar.unidade_id;
  document.getElementById('inputPerfilUser').value = usuarioEditar.perfil;
  document.getElementById('inputSenhaUser').value = '';
  document.getElementById('inputConfirmUser').value = '';
  
  // Scroll para formulário
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteUsuario(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuarioDelete = usuarios.find(u => u.id === id);
  
  // Validar permissão
  if (user.perfil !== 'administrador' && 
      (user.perfil !== 'gerente' || usuarioDelete.unidade_id !== user.unidade_id)) {
    alert('Sem permissão para deletar');
    return;
  }
  
  if (!confirm('Deletar usuário? Esta ação é irreversível.')) return;
  
  let usuariosAtualizar = JSON.parse(localStorage.getItem('usuarios') || '[]');
  usuariosAtualizar = usuariosAtualizar.filter(u => u.id !== id);
  localStorage.setItem('usuarios', JSON.stringify(usuariosAtualizar));
  loadUsuarios();
  alert('Usuário deletado!');
}

// ===== PRIVILÉGIOS =====

function loadPrivilegios() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const admin = user.perfil === 'administrador';
  
  // Privilégios padrão
  const privilegios = JSON.parse(localStorage.getItem('privilegios') || JSON.stringify([
    { acao: 'Dashboard', admin: true, gerente: true, usuario: true },
    { acao: 'Financeiro (Import)', admin: true, gerente: true, usuario: false },
    { acao: 'Configuração', admin: true, gerente: true, usuario: false },
    { acao: 'Usuários (CRUD)', admin: true, gerente: true, usuario: false },
    { acao: 'Privilégios', admin: true, gerente: false, usuario: false }
  ]));
  
  const tbody = document.getElementById('tbodyPrivilegios');
  tbody.innerHTML = '';
  
  privilegios.forEach((priv, idx) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td><strong>${priv.acao}</strong></td>
      <td><input type="checkbox" ${priv.admin ? 'checked' : ''} ${admin ? '' : 'disabled'} data-idx="${idx}" data-perfil="admin"></td>
      <td><input type="checkbox" ${priv.gerente ? 'checked' : ''} ${admin ? '' : 'disabled'} data-idx="${idx}" data-perfil="gerente"></td>
      <td><input type="checkbox" ${priv.usuario ? 'checked' : ''} ${admin ? '' : 'disabled'} data-idx="${idx}" data-perfil="usuario"></td>
    `;
  });
  
  // Mostrar botão save apenas se admin
  document.getElementById('btnSavePriv').style.display = admin ? 'block' : 'none';
}

function salvarPrivilegios() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (user.perfil !== 'administrador') {
    alert('Sem permissão');
    return;
  }
  
  const checkboxes = document.querySelectorAll('#tbodyPrivilegios input[type="checkbox"]');
  const privilegios = [];
  
  const acoes = document.querySelectorAll('#tbodyPrivilegios strong');
  acoes.forEach((acao, idx) => {
    const priv = {
      acao: acao.textContent,
      admin: checkboxes[idx * 3].checked,
      gerente: checkboxes[idx * 3 + 1].checked,
      usuario: checkboxes[idx * 3 + 2].checked
    };
    privilegios.push(priv);
  });
  
  localStorage.setItem('privilegios', JSON.stringify(privilegios));
  alert('Privilégios salvos com sucesso!');
}
