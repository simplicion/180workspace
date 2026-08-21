const { prisma } = require('@workspace/db');
require('dotenv').config();

const docs = [
    {
        title: 'Platform Overview',
        category: 'Getting Started',
        slug: 'platform-overview',
        content: `# Welcome to the Enterprise 180workspace Platform

The 180workspace (Integrated Management System) is your central hub for project tracking, workforce management, and sales automation. This platform is designed to streamline operations and provide real-time insights into your business health.

## Why use the Dashboard?
The Dashboard provides a 360-degree view of your organization. It aggregates critical data from all modules, allowing you to:
- Monitor active projects and deadlines.
- Track team attendance and availability.
- View sales forecasts and revenue trends.
- Access quick actions for common tasks.

## How to use:
1. **Modules Sidebar**: Navigate between core features like CRM, Projects, and HR using the left navigation.
2. **Global Search**: Quickly find documents, clients, or tasks using the search bar at the top.
3. **Notifications**: Stay updated on task assignments and approval requests via the bell icon.

## Benefits:
- **Centralization**: No more switching between multiple tools.
- **Data-Driven**: Make informed decisions based on real-time analytics.
- **Efficiency**: Automate repetitive workflows and reduce manual overhead.`,
        published: true
    },
    {
        title: 'Project Management',
        category: 'Projects',
        slug: 'project-management',
        content: `# Project Management Suite

Efficiently manage your organization's projects from conception to completion. This module allows you to organize work, manage budgets, and track progress effectively.

## When to use:
Use this module whenever you start a new initiativeâ€”whether it's a client engagement, internal development, or an administrative project.

## Core Features:
- **Project Progress**: Real-time percentage tracking based on completed tasks.
- **Budget Tracking**: Monitor your project spending against a set budget to prevent overruns.
- **Team Collaboration**: Assign multiple members to a project and define clear ownership.
- **Milestones**: Break down large projects into manageable phases with clear deadlines.

## How to use:
1. **Create Project**: Use the "New Project" button to define the project scope, budget, and owner.
2. **Assign Team**: Add members who will be working on the project tasks.
3. **Set Deadlines**: Ensure your project has a clear start and end date for tracking.

## Benefits:
- **Accountability**: Clearly define who is responsible for different project aspects.
- **Financial Control**: Keep a close eye on budget utilization.
- **Visibility**: Stakeholders can monitor project health at a glance.`,
        published: true
    },
    {
        title: 'Task & Work Tracking',
        category: 'Projects',
        slug: 'task-work-tracking',
        content: `# Task Tracking & Assignments

Tasks are the building blocks of your projects. This module ensures that every piece of work is identified, assigned, and tracked through its lifecycle.

## Why use Task Tracking?
- To prevent work from falling through the cracks.
- To understand individual workload and bandwidth.
- To measure productivity and identify bottlenecks.

## Task Lifecycle:
1. **Not Started**: Task is defined but work hasn't begun.
2. **In Progress**: Work is currently active.
3. **Review**: Work is complete and awaiting approval.
4. **Completed**: Task is officially closed.

## Actionable Tips:
- **Prioritize**: Use the High/Critical priority flags for urgent items.
- **Sub-tasks**: Break complex tasks into smaller, actionable sub-tasks.
- **Time Tracking**: Use the built-in timer to record hours spent on each task.

## Use Case:
If a developer needs to build a new feature, a Task is created within the relevant Project, assigned to them, and moved through statuses as progress is made.`,
        published: true
    },
    {
        title: 'CRM & Lead Management',
        category: 'CRM',
        slug: 'crm-leads',
        content: `# CRM: Lead Management

Transform your sales process by centralizing your potential customer data. The Lead module is for tracking initial interests and early-stage prospects.

## What is a Lead?
A Lead is any individual or organization that has shown interest in your services but has not yet been qualified as a solid business opportunity.

## Key Features:
- **Lead Scoring**: Prioritize prospects based on their engagement level.
- **Source Tracking**: Identify which marketing channels are bringing in the most business.
- **Interaction History**: Keep a log of every call, email, and meeting.

## How to use:
1. **Capture**: Input lead details manually or via API integrations.
2. **Engage**: Use the "Activity" log to record your outreach.
3. **Convert**: Once a lead shows serious intent, "Convert" them into an Account and Contact.

## Benefits:
- **Reduced Lost Opportunities**: Ensure no prospect is ignored.
- **Sales Intelligence**: Understand why leads convert or drop off.`,
        published: true
    },
    {
        title: 'HR & Attendance',
        category: 'HR',
        slug: 'hr-attendance',
        content: `# HR: Attendance & Punctuality

Maintain a disciplined and transparent workforce with integrated attendance tracking. 

## Importance:
Attendance data is critical for payroll accuracy, performance reviews, and operational planning.

## How it works:
- **Check-in/Out**: Employees check-in daily to record their start and end times.
- **Shift Status**: The system automatically labels attendance as "On Time", "Late", or "Half Day" based on your company's shift windows.
- **Work Hours**: Automatically calculates daily and monthly hours for payroll processing.

## Management View:
Admins can view a heatmap of organizational attendance to identify patterns of absenteeism or consistent over-performance.

## Use Case:
At the end of the month, the Finance module pulls this data to generate accurate Salary slips based on the "Present" and "On Leave" markers.`,
        published: true
    },
    {
        title: 'Leave & Absence Management',
        category: 'HR',
        slug: 'leave-management',
        content: `# Leave Management System

A simplified workflow for requesting and approving time off.

## Types of Leave:
- **Sick Leave**: For health-related absences.
- **Casual Leave**: For personal reasons or short-term time off.
- **Annual Leave**: Earned vacation days.
- **Emergency Leave**: For unforeseen critical situations.

## Workflow:
1. **Request**: Employee submits a leave request with dates and reason.
2. **Notification**: The manager receives an instant alert for approval.
3. **Approval**: Manager reviews the request against the team's calendar and approves or rejects.
4. **Sync**: Approved leave automatically updates the Attendance record for those dates.

## Benefits:
- **No Manual Tracking**: Say goodbye to paper forms and messy email chains.
- **Resource Planning**: Managers can see who is away before assigning new tasks.`,
        published: true
    },
    {
        title: 'Finance & Invoicing',
        category: 'Finance',
        slug: 'finance-invoices',
        content: `# Finance: Invoicing & Revenue

Manage your company's revenue stream with a professional invoicing system.

## Core Capabilities:
- **Professional Templates**: Generate branded PDFs for your clients.
- **Status Tracking**: Monitor which invoices are "Draft", "Sent", "Paid", or "Overdue".
- **Dynamic Items**: Add services, products, and custom taxes with automatic calculation.
- **Partial Payments**: Record multiple installments against a single invoice.

## Why use this module?
Using the integrated Finance module ensures that your billing is directly linked to your Projects and CRM data, reducing data entry errors.

## How to use:
1. **Generate**: Select a Client and add line items.
2. **Send**: Email the invoice directly from the platform.
3. **Record Payment**: Update the status once funds are received to keep your reports accurate.`,
        published: true
    },
    {
        title: 'Expense Tracking',
        category: 'Finance',
        slug: 'expense-management',
        content: `# Expense Monitoring

Keep your organization's spending in check with categorized expense logging.

## Categories:
- **Travel**: Commuting, flights, and accommodation.
- **Office Supplies**: Stationery, furniture, and hardware.
- **Subscriptions**: Software licenses and recurring services.
- **Utilities**: Electricity, water, and internet.

## Management Flow:
1. **Record**: Employees or admins log expenses with receipts.
2. **Categorize**: Assign to specific departments or projects for cost-center analysis.
3. **Report**: At the end of the month, generate spending reports to identify saving opportunities.

## Benefit:
Complete visibility into where the organization's money is going, helping in budget planning and tax preparation.`,
        published: true
    },
    {
        title: 'AI Insights & Tools',
        category: 'Security',
        slug: 'ai-insights-tools',
        content: `# Integrated AI Features

Our platform leverages advanced AI to provide predictive insights and content automation.

## Available Features:
- **Sales Forecasting**: AI analyzes your CRM pipeline to predict future revenue.
- **Content Generation**: Use AI to draft project descriptions or email outreach.
- **Insights**: Get automated summaries of long project discussion threads or meeting logs.
- **Smart Suggestions**: AI suggests the best person for a task based on previous completion patterns.

## Data Security:
All AI-processed data is handled within your company's isolated environment. Your data is NEVER used to train public models.

## How to use:
Look for the **Sparkle (âœ¨)** icon across the platform to activate AI-powered features in relevant contexts.`,
        published: true
    }
];

async function seedDocs() {
    try {
        console.log('Using PostgreSQL database via Prisma...');

        // Find an admin user to associate these docs with
        let admin = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: process.env.ADMIN_EMAIL },
                    { role: 'admin' },
                    { role: 'superadmin' }
                ]
            }
        });
        if (!admin) {
            admin = await prisma.user.findFirst();
        }

        for (const doc of docs) {
            const existing = await prisma.documentPage.findFirst({
                where: { slug: doc.slug }
            });
            if (existing) {
                await prisma.documentPage.update({
                    where: { id: existing.id },
                    data: {
                        title: doc.title,
                        category: doc.category,
                        content: doc.content,
                        published: doc.published,
                        updatedById: admin ? admin.id : null
                    }
                });
                console.log(`Updated: ${doc.title}`);
            } else {
                await prisma.documentPage.create({
                    data: {
                        title: doc.title,
                        category: doc.category,
                        slug: doc.slug,
                        content: doc.content,
                        published: doc.published,
                        createdById: admin ? admin.id : null
                    }
                });
                console.log(`Created: ${doc.title}`);
            }
        }

        console.log('Documentation seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedDocs();
