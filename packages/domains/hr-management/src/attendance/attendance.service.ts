import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';

export class AttendanceService {

  constructor() {
  }

  calculateWorkHours(checkIn?: string, checkOut?: string): number {
    if (!checkIn || !checkOut) return 0;
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = checkOut.split(':').map(Number);
    const diff = h2 * 60 + m2 - (h1 * 60 + m1);
    return Math.max(0, Number((diff / 60).toFixed(2)));
  }

  determineShiftStatus(
    checkIn: string,
    standardStart: string,
    gracePeriod: number
  ): string {
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = standardStart.split(':').map(Number);
    const actualTotal = h1 * 60 + m1;
    const standardTotal = h2 * 60 + m2;

    if (actualTotal < standardTotal) return 'before_start';
    if (actualTotal <= standardTotal + gracePeriod) return 'on_time';
    return 'late';
  }

  determineExitStatus(checkOut: string, standardEnd: string): string {
    if (!checkOut || !standardEnd) return 'on_time';
    const [h1, m1] = checkOut.split(':').map(Number);
    const [h2, m2] = standardEnd.split(':').map(Number);
    const actualTotal = h1 * 60 + m1;
    const standardTotal = h2 * 60 + m2;

    if (actualTotal < standardTotal) return 'early_exit';
    return 'on_time';
  }

  async getAttendance(query: any, skip: number, take: number) {
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: query,
        include: {
          employee: {
            select: {
              name: true,
              email: true,
              employeeId: true,
              photoUrl: true,
              department: true,
            },
          },
          markedBy: { select: { name: true, email: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.attendance.count({ where: query }),
    ]);
    return { records, total };
  }

  async getMyAttendance(userId: string, month?: string) {
    const query: any = { employeeId: userId };
    if (month) query.date = { startsWith: month };

    return prisma.attendance.findMany({
      where: query,
      orderBy: { date: 'desc' },
    });
  }

  async getMonthlyReport(month: string) {
    const employees = await prisma.user.findMany({
      where: { isActive: true, role: { not: 'client' } },
    });
    const records = await prisma.attendance.findMany({
      where: { date: { startsWith: month } },
    });

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(y, m - 1, d).getDay();
      if (day !== 0) workingDays++;
    }

    const summary = employees.map((emp) => {
      const empIdStr = emp.id;
      const empRecords = records.filter((r) => r.employeeId === empIdStr);
      const countBy = (status: string) =>
        empRecords.filter((r) => r.status === status).length;
      const present = countBy('present');
      const late = countBy('late');
      const halfDay = countBy('half_day');
      const wfh = countBy('work_from_home');
      const onLeave = countBy('on_leave');
      const absent = countBy('absent');
      const totalMarked = empRecords.length;
      const attendanceRate =
        workingDays > 0
          ? Math.round(
              ((present + late + wfh + halfDay * 0.5) / workingDays) * 100
            )
          : 0;

      const checkIns = empRecords
        .filter((r) => r.checkIn)
        .map((r) => r.checkIn)
        .sort();
      const checkOuts = empRecords
        .filter((r) => r.checkOut)
        .map((r) => r.checkOut)
        .sort()
        .reverse();
      return {
        employee: {
          _id: empIdStr,
          name: emp.name,
          employeeId: emp.employeeId,
          department: emp.department,
          role: emp.role,
          photoUrl: emp.photoUrl,
        },
        present,
        absent,
        late,
        halfDay,
        wfh,
        onLeave,
        total: totalMarked,
        workingDays,
        attendanceRate,
        avgCheckIn: checkIns[Math.floor(checkIns.length / 2)] || null,
      };
    });

    const totals = {
      present: summary.reduce((a, s) => a + s.present, 0),
      absent: summary.reduce((a, s) => a + s.absent, 0),
      late: summary.reduce((a, s) => a + s.late, 0),
      wfh: summary.reduce((a, s) => a + s.wfh, 0),
      onLeave: summary.reduce((a, s) => a + s.onLeave, 0),
    };

    return { month, summary, employeeCount: employees.length, workingDays, totals };
  }

  async markAttendance(data: any, userId: string) {
    const { employeeId, date, status, checkIn, checkOut, notes } = data;
    const workHours = this.calculateWorkHours(checkIn, checkOut);

    return prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: { status, checkIn, checkOut, notes, workHours, markedById: userId },
      create: {
        employeeId,
        date,
        status,
        checkIn,
        checkOut,
        notes,
        workHours,
        markedById: userId,
      },
    });
  }

  async updateAttendance(id: string, data: any) {
    if (data.checkIn || data.checkOut) {
      const existing = await prisma.attendance.findUnique({
        where: { id },
      });
      if (existing) {
        const cIn = data.checkIn !== undefined ? data.checkIn : existing.checkIn;
        const cOut =
          data.checkOut !== undefined ? data.checkOut : existing.checkOut;
        data.workHours = this.calculateWorkHours(cIn, cOut);
      }
    }
    return prisma.attendance.update({
      where: { id },
      data,
    });
  }

  async autoCheckIn(
    userId: string,
    companyId: string,
    date: string,
    checkInTime: string
  ) {
    const config =
      (await prisma.companyConfig.findFirst({
        where: { companyId },
      })) || ({} as any);

    let record = await prisma.attendance.findFirst({
      where: { employeeId: userId, date },
    });
    if (record && record.checkIn) {
      return { message: 'Already checked in', record };
    }

    const standardStart = config.standardStartTime || '09:00';
    const grace = config.gracePeriod || 15;
    const shiftStatus = this.determineShiftStatus(
      checkInTime,
      standardStart,
      grace
    );

    record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: userId, date } },
      update: {
        checkIn: checkInTime,
        status: shiftStatus === 'late' ? 'late' : 'present',
        shiftStatus,
        markedById: userId,
      },
      create: {
        employeeId: userId,
        date,
        checkIn: checkInTime,
        status: shiftStatus === 'late' ? 'late' : 'present',
        shiftStatus,
        markedById: userId,
      },
    });

    return { message: 'Checked in successfully', record };
  }

  async autoCheckOut(
    userId: string,
    companyId: string,
    date: string,
    checkOutTime: string
  ) {
    const record = await prisma.attendance.findFirst({
      where: { employeeId: userId, date },
    });
    if (!record) {
      throw new Error('No attendance record found for today');
    }
    if (!record.checkIn) {
      throw new Error('Cannot check out without check-in');
    }

    const config =
      (await prisma.companyConfig.findFirst({
        where: { companyId },
      })) || ({} as any);
    const standardEnd = config.standardEndTime || '18:00';

    const workHours = this.calculateWorkHours(record.checkIn, checkOutTime);
    const exitStatus = this.determineExitStatus(checkOutTime, standardEnd);

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: checkOutTime,
        workHours,
        shiftStatus:
          exitStatus === 'early_exit' ? 'early_exit' : record.shiftStatus,
      },
    });

    return { message: 'Checked out successfully', record: updated };
  }
}
