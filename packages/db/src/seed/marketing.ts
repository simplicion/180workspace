import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const marketingPages = [
  {
    slug: 'crm-and-sales-software',
    title: 'CRM & Sales',
    pageType: 'APP_FEATURE',
    seoTitle: 'CRM for Digital Agencies & Sales Management | 180workspace',
    seoDescription: 'The ultimate CRM for digital marketing agencies. Automate contract building and manage sales pipelines effortlessly.',
    keywords: ['CRM for digital agencies', 'Sales management system for freelancers', 'Automated contract builder software'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How can freelancers manage sales pipelines?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "180workspace provides a visual sales pipeline and automated follow-ups tailored for freelancers."
          }
        },
        {
          "@type": "Question",
          "name": "What is the best CRM for digital marketing agencies?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "180workspace is built specifically for digital agencies to track leads, proposals, and contracts in one place."
          }
        }
      ]
    },
    heroHeadline: 'Close More Deals with the Ultimate Agency CRM',
    heroSubtext: 'Manage leads, send proposals, and track your entire sales pipeline without leaving your workspace.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'hr-management-system',
    title: 'HR Management',
    pageType: 'APP_FEATURE',
    seoTitle: 'HR Management System for Digital Teams | 180workspace',
    seoDescription: 'Scale your agency with our HR software for small agencies. Manage freelancers, employees, and performance reviews seamlessly.',
    keywords: ['HR software for small agencies', 'Freelance team management tool', 'Employee review system for digital teams'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace HR Management",
      "applicationCategory": "BusinessApplication"
    },
    heroHeadline: 'HR Built for Modern Digital Agencies',
    heroSubtext: 'Stop juggling spreadsheets. Manage contractors, full-time employees, and onboarding in one unified system.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'project-management-tool',
    title: 'Projects & Tasks',
    pageType: 'APP_FEATURE',
    seoTitle: 'Task & Project Management Software for Agencies | 180workspace',
    seoDescription: 'Track agency projects and client deliverables. The perfect task management software for freelancers and teams.',
    keywords: ['Task management software for freelancers', 'Agency project tracking software', 'Client portal project management'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Project Management",
      "applicationCategory": "BusinessApplication"
    },
    heroHeadline: 'Deliver Projects on Time, Every Time',
    heroSubtext: 'Powerful task tracking, Kanban boards, and client portals that rival Asana and ClickUp.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'invoicing-and-finance',
    title: 'Finance & Billing',
    pageType: 'APP_FEATURE',
    seoTitle: 'Freelancer Invoicing & Agency Finance Software | 180workspace',
    seoDescription: 'Automated expense tracking and recurring billing. The best invoicing software for freelancers and digital agencies.',
    keywords: ['Freelancer invoicing software', 'Automated expense tracking for agencies'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Finance",
      "applicationCategory": "FinanceApplication"
    },
    heroHeadline: 'Get Paid Faster with Smart Invoicing',
    heroSubtext: 'Automate your agency billing, track expenses, and integrate seamlessly with Stripe.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'website-and-form-builder',
    title: 'Advertising & Websites',
    pageType: 'APP_FEATURE',
    seoTitle: 'Website & Form Builder for Digital Agencies | 180workspace',
    seoDescription: 'Capture leads with custom white-label forms. A powerful website builder designed for digital agencies.',
    keywords: ['Website builder for digital agencies', 'Client lead capture form builder'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Website Builder",
      "applicationCategory": "DesignApplication"
    },
    heroHeadline: 'Build Forms & Pages that Convert',
    heroSubtext: 'Create white-label lead capture forms and landing pages hosted on your custom domain.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'team-client-chat',
    title: 'Communications',
    pageType: 'APP_FEATURE',
    seoTitle: 'Agency Team Chat & Client Communication Portal | 180workspace',
    seoDescription: 'Keep all your communications in one place. The ultimate client portal and team chat for freelancers.',
    keywords: ['Client communication portal for freelancers', 'Agency team chat software'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Communications",
      "applicationCategory": "CommunicationApplication"
    },
    heroHeadline: 'Centralize Your Team & Client Comms',
    heroSubtext: 'Say goodbye to scattered emails. Chat with your team and clients in dedicated, secure channels.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'social-media-content-calendar',
    title: 'Social Media',
    pageType: 'APP_FEATURE',
    seoTitle: 'Social Media Content Calendar for Agencies | 180workspace',
    seoDescription: 'Plan, schedule, and approve posts with our social media planning tool and content calendar software.',
    keywords: ['Social media planning tool for agencies', 'Content calendar software'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Social Media",
      "applicationCategory": "BusinessApplication"
    },
    heroHeadline: 'Streamline Your Social Media Approvals',
    heroSubtext: 'A visual content calendar that lets agencies plan and collaborate with clients effortlessly.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'workspace-productivity-tools',
    title: 'Workspace Tools',
    pageType: 'APP_FEATURE',
    seoTitle: 'All-in-One Workspace & Productivity Tools | 180workspace',
    seoDescription: 'Agency document management and shared calendars in one platform. The best workspace for freelancers.',
    keywords: ['All-in-one workspace for freelancers', 'Agency document management'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Productivity",
      "applicationCategory": "BusinessApplication"
    },
    heroHeadline: 'Docs, Calendars, & Notes Unified',
    heroSubtext: 'Everything your agency needs to stay productive, tightly integrated into your daily workflow.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'workflow-automations',
    title: 'Automations',
    pageType: 'APP_FEATURE',
    seoTitle: 'Agency Workflow Automation Software | 180workspace',
    seoDescription: 'Put your tasks on autopilot with powerful workflow automation software for agencies and freelancers.',
    keywords: ['Agency workflow automation software', 'Freelance task automation'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Automations",
      "applicationCategory": "BusinessApplication"
    },
    heroHeadline: 'Automate the Busywork',
    heroSubtext: 'Set up custom triggers and actions to move data seamlessly across all 180workspace apps.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'agency-analytics-dashboard',
    title: 'Insights & Analytics',
    pageType: 'APP_FEATURE',
    seoTitle: 'Business Intelligence Dashboard for Agencies | 180workspace',
    seoDescription: 'Track performance and KPIs with a comprehensive analytics dashboard built for digital agencies.',
    keywords: ['Business intelligence dashboard for agencies'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Analytics",
      "applicationCategory": "BusinessApplication"
    },
    heroHeadline: 'Data-Driven Agency Decisions',
    heroSubtext: 'Visualize your revenue, team performance, and project health in beautiful, real-time dashboards.',
    contentBlocks: { features: [] },
    published: true,
  },
  {
    slug: 'enterprise-security',
    title: 'Identity & Security',
    pageType: 'APP_FEATURE',
    seoTitle: 'Secure Client Portal & RBAC for Agencies | 180workspace',
    seoDescription: 'Enterprise-grade security with role-based access control. Keep your agency and client data safe.',
    keywords: ['Secure client portal software', 'Role-based access control for agencies'],
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "180workspace Security",
      "applicationCategory": "SecurityApplication"
    },
    heroHeadline: 'Bank-Grade Security for Your Agency',
    heroSubtext: 'Granular permissions, role-based access control, and secure client portals you can trust.',
    contentBlocks: { features: [] },
    published: true,
  }
];

async function main() {
  console.log('Seeding 11 Marketing Landing Pages...');
  
  for (const page of marketingPages) {
    await prisma.marketingPage.upsert({
      where: { slug: page.slug },
      update: { ...page },
      create: { ...page }
    });
  }
  
  console.log('Marketing pages seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
