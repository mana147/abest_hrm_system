# Workspace Instructions for ABest HRM System

## Primary references
- Read `AGENTS.md` first for business domain rules, scheduling concepts, and forbidden actions.
- Read `CLAUDE.md` for project architecture, module patterns, conventions, and run commands.
- Use `PROJECT_STRUCTURE.md` for folder layout, route mapping, and common file roles.

## What this repo is
- A training center operations app for an English language center, not a generic HR system.
- Built with Node.js + Express + EJS + Bootstrap.
- Uses MySQL with raw SQL only; **no ORM** like Sequelize or Prisma.
- Auth is session-based via `express-session` and `express-mysql-session`.

## Important guardrails
- Do not hard-delete records. Use soft delete via `status = 'inactive'` whenever the schema supports it.
- Do not modify `.env` in source control.
- Do not add dependencies without a clear project need.
- Do not alter `public/css/custom.css` design tokens unless a style change is explicitly requested and follows `DESIGN/DESIGN_Airbnb.md`.
- Do not change `database/mysql_schema.sql` without recognizing it is the canonical schema source and that database migrations are not handled automatically.

## Repo conventions
- Routes use English kebab-case, e.g. `/schedule-lines`, `/class-sessions`.
- Models are raw SQL wrappers in `src/models/*.js`.
- Controllers hold validation/business flow and render views.
- Views are EJS templates and should keep logic minimal.
- Middleware is used for auth, i18n, and role guards.
- Translations must be added to both `locales/vi.json` and `locales/en.json`.

## Key domain rules for AI assistance
- The scheduling core is `schedule_line` = `classroom + timeslot`.
- Classes should never conflict on the same `schedule_line` while active.
- `expected_end_date`, `resource_release_date`, and `next_opening_available_date` are computed scheduling fields.
- Master data is stable (`courses`, `timeslots`, `class_templates`, `classrooms`, `schedule_lines`).
- Transaction data is runtime-driven (`classes`, `class_sessions`, `enrollments`, `attendance`, `invoices`, `teacher_payroll`).

## Run commands
- `npm install`
- `npm run dev` → start dev server with `nodemon src/app.js`
- `npm start` → run production server
- `npm run db:init` → initialize MySQL schema + seed data
- `npm run db:sync` → schema sync script

## Best way to add a new module
1. Add a model in `src/models/` with raw SQL methods.
2. Add a controller in `src/controllers/`.
3. Add a route file in `src/routes/`.
4. Register the route in `src/routes/index.js`.
5. Add views in `src/views/<module>/`.
6. Update sidebar/menu in `src/views/layout/main.ejs`.
7. Add translation keys in both locale files.
8. If DB changes are required, update `database/mysql_schema.sql` and use `scripts/db-init.js`.

## When to use this instruction file
- Use for high-level repo-wide guidance, conventions, and guardrails.
- Do not duplicate full business logic from `AGENTS.md`; link to it instead.
- Prefer targeted file-level instructions or prompts when the task is specific to one area of the code.

## Notes for AI agents
- The best source of domain truth is `AGENTS.md`.
- The best source of implementation conventions is `CLAUDE.md`.
- If a request involves database modeling, prefer raw SQL and avoid creating or using an ORM.
- If a UI change is requested, keep page logic in controllers and use EJS for rendering.
