/**
 * Vettore Finances - Parser Robusto de Extratos Bancários v1.9.53.0
 */

class ParserExtratos {
  static async processar(arrayBuffer) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textContent = await this.extrairTexto(pdf);
      
      const banco = this.detectarBanco(textContent);
      const dadosConta = this.extrairDadosConta(textContent);
      const linhas = this.extrairLinhasBB(textContent);
      const mesAno = this.extrairMesAnoDoLinhas(linhas);

      const linhasValidas = linhas.filter(l => l.data && l.valor && !l.ignorar);

      return {
        sucesso: true,
        banco,
        mes: mesAno.mes,
        ano: mesAno.ano,
        agencia: dadosConta.agencia,
        conta: dadosConta.conta,
        linhas: linhasValidas,
        reconhecidas: linhasValidas.length
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
    
    // Regex permissiva: Data + QUALQUER COISA + Valor com (+/-)
    // Captura tudo entre data e valor como descrição
    const regexLinha = /(\d{2})\/(\d{2})\/(\d{4})\s+(.+?)\s+([\d.]+,\d{2})\s*\(([+-])\)/g;
    
    let match;
    const processados = new Set();

    while ((match = regexLinha.exec(texto)) !== null) {
      const [fullMatch, dia, mes, ano, historico, valorTexto, sinal] = match;
      
      if (!dia || !mes || !ano || !valorTexto) continue;

      const chave = `${dia}/${mes}/${ano}${valorTexto}${sinal}`;
      if (processados.has(chave)) continue;
      processados.add(chave);

      const dataISO = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const valor = parseFloat(valorTexto.replace(/[.]/g, '').replace(',', '.'));
      const isEntrada = sinal === '+';
      
      // Ignorar apenas: "Saldo do dia", "Saldo Anterior", "Estorno de Débito"
      const ignorar = /saldo\s*do\s*dia|saldo\s*anterior|estorno\s*de\s*débito/i.test(historico);
      const descricao = historico.trim().replace(/\s+/g, ' ').substring(0, 120);

      linhas.push({
        data: dataISO,
        descricao,
        valor,
        classificacao: isEntrada ? 'ENTRADA' : 'SAÍDA',
        tipo: null,
        entrada: isEntrada ? valor : null,
        saida: isEntrada ? null : valor,
        ignorar
      });
    }

    return linhas;
  }

  static extrairMesAnoDoLinhas(linhas) {
    const validas = linhas.filter(l => l.data && l.valor && !l.ignorar);
    
    if (validas.length === 0) {
      const agora = new Date();
      return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
    }

    const primeiraData = validas[0].data;
    const [ano, mes] = primeiraData.split('-');
    return { mes: parseInt(mes), ano: parseInt(ano) };
  }
}

console.log('✅ Parser de Extratos v1.9.53.0 carregado');
