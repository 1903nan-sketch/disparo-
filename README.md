# Disparo WhatsApp (Evolution API)

Site simples para mandar pro cliente: ele conecta o WhatsApp dele pelo QR Code, escolhe **todos os contatos do WhatsApp** ou **importa um arquivo .vcf**, escreve a mensagem e dispara.

## Rodar

Precisa de Node 18+ (não tem dependências).

```bash
cp .env.example .env   # preencha EVOLUTION_URL e EVOLUTION_APIKEY
npm start
```

Abra `http://localhost:3000`.

## Link para o cliente

Mande o link com o nome da instância já definido, assim o cliente só lê o QR Code:

```
https://seusite.com/?i=loja-da-maria
```

Sem o `?i=`, o site pergunta o nome da empresa e cria a instância com esse nome.

## Como funciona

- `server.js` serve o site e repassa só as rotas necessárias para a Evolution API (v2). A **API key fica no servidor**, nunca vai pro navegador.
- Se a instância não existir, ela é criada automaticamente e o QR Code aparece.
- Contatos do WhatsApp vêm de `/chat/findContacts` (logo após conectar a lista pode vir incompleta; o WhatsApp sincroniza aos poucos).
- `.vcf`: aceita vCard 2.1/3.0/4.0, vários telefones por contato. Números sem DDI recebem `55` (Brasil).
- Mensagem aceita `{nome}` (primeiro nome). Envio com intervalo aleatório entre mínimo e máximo, com botão de parar.

## Atenção

Qualquer pessoa com o link do site consegue criar/usar instâncias pelo nome. Se for publicar aberto na internet, coloque atrás de uma senha (ex.: basic auth no Nginx/Cloudflare) ou use nomes de instância difíceis de adivinhar.
