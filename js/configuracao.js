/**
 * VA Business - Sistema Financeiro v1.0.0
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
  
  if (!nomeFranquia || !razaoSocial || !cnpj || !cep || !rua || !numero || !cidade || !estado) {
    alert('Preencha todos os campos obrigatórios (*)');
    return;
  }
  
  const unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  if (unidades.find(u => u.cnpj.replace(/\D/g, '') === cnpj.replace(/\D/g, ''))) {
    alert('CNPJ já cadastrado');
    return;
  }
  
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
    endereco_completo: `${rua}, ${numero}${complemento ? ', ' + complemento : ''} - ${bairro}, ${cidade} - ${estado} ${cep}`,
    data_criacao: new Date().toLocaleDateString('pt-BR')
  };
  
  unidades.push(novaUnidade);
  localStorage.setItem('unidades', JSON.stringify(unidades));
  
  // Limpar formulário
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
  limparEndereco();
  
  loadUnidades();
  alert('Franquia criada!');
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
      <td><button class="btn-danger" onclick="deleteUnidade(${u.id})">Deletar</button></td>
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
  if (!confirm('Deletar unidade?')) return;
  let unidades = JSON.parse(localStorage.getItem('unidades') || '[]');
  unidades = unidades.filter(u => u.id !== id);
  localStorage.setItem('unidades', JSON.stringify(unidades));
  loadUnidades();
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
  
  if (senha !== confirm) {
    alert('Senhas não conferem');
    return;
  }
  
  // Se gerente, só pode criar em sua franquia
  if (user.perfil === 'gerente' && user.unidade_id !== parseInt(unidade_id)) {
    alert('Gerente só pode criar usuários da sua franquia');
    return;
  }
  
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  if (usuarios.find(u => u.email === email)) {
    alert('Email já cadastrado');
    return;
  }
  
  const novoUsuario = {
    id: Date.now(),
    nome, email, unidade_id: parseInt(unidade_id), perfil, senha,
    ativo: true,
    data_criacao: new Date().toLocaleDateString('pt-BR')
  };
  
  usuarios.push(novoUsuario);
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  
  document.getElementById('inputNomeUser').value = '';
  document.getElementById('inputEmailUser').value = '';
  document.getElementById('inputUnidadeUser').value = '';
  document.getElementById('inputPerfilUser').value = '';
  document.getElementById('inputSenhaUser').value = '';
  document.getElementById('inputConfirmUser').value = '';
  
  loadUsuarios();
  alert('Usuário criado!');
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
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${unidade?.nome || '-'}</td>
      <td><span class="badge">${u.perfil}</span></td>
      <td>${user.perfil !== 'usuario' ? `<button class="btn-danger" onclick="deleteUsuario(${u.id})">Deletar</button>` : '-'}</td>
    `;
  });
  
  empty.style.display = 'none';
  table.style.display = 'table';
}

function deleteUsuario(id) {
  if (!confirm('Deletar usuário?')) return;
  let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  usuarios = usuarios.filter(u => u.id !== id);
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  loadUsuarios();
}
