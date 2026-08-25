import { prisma, requestContext } from '@workspace/db';
import { EmailService } from '@workspace/backend-infra';

export class JobService {
    static async getJobs() {
        return await prisma.job.findMany({
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

    static async createJob(data: any) {
        return await prisma.job.create({ 
            data
        });
    }

    static async updateJob(id: string, data: any) {
        const existing = await prisma.job.findFirst({ where: { id } });
        if (!existing) throw new Error('Job not found');

        return await prisma.job.update({
            where: { id },
            data
        });
    }

    static async deleteJob(id: string) {
        const existing = await prisma.job.findFirst({ where: { id } });
        if (!existing) throw new Error('Job not found');

        return await prisma.job.update({
            where: { id },
            data: { status: 'deleted' } as any
        });
    }

    // Applications
    static async getApplications(jobId: string) {
        const job = await prisma.job.findFirst({ where: { id: jobId } });
        if (!job) throw new Error('Job not found');

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

    static async updateApplication(appId: string, data: any) {
        const existing = await prisma.application.findUnique({
            where: { id: appId }
        });
        if (!existing) {
            throw new Error('Application not found');
        }
        const job = await prisma.job.findFirst({ where: { id: existing.jobId } });
        if (!job) {
            throw new Error('Application not found');
        }

        const app = await prisma.application.update({
            where: { id: appId },
            data
        });

        if (data.status === 'hired') {
            let user = await prisma.user.findFirst({ 
                where: { email: app.applicantEmail } 
            });
            
            if (!user) {
                const companyId = requestContext.getStore()?.companyId as string;
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

