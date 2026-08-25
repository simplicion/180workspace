import { prisma, requestContext } from '@workspace/db';

export class ExpenseService {
  static async getExpenses(user: any) {
    const query: any = { };

    // If not admin/finance, only show their own claims
    if (!['admin', 'manager', 'finance', 'super_admin'].includes(user.role)) {
      query.employeeId = user.id;
    }

    const expenses = await prisma.expenseTransaction.findMany({
      where: query,
      include: {
        vendor: true,
        employee: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return expenses;
  }

  static async getExpenseById(id: string) {
    const expense = await prisma.expenseTransaction.findFirst({
      where: { id },
      include: {
        vendor: true,
        employee: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } }
      }
    });

    if (!expense) throw new Error('Expense not found');
    return expense;
  }

  static async createExpense(user: any, data: any) {
    const { 
      type, title, amount, currency, category, date, dueDate, 
      attachmentUrl, receiptLinks, notes, vendorId, newVendorName, newVendorEmail, newVendorPhone,
      newVendorTaxId, newVendorAddress, newVendorBankDetails,
      projectId, clientId
    } = data;

    if (!['company_expense', 'employee_claim'].includes(type)) {
      throw new Error('Invalid expense type');
    }

    const companyId = requestContext.getStore()?.companyId as string;

    let finalVendorId = vendorId;

    // Auto-create vendor if new details are provided
    if (type === 'company_expense' && !vendorId && newVendorName) {
      const newVendor = await prisma.vendor.create({
        data: {
          name: newVendorName,
          email: newVendorEmail || null,
          phone: newVendorPhone || null,
          taxId: newVendorTaxId || null,
          address: newVendorAddress ? { text: newVendorAddress } : {},
          bankDetails: newVendorBankDetails ? { text: newVendorBankDetails } : {},
          companyId
        }
      });
      finalVendorId = newVendor.id;
    }

    let parsedReceiptLinks: string[] = [];
    if (receiptLinks) {
        if (Array.isArray(receiptLinks)) parsedReceiptLinks = receiptLinks;
        else if (typeof receiptLinks === 'string') parsedReceiptLinks = receiptLinks.split(',').map((l: string) => l.trim()).filter((l: string) => l);
    }

    const status = type === 'employee_claim' ? 'pending_approval' : 'unpaid';

    const expense = await prisma.expenseTransaction.create({
      data: {
        type,
        title,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        category: category || 'other',
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        attachmentUrl,
        receiptLinks: parsedReceiptLinks,
        notes,
        status,
        vendorId: finalVendorId,
        projectId: projectId || null,
        clientId: clientId || null,
        employeeId: type === 'employee_claim' ? user.id : null,
        companyId
      }
    });

    return expense;
  }

  static async approveClaim(user: any, id: string, reviewNote?: string) {
    const expense = await prisma.expenseTransaction.findFirst({
      where: { id }
    });

    if (!expense) throw new Error('Expense not found');
    if (expense.type !== 'employee_claim') throw new Error('Only employee claims can be approved');
    
    const updatedExpense = await prisma.expenseTransaction.update({
      where: { id },
      data: {
        status: 'approved',
        reviewNote,
        reviewedById: user.id,
        reviewedAt: new Date()
      }
    });

    return updatedExpense;
  }

  static async updateStatus(id: string, status: string, reviewNote?: string) {
    const updatedExpense = await prisma.expenseTransaction.updateMany({
      where: { id },
      data: {
        status,
        reviewNote
      }
    });

    return updatedExpense;
  }
}
