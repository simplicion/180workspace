'use strict';

exports.validateContractCreate = (req, res, next) => {
    // Basic validations
    if (!req.body.template && !req.body.title) {
        // Just an example structure
    }
    next();
};

