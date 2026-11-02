Before: npm run seed (copy the keys), npm run dev (backend), npm run mock-api, npm run dev (frontend),
node scripts/loadSamples.js company-a <key>. Open http://localhost:5173 and load "Order saga".
1. A workflow runs (1 min)
 - Click Run workflow. The steps appear one by one, the nodes turn green, the status ends completed.
 - Say: "The engine is a state machine. It saves its progress after every step."
2. The saga rolls back (2 min)
 - PowerShell: Invoke-RestMethod -Method Post http://localhost:5100/admin/fail-payment/on
 - Run again. Charge payment turns red. Reserve inventory turns orange: it was undone, newest first.
 - Open http://localhost:5100/log in the browser: the release call is there.
 - Say: "If a step fails, we undo what already happened. That is the Saga pattern."
 - Optional: fail-release/2 shows the undo being retried with growing waits (attempts: 3).
3. Events start workflows (2 min)
 - Switch the payment back on (fail-payment/off). Click Activate.
 - Send the order.created event from the panel. After a few seconds a new run marked (event) appears.
 - Say: "MongoDB tells our server about the new event through a Change Stream. No polling."
 - Send an event as another tenant: nothing starts. "Tenants stay isolated."
4. Safety (1 min)
 - Conditions are parsed by our own parser, never with eval.
 - Two servers on one database still start only one run per event (atomic claim).
Next: Week 3 adds sandboxed scripts, WebSocket live tracing and dead-letter queues.