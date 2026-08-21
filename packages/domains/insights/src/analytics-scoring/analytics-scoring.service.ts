export class AnalyticsScoringService {
  /**
   * 1. Task Priority Algorithm
   * Priority Score = (importance * 3) + (projectUrgency * 2) + (clientPriority * 2) - (daysLeft)
   */
  static calculateTaskPriority(task: any) {
      const importance = task.importance || 1; // 1-5
      const projectUrgency = task.projectUrgency || 1; // 1-5
      const clientPriority = task.clientPriority || 1; // 1-5

      const now = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : now;
      const diffTime = dueDate.getTime() - now.getTime();
      const daysLeft = Math.max(-30, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); // Bound to -30 to prevent score runaway

      const score = (importance * 3) + (projectUrgency * 2) + (clientPriority * 2) - daysLeft;

      if (score > 15) return 'Urgent';
      if (score > 10) return 'High';
      if (score > 5) return 'Medium';
      return 'Low';
  }

  /**
   * 2. Project Progress Algorithm
   */
  static calculateProjectProgress(totalTasks: number, completedTasks: number) {
      if (!totalTasks || totalTasks === 0) return 0;
      return Math.round((completedTasks / totalTasks) * 100);
  }

  /**
   * 3. Employee Productivity Score
   * score = (tasksCompleted * 2) + (projectContribution * 3) + (attendanceScore * 2) - (overdueTasks * 2)
   */
  static calculateEmployeeScore(metrics: any) {
      const { tasksCompleted = 0, projectContribution = 0, attendanceScore = 0, overdueTasks = 0 } = metrics;
      const rawScore = (tasksCompleted * 2) + (projectContribution * 3) + (attendanceScore * 2) - (overdueTasks * 2);
      return Math.max(0, Math.min(100, rawScore)); // Bound 0-100
  }

  /**
   * 4. Project Delay Detection Algorithm
   */
  static detectProjectDelay(project: any, totalTasks: number, completedTasks: number) {
      const start = new Date(project.startDate);
      const end = new Date(project.dueDate);
      const now = new Date();

      const totalDuration = end.getTime() - start.getTime();
      const timePassed = now.getTime() - start.getTime();

      if (totalDuration <= 0) return false;

      const expectedProgress = timePassed / totalDuration;
      const actualProgress = completedTasks / (totalTasks || 1);

      return actualProgress < expectedProgress;
  }

  /**
   * 5. Automatic Task Escalation Check
   */
  static shouldEscalateTask(task: any) {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      return dueDate < now && task.status !== 'Completed';
  }

  /**
   * 6. Attendance Pattern Detection
   */
  static isAttendanceIssue(lateEntriesCount: number) {
      return lateEntriesCount > 5;
  }

  /**
   * 7. Net Salary Calculation
   * Calculates dynamic daily rate and deducts for absences
   */
  static calculateNetSalary(base: number, totalWorkingDays = 22, absentDays = 0, latePenalty = 0, bonuses = 0, manualDeductions = 0) {
      const dailyRate = base / Math.max(1, totalWorkingDays);
      const absenceDeduction = absentDays * dailyRate;

      return Math.max(0, (base || 0) - absenceDeduction - latePenalty - manualDeductions + bonuses);
  }

  /**
   * 8. Smart Notification Score
   * priority: 1 (low) - 3 (high)
   * urgency: 1 (normal) - 3 (critical)
   * relevance: 1 (low) - 3 (direct)
   */
  static calculateNotificationScore(priority: number, urgency: number, relevance: number) {
      return priority * urgency * relevance;
  }

  /**
   * 9. Client Importance Ranking
   */
  static calculateClientScore(budget: number, projectCount: number, paymentSpeed: number) {
      return (budget * 2) + (projectCount * 1.5) + (paymentSpeed * 1);
  }

  /**
   * 10. Workload Score
   */
  static calculateWorkloadScore(activeTasks: number, overdueTasks: number) {
      return activeTasks + overdueTasks;
  }

  /**
   * 11. Meeting Scheduling Algorithm - Availability Matrix
   * participantsFreeSlots: Array of Arrays (each sub-array is user's free [start, end] pairs)
   */
  static findAvailableSlots(participantsFreeSlots: any[][]) {
      if (!participantsFreeSlots || participantsFreeSlots.length === 0) return [];

      // Pre-convert to Date objects for performance
      let commonSlots = participantsFreeSlots[0].map((slot: any) => [new Date(slot[0]), new Date(slot[1])]);

      for (let i = 1; i < participantsFreeSlots.length; i++) {
          let nextCommon = [];
          const userSlots = participantsFreeSlots[i].map((slot: any) => [new Date(slot[0]), new Date(slot[1])]);

          for (const common of commonSlots) {
              for (const userSlot of userSlots) {
                  const intersectStart = Math.max(common[0].getTime(), userSlot[0].getTime());
                  const intersectEnd = Math.min(common[1].getTime(), userSlot[1].getTime());

                  if (intersectStart < intersectEnd) {
                      nextCommon.push([new Date(intersectStart), new Date(intersectEnd)]);
                  }
              }
          }
          commonSlots = nextCommon;
      }

      return commonSlots;
  }

  /**
   * 15. Risk Score Algorithm for Projects
   */
  static calculateProjectRiskScore(delayDays: number, overdueTasks: number, employeeLoad: number) {
      return (delayDays * 2) + (overdueTasks * 3) + (employeeLoad * 1);
  }
}
