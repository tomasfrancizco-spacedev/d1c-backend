# Division One Crypto Frontend (D1C)

Backend API for Division One Crypto built with NestJS, TypeORM, and PostgreSQL. It provides wallet + email + OTP authentication, fee management, college data, D1C wallet endpoints, transactions, stats, and webhooks. API documentation is available via Swagger.

## Tech stack
- **Runtime**: Node.js, NestJS
- **Database/ORM**: PostgreSQL, TypeORM
- **Auth**: JWT, Email OTP
- **Docs**: Swagger (OpenAPI)

---

## Quick start

1) Install dependencies
```bash
yarn install
```

2) Create a `.env` file
```env
# Server
PORT=3000
API_VERSION=v1
NODE_ENV=development

# Postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=d1c

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d

# Email (optional for OTP emails; logs to console if missing)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Blockchain listener
HELIUS_API_KEY=
WEBHOOK_AUTH_TOKEN=

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
TOKEN_MINT_ADDRESS=
OPS_WALLET_SECRET_KEY=
WITHDRAW_AUTHORITY_SECRET_KEY=
MINT_AUTHORITY_SECRET_KEY=

# Fee Processing Automation
ENABLE_AUTOMATED_FEE_PROCESSING=true
CRON_FEE_PROCESSING=0 */30 * * * *  # Every 30 minutes
```

3) Run database migrations
```bash
yarn run migration:run -d data-source.ts
```

4) (Optional) Seed colleges
```bash
yarn run seed:colleges
```

5) Start the API
```bash
# watch mode
yarn start:dev

# or production (build + run)
yarn run prestart:prod && yarn run start:prod
```

6) Open API docs
```text
http://localhost:3000/v1/doc-api
```

---

## Scripts

- `start`: run built app (`dist/src/main`)
- `start:dev`: start in watch mode
- `start:prod`: run built app (use with `prestart:prod`)
- `prestart:prod`: build before prod start
- `build`: compile TypeScript
- `lint`: run ESLint with auto-fix
- `test`, `test:watch`, `test:cov`, `test:e2e`: run tests
- `migration:generate`: generate a TypeORM migration
- `migration:create`: create an empty migration
- `migration:run`: run pending migrations
- `migration:revert`: revert last migration
- `migration:show`: list executed/pending migrations
- `db:reset`: drop and recreate schema then run all migrations
- `seed:colleges`: seed `College` entities from `src/data/schools.json`
- `pm2:deploy:app|start:app|stop:app|destroy:app|restart:app`: manage PM2 process using `app.json`

Examples:
```bash
# Generate a migration (name + point CLI to data-source)
yarn run migration:generate -- -n AddSomething -d data-source.ts

# Create an empty migration file
yarn run migration:create -- -n ManualChange -d data-source.ts
```

---

## Configuration

### Environment variables
- **Server**: `PORT`, `API_VERSION` (default `v1`), `NODE_ENV`
- **Database**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **Auth**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Email (OTP)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Database config is defined in `data-source.ts`. For non-local hosts, SSL is enabled with `rejectUnauthorized: false`.

---

## API and modules

Global prefix: `v1`. Swagger docs at `/v1/doc-api`.

- `auth/`: wallet + email + OTP authentication, JWT issuance
- `user/`: user-related endpoints
- `college/`: colleges CRUD + seeding support
- `d1c-wallet/`: D1C wallet-related endpoints
- `fee-management/`: fees entities, harvesting services and tasks
- `transaction/`: transactions endpoints and entities
- `stats/`: stats endpoints and entities
- `webhooks/`: inbound webhook handlers

Authentication overview:
- `POST /v1/auth/wallet-signin`: start login; sends OTP email (or logs to console in dev)
- `POST /v1/auth/verify-otp`: verify OTP and receive JWT
- Bearer auth is used for protected routes

Open the guides for details:
- `guides/AUTH_IMPLEMENTATION.md`
- `guides/login_flow.md`
- `guides/login_mostaza.md`

---

## Development

### Linting and formatting
```bash
yarn run lint
yarn run format
```

### PM2 (optional)
```bash
# Build and start with PM2
yarn run pm2:deploy:app

# Manage process
yarn run pm2:restart:app
yarn run pm2:stop:app
yarn run pm2:destroy:app
```

---

## Project structure

```
src/
  auth/               # Auth controller, services, guards, DTOs
  college/            # College entity, service, controller, DTOs
  d1c-wallet/         # D1C wallet endpoints and services
  fee-management/     # Fee entities and harvesting services
  stats/              # Stats entities, service, controller
  transaction/        # Transaction entity, service, controller
  user/               # User entity, service, controller
  webhooks/           # Webhooks service and controller
  database/           # TypeORM migrations
  data/               # Static data (schools, logos)
```

---

## Troubleshooting

- Ensure `.env` is present and DB is reachable
- If using SSL to remote Postgres, variables must be correct; SSL is auto-enabled for non-local hosts
- Use `yarn run db:reset` to recreate schema locally (DROPS ALL DATA)
- OTP emails require SMTP config; otherwise OTPs are logged to the console in development

---

## License

This project is **UNLICENSED** and intended for internal use.
