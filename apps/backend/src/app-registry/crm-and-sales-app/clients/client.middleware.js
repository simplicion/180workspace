'use strict';

/**
 * Client Middleware
 * Validations and pre-checks for client routes.
 */

exports.validateClientCreate = (req, res, next) => {
    const { name, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Client name is required.' });
    if (!email) return res.status(400).json({ error: 'Client email is required.' });
    next();
};

