import { prisma } from '@workspace/db';
import { EmailService } from '@workspace/backend-infra';

export class SalaryService {
  /**
   * Helper to synchronize a paid salary with the corporate ExpenseTransaction ledger.
   * Ensures all payroll payouts are automatically calculated in Financials as company expenses.
   */
  static async syncExpenseTransaction(salary: any) {
    try {
      const companyId = salary.companyId || salary.employee?.companyId;
      if (!companyId) return null;

      const netAmount = Number(salary.netSalary ?? salary.amount ?? 0);
      const empName = salary.employee?.name || 'Staff Member';
      const monthLabel = salary.month || new Date().toISOString().slice(0, 7);

      const existingExpense = await prisma.expenseTransaction.findFirst({
        where: {
          companyId,
          payoutId: salary.id
        }
      });

      if (!existingExpense) {
        return await prisma.expenseTransaction.create({
          data: {
            companyId,
            type: 'company_expense',
            title: `Salary Payout - ${empName} (${monthLabel})`,
            amount: netAmount,
            currency: salary.currency || 'USD',
            category: 'payroll',
            date: salary.paidAt || new Date(),
            dueDate: salary.paidAt || new Date(),
            status: 'paid',
            employeeId: salary.employeeId,
            payoutId: salary.id,
            notes: `Automated payroll ledger disbursement for ${empName} (${monthLabel}). Base: ${salary.baseSalary || 0}, Bonuses: ${salary.bonuses || 0}, Deductions: ${salary.deductions || 0}, Net: ${netAmount}.`
          }
        });
      } else {
        return await prisma.expenseTransaction.update({
          where: { id: existingExpense.id },
          data: {
            amount: netAmount,
            status: 'paid',
            date: salary.paidAt || new Date(),
            notes: `Automated payroll ledger disbursement for ${empName} (${monthLabel}). Net: ${netAmount}.`
          }
        });
      }
    } catch (err: any) {
      console.error('[SalaryService] Failed to sync ExpenseTransaction:', err.message);
      return null;
    }
  }

  static async reviewSalary(id: string, data: any) {
    const { deductions, bonuses, notes } = data;
    const salary = await prisma.salary.findFirst({
      where: { id },
      include: { employee: true }
    });
    
    if (!salary) throw new Error('Salary record not found');
    
    if (['paid', 'approved'].includes(salary.status)) {
      throw new Error(`Cannot review salary in '${salary.status}' status`);
    }

    const base = salary.baseSalary || 0;
    const netSalary = Math.max(0, base - (deductions || 0) + (bonuses || 0));

    const updatedSalary = await prisma.salary.update({
      where: { id },
      data: {
        status: 'hr_approved',
        deductions: deductions || 0,
        bonuses: bonuses || 0,
        netSalary: netSalary,
        notes: notes
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            bankAccount: true,
            position: true,
            department: true,
            companyId: true
          }
        }
      }
    });

    return updatedSalary;
  }

  static async getMySalaries(userId: string) {
    const salaries = await prisma.salary.findMany({
      where: {
        employeeId: userId
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            bankAccount: true,
            position: true,
            department: true,
            companyId: true
          }
        }
      },
      orderBy: { month: 'desc' }
    });
    return salaries;
  }

  static async getSalaries(params: { month?: string; companyId?: string } = {}) {
    const { month, companyId } = params;
    const where: any = {};
    if (month) where.month = month;
    if (companyId) where.employee = { companyId };

    const salaries = await prisma.salary.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            bankAccount: true,
            position: true,
            department: true,
            companyId: true
          }
        },
        generatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return salaries;
  }

  static async getSalaryById(id: string) {
    const salary = await prisma.salary.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            bankAccount: true,
            position: true,
            department: true,
            phone: true,
            companyId: true
          }
        },
        generatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: true
      }
    });

    if (!salary) throw new Error('Salary record not found');

    // Fetch company settings if available
    let settings = null;
    const companyId = salary.companyId || salary.employee?.companyId;
    if (companyId) {
      settings = await prisma.settings.findFirst({
        where: { companyId }
      });
    }

    return {
      ...salary,
      companySettings: settings
    };
  }

  static async generateSalary(userId: string, data: any) {
    const { 
      employeeId, month, baseSalary, deductions = 0, bonuses = 0, notes, 
      totalDays, presentDays, halfDays, absentDays, paidLeaves, unpaidLeaves, perDaySalary,
      sendEmail = false, isPaid = false
    } = data;

    if (!employeeId || !month || baseSalary === undefined || baseSalary === null || baseSalary === '') {
      throw new Error('employeeId, month, and baseSalary are required');
    }

    const existing = await prisma.salary.findFirst({ where: { employeeId, month } });
    if (existing && ['paid', 'approved'].includes(existing.status)) {
      throw new Error(`Salary for this month is already ${existing.status} and cannot be regenerated.`);
    }

    const netSalary = Math.max(0, Number(baseSalary) - Number(deductions) + Number(bonuses));
    const now = new Date();
    
    const salaryData = { 
      baseSalary: Number(baseSalary), 
      deductions: Number(deductions), 
      bonuses: Number(bonuses), 
      netSalary, 
      notes, 
      generatedBy: userId, 
      status: isPaid ? 'paid' : 'pending',
      paidAt: isPaid ? now : null,
      totalDays: Number(totalDays) || null, 
      presentDays: Number(presentDays) || null, 
      halfDays: Number(halfDays) || null, 
      absentDays: Number(absentDays) || null, 
      paidLeaves: Number(paidLeaves) || null, 
      unpaidLeaves: Number(unpaidLeaves) || null, 
      perDaySalary: Number(perDaySalary) || null
    };

    let salary;
    if (existing) {
      salary = await prisma.salary.update({ 
        where: { id: existing.id }, 
        data: salaryData, 
        include: { 
          employee: { 
            select: { 
              id: true, 
              name: true, 
              email: true, 
              employeeId: true, 
              bankAccount: true, 
              position: true, 
              department: true,
              companyId: true 
            } 
          } 
        } 
      });
    } else {
      salary = await prisma.salary.create({ 
        data: { 
          ...salaryData, 
          employeeId, 
          month
        }, 
        include: { 
          employee: { 
            select: { 
              id: true, 
              name: true, 
              email: true, 
              employeeId: true, 
              bankAccount: true, 
              position: true, 
              department: true,
              companyId: true 
            } 
          } 
        } 
      });
    }

    // If marked as paid, register in corporate financial expenses
    if (isPaid) {
      await this.syncExpenseTransaction(salary);
    }

    // Auto-email payslip if requested and email is present
    if (sendEmail && salary.employee?.email) {
      try {
        await EmailService.sendSalarySlip(salary.employee, salary, prisma);
      } catch (emailErr: any) {
        console.error('[SalaryService] Failed to auto-send payslip email:', emailErr.message);
      }
    }

    return salary;
  }

  static async approveSalary(id: string) {
    const existing = await prisma.salary.findFirst({ where: { id } });
    if (!existing) throw new Error('Salary record not found');
    
    const salary = await prisma.salary.update({
      where: { id },
      data: { status: 'approved' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            department: true,
            position: true,
            companyId: true
          }
        }
      }
    });
    return salary;
  }

  static async markPaid(id: string) {
    const existing = await prisma.salary.findFirst({ 
      where: { id },
      include: { 
        employee: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            employeeId: true, 
            department: true, 
            position: true, 
            companyId: true 
          } 
        } 
      }
    });
    if (!existing) throw new Error('Salary record not found');

    const paidAt = new Date();
    const salary = await prisma.salary.update({
      where: { id },
      data: { status: 'paid', paidAt },
      include: { 
        employee: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            employeeId: true, 
            department: true, 
            position: true, 
            companyId: true 
          } 
        } 
      }
    });

    // 1. Sync with Financial Expenses
    await this.syncExpenseTransaction(salary);

    // 2. Automatically dispatch payslip email if employee has email configured
    if (salary.employee?.email) {
      try {
        await EmailService.sendSalarySlip(salary.employee, salary, prisma);
      } catch (emailErr: any) {
        console.error('[SalaryService] Auto-dispatch payslip email error:', emailErr.message);
      }
    }

    return salary;
  }

  static async sendPayslipEmail(id: string) {
    const salary = await prisma.salary.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            department: true,
            position: true,
            companyId: true
          }
        }
      }
    });

    if (!salary) throw new Error('Salary record not found');
    if (!salary.employee?.email) {
      throw new Error(`Staff member '${salary.employee?.name || 'Employee'}' does not have an email address configured. You can share the online payslip link or download the PDF.`);
    }

    await EmailService.sendSalarySlip(salary.employee, salary, prisma);

    return {
      success: true,
      recipient: salary.employee.email,
      message: `Official payslip for ${salary.month} sent successfully to ${salary.employee.email}`
    };
  }
}
