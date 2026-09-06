import { prisma } from '@workspace/db';

export interface ExecutiveRoiReport {
  timeframe: string;
  totalCalls: number;
  missedCallsSaved: number;
  missedCallPercentage: number;
  totalDurationSeconds: number;
  laborHoursSaved: number;
  hourlyWageBenchmark: number;
  grossLaborSavings: number;
  platformCostTotal: number;
  netLaborSavings: number;
  appointmentsBookedCount: number;
  estimatedAppointmentRevenue: number;
  ordersCreatedCount: number;
  directOrderRevenue: number;
  totalRevenueInfluenced: number;
  totalNetEconomicImpact: number;
  netRoiMultiplier: number;
}

export class RoiAnalyticsService {
  /**
   * Computes ground-truth business ROI, labor savings, and revenue attribution
   */
  static async calculateRoi(
    companyId: string,
    timeframe: '7d' | '30d' | '90d' | 'all' = '30d',
    hourlyWageBenchmark: number = 18.0,
    appointmentValueBenchmark: number = 100.0
  ): Promise<ExecutiveRoiReport> {
    const now = new Date();
    let startDate = new Date();
    if (timeframe === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeframe === '90d') startDate.setDate(now.getDate() - 90);
    else startDate = new Date(0);

    // 1. Fetch completed call sessions in period
    const sessions = await (prisma as any).callSession.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate }
      },
      include: {
        toolExecutions: true
      }
    });

    const totalCalls = sessions.length;
    let totalDurationSeconds = 0;
    let platformCostTotal = 0;
    let missedCallsSaved = 0;
    let appointmentsBookedCount = 0;
    let ordersCreatedCount = 0;
    let directOrderRevenue = 0;

    for (const s of sessions) {
      totalDurationSeconds += (s.durationSeconds || 0);
      platformCostTotal += (s.estimatedCostInr || 0);

      // Identify missed calls recovered (inbound calls after 6 PM or before 9 AM, or concurrent overflow)
      const callDate = new Date(s.createdAt);
      const callHour = callDate.getHours();
      if (s.direction === 'inbound' && (callHour < 9 || callHour >= 18)) {
        missedCallsSaved++;
      }

      // Identify successful business conversions via tools executed
      const tools = s.toolExecutions || [];
      for (const t of tools) {
        if (t.isSuccess) {
          if (t.toolName === 'book_appointment' || t.toolName === 'schedule_meeting') {
            appointmentsBookedCount++;
          }
          if (t.toolName === 'create_sales_order' || t.toolName === 'create_order') {
            ordersCreatedCount++;
            const amount = Number((t.arguments as any)?.totalAmount || (t.arguments as any)?.price || (t.result as any)?.totalAmount || 0);
            directOrderRevenue += amount;
          }
        }
      }
    }

    const laborHoursSaved = Number((totalDurationSeconds / 3600).toFixed(1));
    const grossLaborSavings = Number((laborHoursSaved * hourlyWageBenchmark).toFixed(2));
    const netLaborSavings = Number(Math.max(0, grossLaborSavings - platformCostTotal).toFixed(2));

    const estimatedAppointmentRevenue = Number((appointmentsBookedCount * appointmentValueBenchmark).toFixed(2));
    const totalRevenueInfluenced = Number((estimatedAppointmentRevenue + directOrderRevenue).toFixed(2));
    const totalNetEconomicImpact = Number((netLaborSavings + totalRevenueInfluenced).toFixed(2));

    const netRoiMultiplier = platformCostTotal > 0
      ? Number((totalNetEconomicImpact / platformCostTotal).toFixed(1))
      : (totalNetEconomicImpact > 0 ? 10.0 : 1.0);

    const missedCallPercentage = totalCalls > 0
      ? Number(((missedCallsSaved / totalCalls) * 100).toFixed(1))
      : 0;

    return {
      timeframe,
      totalCalls,
      missedCallsSaved,
      missedCallPercentage,
      totalDurationSeconds,
      laborHoursSaved,
      hourlyWageBenchmark,
      grossLaborSavings,
      platformCostTotal: Number(platformCostTotal.toFixed(2)),
      netLaborSavings,
      appointmentsBookedCount,
      estimatedAppointmentRevenue,
      ordersCreatedCount,
      directOrderRevenue: Number(directOrderRevenue.toFixed(2)),
      totalRevenueInfluenced,
      totalNetEconomicImpact,
      netRoiMultiplier
    };
  }
}
