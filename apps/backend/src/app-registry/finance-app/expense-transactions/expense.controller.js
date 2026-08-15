'use strict';

exports.getExpenses = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userRole = req.user.role;

    // Base query
    const query = { companyId };

    // If not admin/finance, only show their own claims
    if (!['admin', 'manager', 'finance', 'super_admin'].includes(userRole)) {
      query.employeeId = req.user.id;
    }

    const expenses = await req.prisma.expenseTransaction.findMany({
      where: query,
      include: {
        vendor: true,
        employee: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: expenses.length,
      data: { expenses }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};

exports.getExpenseById = async (req, res) => {
  try {
    const expense = await req.prisma.expenseTransaction.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      },
      include: {
        vendor: true,
        employee: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } }
      }
    });

    if (!expense) {
      return res.status(404).json({ status: 'error', error: 'Expense not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { expense }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { 
      type, title, amount, currency, category, date, dueDate, 
      attachmentUrl, receiptLinks, notes, vendorId, newVendorName, newVendorEmail, newVendorPhone,
      newVendorTaxId, newVendorAddress, newVendorBankDetails,
      projectId, clientId
    } = req.body;

    if (!['company_expense', 'employee_claim'].includes(type)) {
      return res.status(400).json({ status: 'error', error: 'Invalid expense type' });
    }

    let finalVendorId = vendorId;

    // Auto-create vendor if new details are provided
    if (type === 'company_expense' && !vendorId && newVendorName) {
      const newVendor = await req.prisma.vendor.create({
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

    // Process receipt links
    let parsedReceiptLinks = [];
    if (receiptLinks) {
        if (Array.isArray(receiptLinks)) parsedReceiptLinks = receiptLinks;
        else if (typeof receiptLinks === 'string') parsedReceiptLinks = receiptLinks.split(',').map(l => l.trim()).filter(l => l);
    }

    // Set initial status based on type
    const status = type === 'employee_claim' ? 'pending_approval' : 'unpaid';

    const expense = await req.prisma.expenseTransaction.create({
      data: {
        companyId,
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
        employeeId: type === 'employee_claim' ? req.user.id : null
      }
    });

    res.status(201).json({
      status: 'success',
      data: { expense }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};

exports.approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;
    
    const expense = await req.prisma.expenseTransaction.findFirst({
      where: { id, companyId: req.user.companyId }
    });

    if (!expense) return res.status(404).json({ status: 'error', error: 'Expense not found' });
    if (expense.type !== 'employee_claim') return res.status(400).json({ status: 'error', error: 'Only employee claims can be approved' });
    
    const updatedExpense = await req.prisma.expenseTransaction.update({
      where: { id },
      data: {
        status: 'approved', // Means approved but unpaid
        reviewNote,
        reviewedById: req.user.id,
        reviewedAt: new Date()
      }
    });

    res.status(200).json({
      status: 'success',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;
    
    const updatedExpense = await req.prisma.expenseTransaction.update({
      where: { id, companyId: req.user.companyId },
      data: {
        status,
        reviewNote
      }
    });

    res.status(200).json({
      status: 'success',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};
