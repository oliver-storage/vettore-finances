-- VA Business - Sistema Financeiro v1.0.0 • Desenvolvido por OliverStorage
-- Schema: Banco de Dados PostgreSQL + Supabase

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  data_criacao TIMESTAMP DEFAULT now()
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nome_completo VARCHAR(255),
  role_id UUID REFERENCES roles(id),
  unidade_id UUID REFERENCES unidades(id),
  data_criacao TIMESTAMP DEFAULT now()
);

CREATE TABLE contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  banco VARCHAR(100),
  agencia VARCHAR(10),
  numero_conta VARCHAR(20),
  tipo VARCHAR(20)
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  nome_cliente VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14),
  email VARCHAR(255)
);

CREATE TABLE extratos_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),
  data_movimento DATE,
  descricao_banco VARCHAR(255),
  tipo_operacao VARCHAR(50),
  valor DECIMAL(15,2),
  saldo_pos_operacao DECIMAL(15,2),
  tipo_pagamento VARCHAR(50),
  data_importacao TIMESTAMP DEFAULT now()
);

CREATE TABLE pagamentos_identificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID REFERENCES extratos_movimentacoes(id),
  cliente_id UUID REFERENCES clientes(id),
  data_pagamento DATE,
  valor_pagamento DECIMAL(15,2),
  data_criacao TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_extratos_data ON extratos_movimentacoes(data_movimento);
CREATE INDEX idx_clientes_unidade ON clientes(unidade_id);

INSERT INTO roles (nome) VALUES ('administrador'), ('gerente'), ('usuario') ON CONFLICT DO NOTHING;
