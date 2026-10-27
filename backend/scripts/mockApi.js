// A fake "partner" API used to try workflows and the saga without real services.
// Start it with: npm run mock-api (it listens on http://localhost:5100)
//
// Business endpoints (all logged):
// POST /inventory/reserve -> 200 { reservationId }
// POST /inventory/release -> 200 (undo of reserve) [can be made to fail, see below]
// POST /payment/charge -> 200 { chargeId } or 500 when the payment gateway is "down"
// POST /payment/refund -> 200 (undo of charge)
// POST /notify/email -> 200 { sent: true }
// GET /status/<code> -> answers with that status code (for quick tests)
// Control endpoints (not logged):
// GET /health, GET /log, DELETE /log
// POST /admin/fail-payment/on | off make /payment/charge fail or work
// POST /admin/fail-release/<n> make the next n calls of /inventory/release fail with 503
const http = require('http');
const PORT = Number(process.env.MOCK_API_PORT) || 5100;
const state = { failPayment: false, failReleaseLeft: 0, log: [] };
let counter = 0;
function send(res, status, body) {
 res.writeHead(status, { 'Content-Type': 'application/json' });
 res.end(JSON.stringify(body));
}
const server = http.createServer((req, res) => {
 let raw = '';
 req.on('data', (chunk) => (raw += chunk));
 req.on('end', () => {
 let body = null;
 try {
 body = raw ? JSON.parse(raw) : null;
 } catch {
 body = raw;
 }
 const path = req.url.split('?')[0];
 const route = `${req.method} ${path}`;
 // ----- control endpoints -----
 if (route === 'GET /health') return send(res, 200, { status: 'ok' });
 if (route === 'GET /log') return send(res, 200, state.log);
 if (route === 'DELETE /log') {
 state.log = [];
 return send(res, 200, { cleared: true });
 }
 if (route === 'POST /admin/fail-payment/on') {
 state.failPayment = true;
 return send(res, 200, { failPayment: true });
 }
 if (route === 'POST /admin/fail-payment/off') {
 state.failPayment = false;
 return send(res, 200, { failPayment: false });
 }
 const failRelease = path.match(/^\/admin\/fail-release\/(\d+)$/);
 if (req.method === 'POST' && failRelease) {
 state.failReleaseLeft = Number(failRelease[1]);
 return send(res, 200, { failReleaseLeft: state.failReleaseLeft });
 }
 // ----- business endpoints -----
 const statusRoute = path.match(/^\/status\/(\d{3})$/);
 if (req.method === 'GET' && statusRoute) {
 return send(res, Number(statusRoute[1]), { status: Number(statusRoute[1]) });
 }
 state.log.push({ time: new Date().toISOString(), route, body });
 switch (route) {
 case 'POST /inventory/reserve':
 counter += 1;
 return send(res, 200, { reservationId: `res-${counter}` });
 case 'POST /inventory/release':
 if (state.failReleaseLeft > 0) {state.failReleaseLeft -= 1;
 return send(res, 503, { error: 'Inventory service is busy, try again' });
 }
 return send(res, 200, { released: true });
 case 'POST /payment/charge':
 if (state.failPayment) return send(res, 500, { error: 'Payment gateway is down' });
 counter += 1;
 return send(res, 200, { chargeId: `chg-${counter}` });
 case 'POST /payment/refund':
 return send(res, 200, { refunded: true });
 case 'POST /notify/email':
 return send(res, 200, { sent: true });
 default:
 return send(res, 404, { error: 'Unknown route' });
 }
 });
});
if (require.main === module) {
 server.listen(PORT, () => console.log(`Mock partner API running on http://localhost:${PORT}`));
}
module.exports = { server, state };
