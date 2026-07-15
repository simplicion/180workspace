'use strict';

class ApiError extends Error {
    constructor(statusCode, message, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors; // Array of specific error details (useful for Zod validation errors)
        
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ApiError;
