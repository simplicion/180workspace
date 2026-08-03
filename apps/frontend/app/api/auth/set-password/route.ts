import { NextResponse } from "next/server";
import { prisma } from "@workspace/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ success: false, message: "Email and password are required" }, { status: 400 });
        }

        // Validate password strength backend-side
        if (password.length < 8) {
            return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        // Optional: Ensure email is verified before allowing password set if required

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
            },
        });

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Error setting password:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

