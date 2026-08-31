-- VA Business - Sistema Financeiro v1.0.0 • Desenvolvido por OliverStorage

CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  data_criacao TIMESTAMP DEFAULT now()
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  perfil VARCHAR(50) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT now()
);

CREATE TABLE extratos_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID REFERENCES unidades(id),
  data_movimento DATE,
  descricao VARCHAR(255),
  tipo_operacao VARCHAR(50),
  valor DECIMAL(15,2),
  saldo DECIMAL(15,2),
  tipo_pagamento VARCHAR(50),
  data_importacao TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_usuarios_unidade ON usuarios(unidade_id);
CREATE INDEX idx_extratos_unidade ON extratos_movimentacoes(unidade_id);

-- DADOS PADRÃO: Admin inicial (email: admin@va.com, senha: 123456)
