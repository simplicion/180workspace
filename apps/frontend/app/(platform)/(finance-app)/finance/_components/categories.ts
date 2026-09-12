export interface TransactionCategory {
    id: string;
    name: string;
    group: 'income' | 'expense';
    iconName: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    isTaxDeductible?: boolean;
}

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
    // ==========================================
    // INCOME / REVENUE CATEGORIES (Money In)
    // ==========================================
    {
        id: 'client_retainer',
        name: 'Client Retainer',
        group: 'income',
        iconName: 'Building2',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        description: 'Monthly recurring retainer fees from contracted clients.'
    },
    {
        id: 'project_milestone',
        name: 'Project Milestone',
        group: 'income',
        iconName: 'Target',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        description: 'Deliverable milestone settlements and fixed-bid payouts.'
    },
    {
        id: 'consulting_services',
        name: 'Consulting & Services',
        group: 'income',
        iconName: 'Briefcase',
        color: 'text-teal-700',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        description: 'Hourly advisory, custom development, or specialized agency work.'
    },
    {
        id: 'product_sales',
        name: 'Product & SaaS Sales',
        group: 'income',
        iconName: 'CreditCard',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        description: 'Software licenses, subscriptions, or digital product sales.'
    },
    {
        id: 'interest_investments',
        name: 'Interest & Investments',
        group: 'income',
        iconName: 'TrendingUp',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        description: 'Capital gains, treasury yields, or investor funding.'
    },
    {
        id: 'refund_received',
        name: 'Refund Received',
        group: 'income',
        iconName: 'RotateCcw',
        color: 'text-cyan-700',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-200',
        description: 'Vendor reimbursements or reversed debit charges.'
    },
    {
        id: 'other_income',
        name: 'Other Operating Income',
        group: 'income',
        iconName: 'Sparkles',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        description: 'Miscellaneous non-core cash inflows.'
    },

    // ==========================================
    // EXPENSE / DISBURSEMENT CATEGORIES (Money Out)
    // ==========================================
    {
        id: 'payroll_salaries',
        name: 'Payroll & Salaries',
        group: 'expense',
        iconName: 'Users',
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        description: 'Employee wages, executive salaries, and staff bonuses.',
        isTaxDeductible: true
    },
    {
        id: 'software_saas',
        name: 'Software & Cloud Infrastructure',
        group: 'expense',
        iconName: 'Cloud',
        color: 'text-sky-700',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
        description: 'AWS, Vercel, OpenAI, GitHub, Slack, Notion subscriptions.',
        isTaxDeductible: true
    },
    {
        id: 'contractors_freelancers',
        name: 'Contractors & Freelancers',
        group: 'expense',
        iconName: 'UserCheck',
        color: 'text-violet-700',
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200',
        description: 'External specialist talent and 1099 agency sub-contractors.',
        isTaxDeductible: true
    },
    {
        id: 'office_rent',
        name: 'Office Rent & Facilities',
        group: 'expense',
        iconName: 'Building',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        description: 'Commercial lease, co-working spaces, and facility upkeep.',
        isTaxDeductible: true
    },
    {
        id: 'marketing_ads',
        name: 'Marketing, Ads & SEO',
        group: 'expense',
        iconName: 'Megaphone',
        color: 'text-pink-700',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        description: 'Google/Meta Ads, influencer sponsorships, and creative assets.',
        isTaxDeductible: true
    },
    {
        id: 'legal_accounting',
        name: 'Legal, Audit & Professional',
        group: 'expense',
        iconName: 'Scale',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        description: 'Attorneys, certified auditors, tax accountants, and filing fees.',
        isTaxDeductible: true
    },
    {
        id: 'travel_entertainment',
        name: 'Travel & Client Entertainment',
        group: 'expense',
        iconName: 'Plane',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        description: 'Flights, hotels, client dinners, and conference passes.',
        isTaxDeductible: true
    },
    {
        id: 'hardware_equipment',
        name: 'Hardware & Workstations',
        group: 'expense',
        iconName: 'Laptop',
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        description: 'MacBooks, monitors, test devices, and ergonomic furniture.',
        isTaxDeductible: true
    },
    {
        id: 'utilities_telecom',
        name: 'Utilities & Internet',
        group: 'expense',
        iconName: 'Wifi',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        description: 'High-speed fiber internet, electricity, and mobile plans.',
        isTaxDeductible: true
    },
    {
        id: 'taxes_compliance',
        name: 'Taxes, GST & Compliance',
        group: 'expense',
        iconName: 'Receipt',
        color: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        description: 'GST, TDS, Corporate income tax, and regulatory filings.'
    },
    {
        id: 'bank_fees',
        name: 'Bank & Processing Fees',
        group: 'expense',
        iconName: 'Percent',
        color: 'text-zinc-700',
        bgColor: 'bg-zinc-50',
        borderColor: 'border-zinc-200',
        description: 'Stripe gateway fees, wire charges, and forex markup.'
    },
    {
        id: 'other_expense',
        name: 'Other Operating Expense',
        group: 'expense',
        iconName: 'Layers',
        color: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        description: 'General operational overhead.'
    }
];

export const PAYMENT_METHODS = [
    { id: 'bank_transfer', label: 'Bank Wire / NEFT / IMPS', icon: 'Landmark' },
    { id: 'upi', label: 'UPI Instant', icon: 'Smartphone' },
    { id: 'stripe', label: 'Stripe Payment Gateway', icon: 'CreditCard' },
    { id: 'credit_card', label: 'Corporate Credit Card', icon: 'CreditCard' },
    { id: 'ach', label: 'ACH Direct Debit', icon: 'Landmark' },
    { id: 'cash', label: 'Petty Cash', icon: 'Wallet' },
    { id: 'cheque', label: 'Bank Cheque / Draft', icon: 'FileText' }
];

export function getCategoryById(id?: string): TransactionCategory {
    const defaultCat: TransactionCategory = {
        id: 'general',
        name: 'General',
        group: 'expense',
        iconName: 'DollarSign',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        description: 'General ledger entry'
    };

    if (!id) return defaultCat;
    const normalized = id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return TRANSACTION_CATEGORIES.find(c => c.id === normalized || c.name.toLowerCase() === id.toLowerCase()) || {
        ...defaultCat,
        name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
}
