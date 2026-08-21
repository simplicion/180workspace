export class ApiError extends Error {
    public statusCode: number;
    public errors: any[];

    constructor(statusCode: number, message: string, errors: any[] = []) {
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
