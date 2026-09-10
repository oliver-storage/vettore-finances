/**
 * VA Business - Vettore Finances v1.9.67.0
 * Desenvolvido por OliverStorage
 * Módulo: Autenticação
 */

function checkAuth() {
  const user = localStorage.getItem('currentUser');
  const path = window.location.pathname;
  
  if (!user && !path.includes('login') && !path.includes('index')) {
    window.location.href = '../html/login.html';
  }
}

function logout() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('unidades');
  localStorage.removeItem('usuarios');
  localStorage.setItem('loggedOut', 'true');
  setTimeout(() => {
    localStorage.removeItem('loggedOut');
  }, 2000);
  window.location.href = '../index.html';
}

function canManageUsers() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return user.perfil === 'administrador' || user.perfil === 'gerente';
}

function getCurrentUserUnidade() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return user.unidade_id;
}
