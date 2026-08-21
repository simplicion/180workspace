import { z } from 'zod';

export const AuthValidation = {
    sendOtpEmail: z.object({
        email: z.string().email(),
        otpCode: z.string().min(4)
    }),
    sendOtp: z.object({
        email: z.string().email()
    }),
    verifyOtp: z.object({
        email: z.string().email(),
        otp: z.string().min(4)
    }),
    registerTenant: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        companyName: z.string()
    }).passthrough(),
    registerUser: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().optional(),
        lastName: z.string().optional()
    }).passthrough(),
    login: z.object({
        email: z.string().email(),
        password: z.string()
    }).passthrough(),
    forgotPassword: z.object({
        email: z.string().email()
    }),
    changePassword: z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(6)
    }).passthrough()
};
