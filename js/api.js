/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: API Supabase
 */

const supabaseURL = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';

async function fetchClientes() {
  try {
    const response = await fetch(`${supabaseURL}/rest/v1/clientes`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
  }
}

async function fetchExtratos() {
  try {
    const response = await fetch(`${supabaseURL}/rest/v1/extratos_movimentacoes`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar extratos:', error);
  }
}

async function insertExtrato(data) {
  try {
    const response = await fetch(`${supabaseURL}/rest/v1/extratos_movimentacoes`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error('Erro ao inserir extrato:', error);
  }
}
