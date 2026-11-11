
// Decides which failed API calls are worth trying again,
// and repeats them with growing waits.

// Settings:
// retryAttempts: Extra tries after the first one (0 to 5, default 0)
// retryBackoffMs: First wait in milliseconds (50 to 10000, default 500)
// retryOn: "transient" (default) or "server-errors"

// Transient HTTP statuses
const TRANSIENT_STATUSES = [408, 425, 429, 502, 503, 504];

// Keeps values within the allowed range
function clamp(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;

    return Math.min(Math.max(value, min), max);
}

// Reads and validates retry configuration
function readRetryPolicy(config = {}) {
    return {
        retries: clamp(
            parseInt(config.retryAttempts, 10),
            0,
            5,
            0
        ),

        backoffMs: clamp(
            parseInt(config.retryBackoffMs, 10),
            50,
            10000,
            500
        ),

        retryOn:
            config.retryOn === 'server-errors'
                ? 'server-errors'
                : 'transient',
    };
}

// Checks whether an HTTP status is retryable
function isRetryableStatus(status, retryOn) {
    if (TRANSIENT_STATUSES.includes(status)) {
        return true;
    }

    return (
        retryOn === 'server-errors' &&
        status >= 500 &&
        status <= 599
    );
}

// Identifies errors caused by invalid configuration
const PERMANENT_MESSAGE =
    /Invalid URL|Only http and https|private addresses/;

// Checks whether an error is permanent
function isPermanentError(err) {
    return (
        err.permanent === true ||
        PERMANENT_MESSAGE.test(err.message || '')
    );
}

// Calls the API and retries when a transient failure occurs.
// Returns { res, attempts } on success or a non-retryable response.
// Throws the last error with err.attempts if all retries fail.

async function callWithPolicy({
    callApi,
    sleep,
    request,
    policy
}) {
    const totalTries = policy.retries + 1;

    for (let attempt = 1; attempt <= totalTries; attempt += 1) {

        try {
            const res = await callApi(request);

            if (
                !isRetryableStatus(res.status, policy.retryOn) ||
                attempt === totalTries
            ) {
                return {
                    res,
                    attempts: attempt
                };
            }

        } catch (err) {

            if (
                isPermanentError(err) ||
                attempt === totalTries
            ) {
                err.attempts = attempt;
                throw err;
            }
        }

        // Exponential backoff
        await sleep(
            policy.backoffMs * 2 ** (attempt - 1)
        );
    }

    throw new Error('Retry loop ended unexpectedly');
}

// Export functions
module.exports = {
    readRetryPolicy,
    isRetryableStatus,
    isPermanentError,
    callWithPolicy,
    TRANSIENT_STATUSES
};
