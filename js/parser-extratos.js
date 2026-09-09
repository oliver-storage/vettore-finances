/**
 * Vettore Finances - Parser Robusto de Extratos Bancários v1.9.35.0
 * Detecta banco automaticamente e extrai: mes, ano, agencia, conta, linhas
 */

const BANCOS_PATTERNS = {
  'Banco do Brasil': {
    detect: /Banco do Brasil|Agência:\s*\d+/i,
    agencia: /Agência:\s*(\d{4}-\d)/i,
    conta: /Conta:\s*(\d{3}-\d)/i,
    mes: /referente.*?(\d{1,2})\/\d{4}|período.*?(\d{1,2})\/(\d{4})/i,
    ano: /Agência:.*?Conta:.*?(\d{4})/i
  },
  'Itaú': {
    detect: /Itaú|banco itaú/i,
    agencia: /Agência:\s*(\d+)/i,
    conta: /Conta:\s*(\d+)/i
  },
  'Bradesco': {
    detect: /Bradesco|banco bradesco/i,
    agencia: /Agência:\s*(\d+)/i,
    conta: /Conta:\s*(\d+)/i
  },
  'Caixa': {
    detect: /Caixa|caixa econômica|CEF/i,
    agencia: /Agência:\s*(\d+)/i,
    conta: /Conta:\s*(\d+)/i
  },
  'Santander': {
    detect: /Santander|banco santander/i,
    agencia: /Agência:\s*(\d+)/i,
    conta: /Conta:\s*(\d+)/i
  }
};

class ParserExtratos {
  static async processar(arrayBuffer) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textContent = await this.extrairTexto(pdf);
      
      const banco = this.detectarBanco(textContent);
      const mesAno = this.extrairMesAno(textContent);
      const dadosConta = this.extrairDadosConta(textContent, banco);
      const linhas = this.extrairLinhas(textContent);

      return {
        sucesso: true,
        banco,
        mes: mesAno.mes,
        ano: mesAno.ano,
        agencia: dadosConta.agencia,
        conta: dadosConta.conta,
        linhas,
        reconhecidas: linhas.length,
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
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textContent += content.items.map(item => item.str).join(' ') + '\n';
    }
    return textContent;
  }

  static detectarBanco(texto) {
    for (const [nome, pattern] of Object.entries(BANCOS_PATTERNS)) {
      if (pattern.detect.test(texto)) {
        return nome;
      }
    }
    return 'Desconhecido';
  }

  static extrairMesAno(texto) {
    const regexData = /(\d{2})\/(\d{2})\/(\d{4})/;
    const matches = texto.match(regexData);
    
    if (matches) {
      const [, dia, mes, ano] = matches;
      return { mes: parseInt(mes), ano: parseInt(ano) };
    }

    // Fallback: usar mês/ano atual
    const agora = new Date();
    return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
  }

  static extrairDadosConta(texto, banco) {
    const patterns = BANCOS_PATTERNS[banco];
    if (!patterns) return { agencia: null, conta: null };

    const agencia = patterns.agencia?.exec(texto)?.[1];
    const conta = patterns.conta?.exec(texto)?.[1];

    return { agencia, conta };
  }

  static extrairLinhas(texto) {
    const linhas = [];
    
    // Padrão universal: DATA VALOR DESCRICAO
    // DD/MM/AAAA seguido de número (1.234,56 ou 1234,56)
    const regexLinhas = /(\d{2}\/\d{2}\/\d{4})[^\d]*?([\d.]+,\d{2})\s*([-+]?)\s*(.{10,150}?)(?=\d{2}\/\d{2}\/\d{4}|$)/g;
    
    let match;
    while ((match = regexLinhas.exec(texto)) !== null) {
      const [, dataBR, valorTexto, sinal, descricao] = match;
      
      const [dia, mes, ano] = dataBR.split('/');
      const dataISO = `${ano}-${mes}-${dia}`;
      
      const valor = parseFloat(valorTexto.replace(/[.]/g, '').replace(',', '.'));
      const isEntrada = !sinal.includes('-');

      linhas.push({
        data: dataISO,
        descricao: descricao.trim().substring(0, 80),
        valor,
        tipo: isEntrada ? 'ENTRADA' : 'SAÍDA',
        classificacao: isEntrada ? 'ENTRADA' : 'SAÍDA'
      });
    }

    return linhas;
  }

  static gerarAvisos(linhas) {
    const avisos = [];
    
    if (linhas.length === 0) {
      avisos.push('⚠️ Nenhuma linha foi reconhecida automaticamente');
    } else if (linhas.length < 5) {
      avisos.push(`⚠️ Apenas ${linhas.length} linha(s) reconhecida(s) — verifique se o PDF é legível`);
    }

    return avisos;
  }
}

console.log('✅ Parser de Extratos carregado');
