# Layout

```
backend/
├── src/
│   ├── main.ts                     bootstrap (top-level await)
│   ├── app.module.ts               root module, global guards, RequestIdMiddleware on '*'
│   ├── app.controller.ts / app.service.ts   GET / → API info + links (@Public)
│   ├── auth/
│   │   ├── auth.module.ts          JwtModule.registerAsync (exports JwtModule)
│   │   ├── auth.controller.ts      /auth/login, /auth/me, /auth/password
│   │   ├── auth.service.ts         login, changePassword
│   │   ├── auth.guard.ts           JWT verify + DB user check (global)
│   │   ├── roles.guard.ts          @Roles check (global)
│   │   ├── auth.types.ts           RoleName, JwtPayload, AuthUser, AuthRequest
│   │   ├── decorators/             @Public, @Roles, @CurrentUser
│   │   └── dto/                    LoginDto, LoginResponseDto, ChangePasswordDto
│   ├── common/
│   │   ├── bigint-json.ts          BigInt.prototype.toJSON → string
│   │   ├── swagger.ts              isSwaggerEnabled() (shared by main.ts and GET /)
│   │   ├── filters/global-exception.filter.ts
│   │   ├── logger/logger.module.ts
│   │   ├── middleware/request-id.middleware.ts
│   │   ├── pipes/parse-bigint.pipe.ts
│   │   └── validators/bigint-id.ts   @BigIntId() + toBigInt() for BigInt id fields in DTOs
│   ├── health/                     /health (app + DB) and /ready (app only), terminus
│   ├── metrics/                    MetricsModule + public MetricsController (/metrics)
│   ├── tickets/                    TicketsModule: /tickets, categories/ (/ticket-categories), severities/ (/ticket-severities)
│   ├── prisma/prisma.module.ts     @Global, provides + exports PrismaService
│   ├── prisma/prisma.service.ts    PrismaClient with PrismaPg adapter, schema ctd_config
│   ├── users/                      CRUD (controller/service/dto); entities/user.entity.ts = Swagger response shape
│   └── generated/prisma/           generated client (gitignored)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/20261005131605_init/migration.sql  (+ migration_lock.toml, postgresql)
│   ├── seed.ts                     reference-data seeder (+ runs ticket import)
│   └── seed-data/                  *.json reference data + ticket_logs.csv
├── scripts/
│   ├── export-seed.ts              one-off: old DB → seed-data/*.json
│   ├── import-tickets.ts           CSV → ticket_logs
│   └── import-tickets-report.txt   output of the last import run
├── test/app.e2e-spec.ts
├── prisma7.config.ts               Prisma config (CLI loads it: "Loaded Prisma config from prisma7.config.ts")
├── nest-cli.json                  includes the @nestjs/swagger build plugin
├── vitest.config.ts / vitest.config.e2e.ts
├── .env.example, .oxlintrc.json, .prettierrc, tsconfig*.json
├── README.md                       stock Nest boilerplate (outdated script names)
├── README!.md                      original placeholder plan (Indonesian)
├── .claude/CLAUDE.md + docs/*.md   these project notes (CLAUDE.md is the index, imports docs/)
└── .agents/ .claude/skills/ .windsurf/   vendored Prisma skills (skills-lock.json, source: github prisma/skills)
```
