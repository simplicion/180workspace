'use strict';

// Sentry removed, providing no-op handlers
const Sentry = {
    captureException: (error, context) => console.error(error, context),
    Handlers: {
        requestHandler: () => (req, res, next) => next(),
        errorHandler: () => (err, req, res, next) => next(err),
    }
};

module.exports = Sentry;
