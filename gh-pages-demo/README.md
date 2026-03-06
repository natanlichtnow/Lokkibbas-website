# Demo Estatica para GitHub Pages

Esta pasta contem uma demonstracao simplificada do sistema de laudos.

## O que a demo mostra
- Tela admin com login demo
- Edicao por numero de serie
- Salvamento local em tempo real (`localStorage`)
- Consulta publica por serial
- Verificacao de autenticidade por hash no navegador

## Credenciais demo
- Usuario: `demo-admin`
- Senha: `demo-123`

## Limites da demo
- Nao possui backend
- Nao e seguranca real
- Login e assinatura sao apenas para apresentacao visual/funcional

## Publicar no GitHub Pages
1. Suba a pasta `gh-pages-demo` para o repositorio.
2. Em `Settings > Pages`, selecione a branch e pasta (`/root` ou `/docs`).
3. Se optar por `/docs`, mova o conteudo para `docs` ou configure Pages para pasta correspondente.
4. Acesse a URL publicada.

## Arquivos
- `index.html`: consulta publica
- `admin.html`: painel demo
- `css/demo.css`: estilo BEM inspirado no laudo
- `js/demo-store.js`: armazenamento e assinatura no navegador
- `js/admin-demo.js`: fluxo do admin
- `js/public-demo.js`: fluxo publico
