USUARIO
  id              SERIAL PK
  nome            VARCHAR
  telefone        VARCHAR UNIQUE       -- login costuma ser por telefone (whatsapp)
  email           VARCHAR
  senha_hash      VARCHAR              -- se tiver login por senha, nunca salvar em texto puro
  criado_em       TIMESTAMP DEFAULT now()

ENDERECO
  id              SERIAL PK
  id_usuario      FK -> USUARIO
  cep             VARCHAR
  cidade          VARCHAR
  estado          VARCHAR
  rua             VARCHAR
  numero          VARCHAR
  complemento     VARCHAR
  referencia      VARCHAR              -- "portão azul", ajuda o entregador
  latitude        DECIMAL              -- importante pra taxa de entrega por distância
  longitude       DECIMAL
  padrao          BOOLEAN DEFAULT false

REDE_SOCIAL   -- opcional, baixa prioridade pro MVP
  id              SERIAL PK
  id_usuario      FK -> USUARIO
  instagram       VARCHAR
  facebook        VARCHAR
  tiktok          VARCHAR

FORMA_PAGAMENTO
  id              SERIAL PK
  id_usuario      FK -> USUARIO
  gateway         VARCHAR              -- 'mercadopago', 'stripe', 'pagseguro'
  token_gateway   VARCHAR              -- token do cartão, NUNCA dado de cartão cru
  bandeira        VARCHAR              -- 'visa', 'master' (só pra exibir na UI)
  final_cartao    VARCHAR(4)           -- só os 4 últimos dígitos, pra exibir
  padrao          BOOLEAN DEFAULT false