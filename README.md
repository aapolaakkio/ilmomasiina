# Ilmomasiina

Ilmomasiina is an event registration system with payment support, built with Next.js. Originally created by Athene
in 2016, forked by Tietokilta in 2021, and rewritten as a single Next.js application.

## Tech stack

- **Framework:** Next.js 16 (App Router, server actions)
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Auth.js (NextAuth v5) with Google OAuth
- **Payments:** Stripe Checkout
- **Styling:** Tailwind CSS v4
- **i18n:** next-intl (Finnish, English, Swedish)
- **Validation:** Zod v4 + next-safe-action
- **Email:** React Email + Nodemailer

## Getting started

### Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL 16+

### Development setup

1. Clone the repository and install dependencies:

```sh
git clone https://github.com/aapolaakkio/ilmomasiina.git
cd ilmomasiina
pnpm install
```

2. Copy the example environment file and configure it:

```sh
cp .env.example .env
```

Edit `.env` with your database URL, auth secrets, and other settings. See the comments in `.env.example` for details.

3. Run database migrations:

```sh
npx tsx src/db/migrate.ts
```

4. Start the development server:

```sh
pnpm dev
```

The app will be available at http://localhost:3000.

### Docker

Build and run with Docker:

```sh
docker build -t ilmomasiina .
docker run -p 3000:3000 --env-file .env ilmomasiina
```

Or use the provided `docker-compose.yml` to pull the pre-built image from GHCR:

```sh
docker compose up
```

## Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `pnpm dev`          | Start development server     |
| `pnpm build`        | Build for production         |
| `pnpm start`        | Start production server      |
| `pnpm typecheck`    | Run TypeScript type checking |
| `pnpm lint`         | Lint with Oxlint             |
| `pnpm format`       | Format with Oxfmt            |
| `pnpm format:check` | Check formatting             |

## Documentation

See the [docs](docs/README.md) folder for detailed documentation:

- [Installation](docs/installation.md) and customization
- [Project structure](docs/project-structure.md)
- [Data model](docs/data-model.md)
- [Signup logic](docs/signup-logic.md)
- [Payment flow](docs/payments.md)
- [Migration](docs/migration.md) from older versions

## License

MIT
