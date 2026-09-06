/**
 * Vettore Finances - Utilitários Supabase v1.7.0
 * API REST do Supabase via fetch
 */

const SUPABASE_URL = 'https://vjdtzesdabmbgnuhcifd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GKc2bhpVTzbQdVhJVEQBUw_HE4bxwWD';

class SupabaseAPI {
  static async get(table) {
    const PAGE_SIZE = 1000;
    let allRows = [];
    let offset = 0;

    while (true) {
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`;
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const page = await response.json();

      if (!Array.isArray(page) || page.length === 0) break;

      allRows = allRows.concat(page);

      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return allRows;
  }

  static async insert(table, data) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro Supabase:', response.status, result);
      throw new Error(result.message || 'Erro ao inserir');
    }
    
    return result;
  }

  static async update(table, id, data) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro Supabase:', response.status, result);
      throw new Error(result.message || 'Erro ao atualizar');
    }
    
    return result;
  }

  static async delete(table, id) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const result = await response.json();
      console.error('❌ Erro Supabase:', response.status, result);
      throw new Error(result.message || 'Erro ao deletar');
    }
    
    return true;
  }

  static async query(table, filters = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    
    for (const [key, value] of Object.entries(filters)) {
      url += `&${key}=eq.${value}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
}

console.log('✅ Supabase API Utils carregado');
