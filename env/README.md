# Environment Profiles

- `.env.staging.local`: Variables used when refreshing the staging/demo database.
- `.env.production.local`: Variables used when refreshing the production database.

When you trigger the “刷新演示数据” action in the finance dashboard, the selected profile will be read and injected temporarily before running `seed-full-demo.ts`.

Each file should contain plain `KEY=value` lines. Example:

```
MONGO_URI=mongodb://127.0.0.1:27017/coinpusher_staging
DB_NAME=coinpusher_staging
```

> Keep these files in a secure location and do not commit real credentials.
