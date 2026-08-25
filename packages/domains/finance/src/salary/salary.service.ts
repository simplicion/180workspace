import { prisma } from '@workspace/db';

export class SalaryService {
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
      }
    });

    return updatedSalary;
  }

  static async getMySalaries(userId: string) {
    const salaries = await prisma.salary.findMany({
      where: {
        employeeId: userId
      },
      orderBy: { month: 'desc' }
    });
    return salaries;
  }

  static async generateSalary(userId: string, data: any) {
    const { 
      employeeId, month, baseSalary, deductions = 0, bonuses = 0, notes, 
      totalDays, presentDays, halfDays, absentDays, paidLeaves, unpaidLeaves, perDaySalary 
    } = data;

    if (!employeeId || !month || baseSalary === undefined || baseSalary === null || baseSalary === '') {
      throw new Error('employeeId, month, and baseSalary are required');
    }

    const existing = await prisma.salary.findFirst({ where: { employeeId, month } });
    if (existing && ['paid', 'approved'].includes(existing.status)) {
      throw new Error(`Salary for this month is already ${existing.status} and cannot be regenerated.`);
    }

    const netSalary = Math.max(0, Number(baseSalary) - Number(deductions) + Number(bonuses));
    
    const salaryData = { 
      baseSalary: Number(baseSalary), 
      deductions: Number(deductions), 
      bonuses: Number(bonuses), 
      netSalary, 
      notes, 
      generatedBy: userId, 
      status: 'pending',
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
        include: { employee: { select: { name: true, email: true } } } 
      });
    } else {
      salary = await prisma.salary.create({ 
        data: { 
          ...salaryData, 
          employeeId, 
          month
        }, 
        include: { employee: { select: { name: true, email: true } } } 
      });
    }

    return salary;
  }

  static async approveSalary(id: string) {
    const existing = await prisma.salary.findFirst({ where: { id } });
    if (!existing) throw new Error('Salary record not found');
    
    const salary = await prisma.salary.update({
      where: { id },
      data: { status: 'approved' }
    });
    return salary;
  }

  static async markPaid(id: string) {
    const existing = await prisma.salary.findFirst({ where: { id } });
    if (!existing) throw new Error('Salary record not found');

    const salary = await prisma.salary.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
      include: { employee: { select: { name: true, email: true } } }
    });

    return salary;
  }
}
