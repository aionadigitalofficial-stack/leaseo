# Deploying this update to leaseo.in (Hostinger KVM 2)

Full explanation in chat, this is the copy-paste version. Run on your VPS.

## 1. Back up first — don't skip this
```bash
cd /var/www/leaseo
pg_dump -U leaseo -h localhost leaseo > ~/leaseo_backup_$(date +%Y%m%d_%H%M%S).sql
tar -czf ~/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
cp -r /var/www/leaseo ~/leaseo_code_backup_$(date +%Y%m%d_%H%M%S)
```

## 2. Upload the new code
Extract this zip locally, then upload everything EXCEPT `.env` and `uploads/`
(you don't want to overwrite your live secrets or live uploaded photos):

```bash
rsync -av --exclude='.env' --exclude='uploads/' --exclude='node_modules/' \
  ./leaseo-main/ user@your-vps-ip:/var/www/leaseo/
```

(Or scp/FTP the same way if you don't have rsync — just don't copy over
`.env` or `uploads/`.)

## 3. On the VPS
```bash
cd /var/www/leaseo
npm install
npm run db:push
```
Read the plan `db:push` shows you before confirming. It should only contain
`CREATE TABLE`, `ADD COLUMN`, and `ADD VALUE` statements (see
CHANGELOG_2026-07.md for the full list) — nothing should say "drop" or
"rename". If something unexpected shows up, stop and don't confirm.

```bash
cp vite.config.production.ts vite.config.ts
npm run build
pm2 restart leaseo
pm2 logs leaseo --lines 50
```

## 4. Test before you walk away
- Log in as admin — confirm your existing listings/users/enquiries are all
  still there
- Post a test listing as a normal (non-admin) account → it should appear on
  the public site immediately
- Delete that test listing → it should vanish from the public site but still
  show up in Admin → Properties → Deleted, with a Restore button
- Check Admin → Reports and Admin → Flagged Accounts load (new sections)
- Confirm `/uploads/...` still serves your existing property photos

## 5. Change the default admin password
`DEPLOYMENT.md` documents `admin@leaseo.in` / `Admin@123` in plain text.
Log in and change it now that the site is live.

## If something goes wrong
```bash
psql -U leaseo -d leaseo < ~/leaseo_backup_<timestamp>.sql
rm -rf /var/www/leaseo && mv ~/leaseo_code_backup_<timestamp> /var/www/leaseo
pm2 restart leaseo
```
