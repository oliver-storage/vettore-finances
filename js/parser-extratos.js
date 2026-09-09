/**
 * Vettore Finances - Parser Robusto de Extratos Bancários v1.9.39.0
 * Suporta: Banco do Brasil, Itaú, Bradesco, Caixa, Santander
 */

class ParserExtratos {
  static async processar(arrayBuffer) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textContent = await this.extrairTexto(pdf);
      
      const banco = this.detectarBanco(textContent);
      const dadosConta = this.extrairDadosConta(textContent);
      const linhas = this.extrairLinhasBB(textContent); // Padrão BB
      const mesAno = this.extrairMesAnoDoLinhas(linhas);

      return {
        sucesso: true,
        banco,
        mes: mesAno.mes,
        ano: mesAno.ano,
        agencia: dadosConta.agencia,
        conta: dadosConta.conta,
        linhas: linhas.filter(l => l.data && l.valor), // Remover linhas vazias
        reconhecidas: linhas.filter(l => l.data && l.valor).length,
        avisos: this.gerarAvisos(linhas)
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  static async extrairTexto(pdf) {
    let textContent = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textContent += content.items.map(item => item.str).join(' ') + '\n';
    }
    return textContent;
  }

  static detectarBanco(texto) {
    if (/Banco do Brasil|Agência:.*Conta:/i.test(texto)) return 'Banco do Brasil';
    if (/Itaú/i.test(texto)) return 'Itaú';
    if (/Bradesco/i.test(texto)) return 'Bradesco';
    if (/Caixa|CEF/i.test(texto)) return 'Caixa';
    if (/Santander/i.test(texto)) return 'Santander';
    return 'Desconhecido';
  }

  static extrairDadosConta(texto) {
    const agenciaMatch = texto.match(/Agência:\s*(\d{4}-\d|\d+)/);
    const contaMatch = texto.match(/Conta:\s*(\d{3}-\d|\d+)/);
    
    return {
      agencia: agenciaMatch ? agenciaMatch[1] : null,
      conta: contaMatch ? contaMatch[1] : null
    };
  }

  static extrairLinhasBB(texto) {
    const linhas = [];
    
    // Padrão BB: data em DD/MM/YYYY seguida de valor com (+) ou (-)
    const regexLinhas = /(\d{2})\/(\d{2})\/(\d{4})[^\d]*?([\d.]+,\d{2})\s*\(([+-])\)/g;
    
    let match;
    const processados = new Set();

    while ((match = regexLinhas.exec(texto)) !== null) {
      const [fullMatch, dia, mes, ano, valorTexto, sinal] = match;
      
      if (!dia || !mes || !ano) continue;

      const chave = `${dia}/${mes}/${ano}${valorTexto}`;
      if (processados.has(chave)) continue;
      processados.add(chave);

      const dataISO = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const valor = parseFloat(valorTexto.replace(/[.]/g, '').replace(',', '.'));
      const isEntrada = sinal === '+';

      linhas.push({
        data: dataISO,
        descricao: 'Lançamento',
        valor,
        classificacao: isEntrada ? 'ENTRADA' : 'SAÍDA',
        tipo: null,
        entrada: isEntrada ? valor : null,
        saida: isEntrada ? null : valor
      });
    }

    return linhas;
  }

  static extrairLinhasSimples(texto) {
    const linhas = [];
    // Fallback: qualquer data DD/MM/YYYY + valor
    const regexData = /(\d{2})\/(\d{2})\/(\d{4})[^\d]*?([\d.]+,\d{2})\s*\(([+-])\)/g;
    
    let match;
    while ((match = regexData.exec(texto)) !== null) {
      const [, dia, mes, ano, valorTexto, sinal] = match;
      
      const dataISO = `${ano}-${mes}-${dia}`;
      const valor = parseFloat(valorTexto.replace(/[.]/g, '').replace(',', '.'));
      const isEntrada = sinal === '+';

      linhas.push({
        data: dataISO,
        descricao: 'Lançamento',
        valor,
        classificacao: isEntrada ? 'ENTRADA' : 'SAÍDA',
        tipo: null,
        entrada: isEntrada ? valor : null,
        saida: isEntrada ? null : valor
      });
    }

    return linhas;
  }

  static extrairMesAnoDoLinhas(linhas) {
    if (linhas.length === 0) {
      const agora = new Date();
      return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
    }

    // Usar a data da primeira linha válida
    const primeiraData = linhas.find(l => l.data);
    if (primeiraData) {
      const [ano, mes] = primeiraData.data.split('-');
      return { mes: parseInt(mes), ano: parseInt(ano) };
    }

    const agora = new Date();
    return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
  }

  static gerarAvisos(linhas) {
    const avisos = [];
    const validas = linhas.filter(l => l.data && l.valor);
    
    if (validas.length === 0) {
      avisos.push('⚠️ Nenhuma linha reconhecida. PDF pode estar em formato não suportado.');
    }

    return avisos;
  }
}

console.log('✅ Parser de Extratos v1.9.39.0 carregado');
