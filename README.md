<div align="center">
<a href="#" target="blank">
    <img src="https://amazn-personal-blog.s3.us-east-1.amazonaws.com/favicon-96x96.png" width="96" alt="Logo"/>
</a>

[![FastAPI](https://img.shields.io/badge/FastAPI-009485.svg?style=for-the-badge&logo=fastapi&logoColor=white)](#)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

<h2> semicolon - markdown editor </h2>
</div>

## Funcionalidades

- Criação, edição e exclusão de notas, com título e conteúdo em Markdown.
- Prévia em tempo real.
- Sanitização do HTML gerado antes de exibi-lo na prévia.
- Explorador de notas com paginação de cinco itens por página e atualização manual da lista.
- Salvamento pelo botão **Save** ou pelo atalho **Ctrl + S**.
- Indicador de alterações não salvas e confirmação para descartá-las ao abrir outra nota ou criar uma nova.
- Confirmação antes de excluir uma nota.
- Exibição das datas de criação e atualizaçã.
- Editor e prévia lado a lado.

## Tecnologias

- **HTML5**, **CSS3** e **JavaScript puro**, sem framework ou etapa de compilação.
- **Fetch API** para comunicação com o back-end.
- **Marked** para converter Markdown em HTML.
- **DOMPurify** para sanitizar o HTML da prévia.

As bibliotecas estão incluídas em [`vendor/`](vendor/README.md), junto de suas licenças. Não é necessário instalar pacotes com npm nem carregar essas bibliotecas de uma CDN.

## Como executar

Você precisa de um navegador moderno, um servidor de arquivos estáticos e do back-end compatível com o contrato descrito abaixo. Para o exemplo de servidor local, tenha o Python 3 instalado.

1. Inicie o back-end em `http://127.0.0.1:8000`.
2. Acesse o arquivo [`index.html`](index.html)  no navegador.

### Configuração da API

O endereço da API é definido diretamente em [`app.js`](app.js):

```js
const API_URL = 'http://127.0.0.1:8000/notes/';
```

## Integração com o back-end

O front-end espera os seguintes endpoints:

| Método | Endpoint | Uso | Resposta esperada |
| --- | --- | --- | --- |
| `GET` | `/notes/?skip=0&limit=6` | Listar notas com paginação | Array de notas |
| `GET` | `/notes/{note_id}` | Abrir uma nota | Objeto da nota |
| `POST` | `/notes/` | Criar uma nota | Objeto da nota salva |
| `PATCH` | `/notes/{note_id}` | Atualizar uma nota | Objeto da nota atualizada |
| `DELETE` | `/notes/{note_id}` | Excluir uma nota | `204 No Content` |

Cada nota retornada deve conter os campos abaixo. Os valores são ilustrativos:

```json
{
  "note_id": 1,
  "title": "Minha primeira nota",
  "content": "# Olá, Semicolon!\n\nUma nota em **Markdown**.",
  "created_at": "2026-09-20T12:00:00Z",
  "updated_at": "2026-09-20T12:30:00Z"
}
```

Na criação, o corpo JSON contém `title` e `content`. Na atualização, são enviados apenas os campos alterados. O título é obrigatório e o campo da interface permite até 255 caracteres.

A listagem solicita seis registros para detectar a existência de uma próxima página, mas exibe apenas cinco. O parâmetro `skip` avança de cinco em cinco.

## Estrutura do projeto

```text
.
├── index.html   # Estrutura da interface e carregamento dos scripts
├── styles.css   # Folha de estilo
├── app.js       # Estado da interface, edição, prévia e integração com a API
├── assets/      # Ícones e recursos visuais
├── vendor/      # Bibliotecas distribuídas com o projeto e suas licenças
└── README.md
```
