import { NextResponse } from "next/server";
import { prisma } from "@workspace/db";

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ success: false, message: "Email and OTP are required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        if (user.otpCode !== otp) {
            return NextResponse.json({ success: false, message: "Invalid OTP" }, { status: 400 });
        }

        if (user.otpExpiry && new Date() > user.otpExpiry) {
            return NextResponse.json({ success: false, message: "OTP has expired" }, { status: 400 });
        }

        // OTP verified successfully. Clear OTP fields and mark email verified.
        await prisma.user.update({
            where: { email },
            data: {
                otpCode: null,
                otpExpiry: null,
                emailVerified: new Date(),
            },
        });

        return NextResponse.json({ success: true, message: "OTP verified successfully" });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
