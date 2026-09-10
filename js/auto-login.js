/**
 * Vettore Finances - Auto Login v1.9.64.0
 * Cria usuário automático e faz login sem senha
 */

(function() {
  console.log('🔓 Auto-login iniciado...');
  
  // Dados do usuário automático
  const usuarioAutomatico = {
    id: 1,
    nome: 'Usuário Sistema',
    email: 'sistema@vettore.com',
    unidade_id: 1,
    perfil: 'administrador',
    ativo: true,
    data_criacao: new Date().toISOString()
  };

  // Franquia padrão
  const franquiaParao = {
    id: 1,
    nomeFranquia: 'RSN HUB CONTABIL',
    nome: 'RSN HUB CONTABIL',
    razaoSocial: 'RSN HUB CONTABIL LTDA',
    cnpj: '00.000.000/0000-00',
    telefone: '(85) 98888-8888',
    email: 'contato@rsn.com',
    cep: '00000-000',
    rua: 'Rua Exemplo',
    numero: '123',
    complemento: '',
    bairro: 'Centro',
    cidade: 'Sobral',
    estado: 'CE',
    banco: '748',
    agencia: '2301',
    conta: '53058-1',
    tipoConta: 'Corrente'
  };

  // Criar unidades se não existir
  if (!localStorage.getItem('unidades')) {
    localStorage.setItem('unidades', JSON.stringify([franquiaParao]));
    console.log('✅ Franquia criada');
  }

  // Criar usuários se não existir
  if (!localStorage.getItem('usuarios')) {
    localStorage.setItem('usuarios', JSON.stringify([usuarioAutomatico]));
    console.log('✅ Usuário criado');
  }

  // Fazer login automático (mas não se fez logout intencional)
  if (!localStorage.getItem('currentUser') && !localStorage.getItem('loggedOut')) {
    localStorage.setItem('currentUser', JSON.stringify(usuarioAutomatico));
    console.log('✅ Login automático realizado');
    console.log('👤 Usuário:', usuarioAutomatico.nome);
    console.log('🏢 Franquia:', franquiaParao.nomeFranquia);
    console.log('👑 Perfil:', usuarioAutomatico.perfil);
  } else if (localStorage.getItem('loggedOut')) {
    console.log('⛔ Logout recente detectado - auto-login desabilitado');
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('html/')) {
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 500);
    }
  } else if (localStorage.getItem('currentUser')) {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      console.log('✅ Já logado como:', user.nome);
    } catch (e) {
      console.error('❌ Erro ao recuperar usuário:', e);
      localStorage.removeItem('currentUser');
    }
  }

  // Redirecionar se estiver na página de login
  if (window.location.pathname.includes('login.html')) {
    console.log('↪️ Redirecionando para dashboard...');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  }
})();
