-- Dados de exemplo pra testar o MVP localmente.
-- Senha da loja de teste: "senha123" (hash bcrypt abaixo, ver apps/api/README ou seed.ts)
-- Gerado com bcrypt.hashSync('senha123', 10)
INSERT INTO loja (nome, email, senha_hash, telefone, endereco) VALUES
  ('Pizzaria do Zé', 'ze@pizzaria.com', '$2b$10$NA2R9CzmTVfz1oB1z9fIJebL9e1rUUJNspJE9wEB/bhdXh5t1FKvK', '11999998888', 'Rua das Pizzas, 100');

INSERT INTO categoria (id_loja, nome, ordem) VALUES
  (1, 'Pizzas', 1),
  (1, 'Bebidas', 2);

INSERT INTO item (id_categoria, nome, descricao, preco) VALUES
  (1, 'Pizza Margherita', 'Molho de tomate, mussarela e manjericão', 42.90),
  (1, 'Pizza Calabresa', 'Molho de tomate, mussarela e calabresa', 39.90),
  (2, 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Fanta', 6.00);

INSERT INTO item_complemento (id_item, nome, preco_adicional) VALUES
  (1, 'Borda recheada catupiry', 8.00),
  (2, 'Borda recheada catupiry', 8.00);
