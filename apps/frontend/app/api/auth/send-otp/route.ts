

import { NextResponse } from "next/server";
import { prisma } from "@workspace/db";
import nodemailer from "nodemailer";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiry in 10 minutes
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

        // Upsert user to store OTP (or use a dedicated OTP table)
        // Since we added otpCode to User model, we'll upsert there.
        // But what if it's a completely new user? We'll create a stub user.
        // Let's check if user exists.
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user) {
            // Check if user is fully registered (has completed onboarding and set a username)
            if (user.username) {
                return NextResponse.json({ 
                    success: false, 
                    message: "Please sign in, you are already registered in our platform.",
                    code: "USER_EXISTS" 
                }, { status: 400 });
            }

            await prisma.user.update({
                where: { email },
                data: { otpCode, otpExpiry },
            });
        } else {
            // Create a stub user
            await prisma.user.create({
                data: {
                    name: "New User",
                    email,
                    otpCode,
                    otpExpiry,
                },
            });
        }

        // Setup Nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"PitchIn Auth" <noreply@pitchin.com>',
            to: email,
            subject: "Your PitchIn Verification Code",
            html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to PitchIn!</h2>
                    <p>Your verification code is: <strong>${otpCode}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                   </div>`,
        };

        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`[Development Mode] OTP for ${email} is ${otpCode}`);
        }

        return NextResponse.json({ success: true, message: "OTP sent successfully" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export const runtime = 'edge';
