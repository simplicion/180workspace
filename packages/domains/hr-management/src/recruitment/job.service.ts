import { prisma } from '@workspace/db';
import { EmailService } from '@workspace/backend-infra';

export class JobService {
    static async getJobs(companyId: string) {
        return await prisma.job.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getPublicJob(id: string) {
        const job = await prisma.job.findUnique({
            where: { id },
            include: { company: { select: { id: true, name: true, logoUrl: true } } }
        });
        if (!job || (job as any).status === 'deleted') {
            throw new Error('Job not found');
        }
        return job;
    }

    static async createJob(companyId: string, data: any) {
        return await prisma.job.create({ 
            data: { 
                ...data, 
                companyId 
            }
        });
    }

    static async updateJob(id: string, data: any) {
        return await prisma.job.update({
            where: { id },
            data
        });
    }

    static async deleteJob(id: string) {
        return await prisma.job.update({
            where: { id },
            data: { status: 'deleted' } as any
        });
    }

    // Applications
    static async getApplications(jobId: string) {
        return await prisma.application.findMany({
            where: { jobId },
            include: {
                reviewedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async createApplication(jobId: string, data: any) {
        return await prisma.application.create({ 
            data: { 
                ...data, 
                jobId 
            }
        });
    }

    static async updateApplication(appId: string, companyId: string, data: any) {
        const app = await prisma.application.update({
            where: { id: appId },
            data
        });

        if (data.status === 'hired') {
            let user = await prisma.user.findFirst({ 
                where: { email: app.applicantEmail } 
            });
            
            if (!user) {
                const generatedPassword = app.applicantName.split(' ')[0].toLowerCase() + Math.random().toString(36).slice(-4) + '!';
                user = await prisma.user.create({
                    data: {
                        name: app.applicantName,
                        email: app.applicantEmail,
                        password: generatedPassword,
                        role: 'employee',
                        isActive: true,
                        companyId
                    }
                });

                try {
                    await EmailService.notify(user, 'welcome', { password: generatedPassword }, prisma);
                } catch (emailErr: any) {
                    console.error('[Jobs] Failed to send automated welcome email:', emailErr.message);
                }

                try {
                    await prisma.onboarding.create({
                        data: {
                            employeeId: user.id,
                            status: 'pending',
                        }
                    });
                } catch (err) {
                    console.error('Failed to create onboarding', err);
                }
            }
        }

        return app;
    }
}

