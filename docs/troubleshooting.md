# Troubleshooting

## npm: Could not read package.json
**Reason:** Command was run in the project root. `package.json` is inside `backend` or `frontend`.
**Fix:** `cd backend` (or `cd frontend`) and run the command again.

## MongoDB: querySrv ECONNREFUSED
**Reason:** The network or DNS blocks the `mongodb+srv://` lookup.
**Fix (try in order):**
1. Connect the laptop to a mobile hotspot, then type `rs` in the nodemon terminal
2. Change the DNS to 8.8.8.8 and 8.8.4.4
3. Add `dns.setServers(['8.8.8.8', '8.8.4.4'])` to `server.js` locally. Do not commit this change.

## GitHub shows "X commits behind main"
Not an error. Run `git fetch origin` and `git merge origin/develop`.

## git checkout fails: local changes would be overwritten
Run `git stash`, switch branches, then run `git stash pop`.

## Server runs but browser shows nothing
Open `http://localhost:5000/health`. Make sure `npm run dev` is still running in a terminal.