import { NextResponse } from "next/server";
import { prisma } from "@workspace/db";

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

        // Delegate email sending to the Node.js backend to bypass Edge runtime limitations with nodemailer
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        
        try {
            const res = await fetch(`${apiUrl}/auth/send-otp-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, otpCode }),
            });

            if (!res.ok) {
                const errData = await res.text();
                console.error("Error from Backend Email API:", errData);
            }
        } catch (fetchError) {
            console.error("Failed to call backend email service:", fetchError);
        }

        return NextResponse.json({ success: true, message: "OTP sent successfully" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export const runtime = 'edge';
