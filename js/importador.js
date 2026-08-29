/**
 * VA Business - Sistema Financeiro v1.0.0
 * Desenvolvido por OliverStorage
 * Módulo: Importador XLS
 */

// Incluir SheetJS via CDN no HTML: <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js"></script>

async function importarExtratoXLS(file) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Processar dados
    const extratos = processarDadosExtrato(json);
    console.log('Extratos importados:', extratos);
    
    // Salvar no localStorage ou enviar para Supabase
    await salvarExtratos(extratos);
    
    return extratos;
  } catch (error) {
    console.error('Erro ao importar XLS:', error);
    alert('Erro ao importar arquivo: ' + error.message);
  }
}

function processarDadosExtrato(json) {
  const extratos = [];
  let headers = [];
  
  // Encontrar linha do header
  let startRow = 0;
  for (let i = 0; i < json.length; i++) {
    if (json[i][0] === 'Data' || json[i][1] === 'Descrição') {
      headers = json[i];
      startRow = i + 1;
      break;
    }
  }
  
  // Mapear colunas
  const colMap = {
    data: headers.indexOf('Data'),
    descricao: headers.findIndex(h => h && h.includes('Descrição')),
    valor: headers.findIndex(h => h && h.includes('Valor')),
    saldo: headers.findIndex(h => h && h.includes('Saldo')),
    documento: headers.indexOf('Documento')
  };
  
  // Extrair dados
  for (let i = startRow; i < json.length; i++) {
    const row = json[i];
    if (!row[colMap.data] || row[colMap.data] === '') break;
    
    const valor = parseFloat(String(row[colMap.valor]).replace(/[^\d,-]/g, '').replace(',', '.'));
    
    extratos.push({
      data: row[colMap.data],
      descricao: row[colMap.descricao],
      valor: valor,
      saldo: parseFloat(String(row[colMap.saldo]).replace(/[^\d,-]/g, '').replace(',', '.')),
      tipo_operacao: valor < 0 ? 'debito' : 'credito',
      tipo_pagamento: detectarTipoPagamento(row[colMap.descricao]),
      documento: row[colMap.documento]
    });
  }
  
  return extratos;
}

function detectarTipoPagamento(descricao) {
  if (!descricao) return 'outro';
  const desc = String(descricao).toUpperCase();
  
  if (desc.includes('PIX')) return 'pix';
  if (desc.includes('BOLETO') || desc.includes('COB')) return 'boleto';
  if (desc.includes('TRANSF') || desc.includes('DOC') || desc.includes('TED')) return 'transferencia';
  if (desc.includes('TARIFA')) return 'tarifa';
  
  return 'outro';
}

async function salvarExtratos(extratos) {
  try {
    // Salvar em localStorage temporariamente
    localStorage.setItem('extratos_temp', JSON.stringify(extratos));
    
    // TODO: Enviar para Supabase
    // const response = await fetch('...', {
    //   method: 'POST',
    //   headers: { ... },
    //   body: JSON.stringify(extratos)
    // });
    
    console.log('Extratos salvos:', extratos.length);
  } catch (error) {
    console.error('Erro ao salvar extratos:', error);
  }
}
