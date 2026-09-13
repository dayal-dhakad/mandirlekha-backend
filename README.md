# Backend

## Local setup

1. Copy `.env.example` to `.env` and fill in the values.
2. Run `npm install`.
3. Run `npm run seed` once to create the single owner.
4. Run `npm run dev`.

Production uses `npm run build` followed by `npm start`. Set `FRONTEND_URL` to the deployed frontend origin. Export files are stored under `EXPORT_DIR`; use a persistent disk in production.

