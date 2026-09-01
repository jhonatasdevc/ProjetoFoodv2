-- Dados de exemplo pra testar localmente.
-- Senha de todas as lojas de teste: "senha123" — gerado com bcrypt.hashSync('senha123', 10)
-- Senha do admin de teste: "admin123" — gerado com bcrypt.hashSync('admin123', 10)

INSERT INTO grupo (nome, ordem) VALUES
  ('Pizza', 1),
  ('Hambúrguer', 2),
  ('Japonesa', 3),
  ('Doces', 4),
  ('Brasileira', 5),
  ('Saudável', 6);

INSERT INTO admin (nome, email, senha_hash) VALUES
  ('Admin', 'admin@delivery.com', '$2a$10$oAAUzztSy6.SFN03tNHJFuVzeHMmeYAxxMHzqzeYl13KWS1syKY9W');

-- Lojas de exemplo já nascem desbloqueadas (ativo=true) e com frete configurado — só as
-- lojas cadastradas pelo admin de verdade nascem bloqueadas (default da coluna).
INSERT INTO loja (id_grupo, nome, arroba, email, senha_hash, telefone, endereco, imagem_url, imagem_perfil_url, aceita_entrega, tipo_frete, valor_frete, aceita_retirada, ativo) VALUES
  (1, 'Pizzaria do Zé', 'zepizza', 'ze@pizzaria.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11999998888', 'Rua das Pizzas, 100', 'https://picsum.photos/seed/pizzaria-do-ze/480/600', 'https://picsum.photos/seed/pizzaria-do-ze-perfil/200/200', true, 'pago', 6.00, false, true),
  (2, 'Burger House', 'burgerhouse', 'contato@burgerhouse.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11988887777', 'Av. dos Hambúrgueres, 200', 'https://picsum.photos/seed/burger-house/480/600', 'https://picsum.photos/seed/burger-house-perfil/200/200', true, 'gratis', null, true, true),
  (3, 'Sushi Kazu', 'sushikazu', 'contato@sushikazu.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11977776666', 'Rua Japão, 300', 'https://picsum.photos/seed/sushi-kazu/480/600', 'https://picsum.photos/seed/sushi-kazu-perfil/200/200', true, 'pago', 9.90, false, true),
  (4, 'Doce Sonho', 'docesonho', 'contato@docesonho.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11966665555', 'Rua das Sobremesas, 400', 'https://picsum.photos/seed/doce-sonho/480/600', 'https://picsum.photos/seed/doce-sonho-perfil/200/200', false, 'pago', null, true, true),
  (5, 'Sabor Caseiro', 'saborcaseiro', 'contato@saborcaseiro.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11955554444', 'Rua do Brasil, 500', 'https://picsum.photos/seed/sabor-caseiro/480/600', 'https://picsum.photos/seed/sabor-caseiro-perfil/200/200', true, 'pago', 5.50, false, true),
  (6, 'Verde Vida', 'verdevida', 'contato@verdevida.com', '$2a$10$GgpB9F4/R4xG8h.Gwt1PCOPHAmry1h0tmOr/Ogfujt37wnHS5G/WC', '11944443333', 'Alameda Saudável, 600', 'https://picsum.photos/seed/verde-vida/480/600', 'https://picsum.photos/seed/verde-vida-perfil/200/200', true, 'gratis', null, false, true);

-- Lojas de exemplo abertas todo santo dia, 24h — só pra não bloquear pedido nas demos
-- dependendo da hora que alguém for testar. Loja de verdade configura isso em /horarios.
INSERT INTO horario_funcionamento (id_loja, dia_semana, abre_em, fecha_em, fechado)
SELECT loja.id, dia.n, '00:00', '23:59', false
FROM loja
CROSS JOIN generate_series(0, 6) AS dia(n);

INSERT INTO categoria (id_loja, nome, ordem) VALUES
  (1, 'Pizzas', 1),
  (1, 'Bebidas', 2),
  (2, 'Lanches', 1),
  (3, 'Combinados', 1),
  (4, 'Doces', 1),
  (5, 'Pratos', 1),
  (6, 'Saladas', 1);

INSERT INTO item (id_categoria, nome, descricao, preco) VALUES
  (1, 'Pizza Margherita', 'Molho de tomate, mussarela e manjericão', 42.90),
  (1, 'Pizza Calabresa', 'Molho de tomate, mussarela e calabresa', 39.90),
  (2, 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Fanta', 6.00),
  (3, 'X-Burger', 'Pão, hambúrguer, queijo, alface e tomate', 24.90),
  (3, 'X-Bacon', 'Pão, hambúrguer, queijo, bacon e molho especial', 28.90),
  (4, 'Combo 20 peças', 'Sushis e sashimis variados', 49.90),
  (4, 'Temaki Salmão', 'Temaki de salmão fresco', 22.90),
  (5, 'Brownie', 'Brownie de chocolate com nozes', 12.90),
  (5, 'Pudim', 'Pudim de leite condensado', 9.90),
  (6, 'Feijoada', 'Feijoada completa com acompanhamentos', 32.90),
  (6, 'Frango com Quiabo', 'Frango caipira com quiabo e polenta', 28.90),
  (7, 'Salada Caesar', 'Alface, frango grelhado, croutons e parmesão', 24.90),
  (7, 'Bowl Vegano', 'Grãos, legumes e molho tahine', 26.90);

INSERT INTO item_complemento (id_item, nome, preco_adicional) VALUES
  (1, 'Borda recheada catupiry', 8.00),
  (2, 'Borda recheada catupiry', 8.00);

INSERT INTO cupom (codigo, tipo_desconto, valor_desconto) VALUES
  ('BEMVINDO10', 'percentual', 10);
