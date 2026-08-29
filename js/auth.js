/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Autenticação
 */

// Placeholder para Supabase Auth
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY';

function loginUser(email, password) {
  // Implementar autenticação Supabase
  console.log('Login:', email);
}

function checkAuth() {
  const user = localStorage.getItem('user');
  if (!user) {
    window.location.href = '/login.html';
  }
}
