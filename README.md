# Projeto 2

Clone independente do Projeto 1 (Brasil em Casas), criado para explorar bases e batalhas no mapa do Brasil.

A ideia e a distinção entre direção do usuário, propostas e trabalho implementado estão em [PROJETO_2.md](PROJETO_2.md).

**Estado atual:** cópia funcional do mapa original, ainda com imóveis e regras de prefeitura. A batalha não foi implementada nesta etapa. Não há banco, conta Instagram, Site ou repositório remoto vinculados a este clone.

## Executar a base local

Node.js 22.x ou superior compatível. O clone não copia dependências instaladas ou credenciais.

```sh
npm ci
npm run dev:vercel -- --hostname 127.0.0.1 --port 5179
```

Sem variáveis de banco, abre a demonstração visual sem salvar moradores. Para validar o build Next.js: `npm run build:vercel`. As credenciais futuras devem pertencer ao Projeto 2; não reutilizar o banco do Projeto 1 automaticamente.

A documentação técnica herdada está em [README_BASE_MAPA.md](README_BASE_MAPA.md). As regras e nomes de casas presentes nessa documentação descrevem a base anterior, não requisitos aprovados para a batalha.
