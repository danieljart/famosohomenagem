# Fame Tracker

Cria um sisteminha web simples (single page, sem necessidade de login ou criação de conta) pra controlar uma lista de "famosos já homenageados" por criadores de conteúdo. Funcionalidades:

Caixa de pesquisa no topo, onde a pessoa digita o nome de um famoso. A busca deve ser tipo autocomplete/live search (filtra enquanto digita, sem precisar apertar botão), e não precisa ser exata (ex: buscar "faustão" já acha "Faustão/Bisteca").

Resultado da busca, mostrando pra cada famoso encontrado:

Nome do criador

@ do criador (usuário do Instagram/TikTok, o que for)

Nome do famoso homenageado

Data em que foi feito

Se não achar nada, mostrar algo tipo "Ainda não foi feito" pra já indicar que tá livre.

Área de importação/cadastro em massa, separada da busca (pode ser uma aba ou seção "Adicionar dados"), onde dá pra colar uma lista de vários registros de uma vez (tipo copiar e colar de uma planilha ou texto) e o sistema separa automaticamente em: criador, @ do criador, famoso, data. Também quero poder adicionar um registro único rapidinho por um formulário simples.

Os dados ficam salvos permanentemente (banco de dados simples tipo SQLite ou equivalente), sem precisar de login, qualquer pessoa que acessar o link já pode ver e adicionar.

Visual limpo, direto, mobile-friendly (vai ser usado bastante no celular), sem frescura.

Stack pode ser a que for mais simples de subir rápido (tipo Next.js + SQLite, ou HTML/JS + backend leve). Não precisa de autenticação, permissões ou multiusuário, é uso interno e informal.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://famosohomenagem.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0242352-15ff-448c-b080-b3460965cabb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
