// Runs a task again when it fails, waiting longer each time (exponential backoff).
// attempts = 3 and baseMs = 500 gives: try, wait 500 ms, try, wait 1000 ms, try.
async function withRetry(task, { attempts = 3, baseMs = 500, sleep } ) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await task(attempt);
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await sleep(baseMs * 2 ** (attempt - 1));
            }
        }
    }
    throw lastError;
}

module.exports = { withRetry };