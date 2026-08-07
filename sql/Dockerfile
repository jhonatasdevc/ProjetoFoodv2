FROM postgres:16-alpine

# Copia os scripts de criação de schema/seed direto pra imagem — sem depender
# de bind mount, que não é confiável em plataformas que só leem o
# docker-compose.yml a partir do GitHub (ex: Hostinger).
COPY sql/init/ /docker-entrypoint-initdb.d/
