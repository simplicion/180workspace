import { NextResponse } from "next/server";
import { prisma } from "@workspace/db";

export async function POST(req: Request) {
    try {
        const { 
            email, 
            role, 
            name,
            username, 
            headline, 
            city, 
            country, 
            socialLinks, 
            bio, 
            interests 
        } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
        }

        // Check if username is already taken by someone else
        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: { 
                    username, 
                    email: { not: email } 
                }
            });
            if (existingUser) {
                return NextResponse.json({ success: false, message: "Username is already taken" }, { status: 400 });
            }
        }

        const user = await prisma.user.update({
            where: { email },
            data: {
                ...(name && { name }),
                ...(role && { role }),
                ...(username && { username }),
                ...(headline && { headline }),
                ...(city && { city }),
                ...(country && { country }),
                ...(socialLinks && { socialLinks }),
                ...(bio && { bio }),
                ...(interests && { interests }),
                isFirstLogin: false // Marking as completed onboarding
            },
        });

        return NextResponse.json({ success: true, message: "Onboarding completed successfully", user });

    } catch (error) {
        console.error("Error during onboarding:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

