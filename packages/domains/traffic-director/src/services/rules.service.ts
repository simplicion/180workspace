import { prisma, requestContext } from '@workspace/db';
import { CreateTrafficRuleDTO, UpdateTrafficRuleDTO } from '../types';

const db = prisma as any;

export class TrafficRulesService {
  private static resolveCompanyId(providedCompanyId?: string): string | undefined {
    return providedCompanyId || requestContext.getStore()?.companyId;
  }

  static async getRulesByLinkId(companyId: string | undefined, linkId: string) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = { id: linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const link = await db.trafficLink.findFirst({ where });

    if (!link) {
      throw new Error('Traffic link not found or unauthorized');
    }

    const rules = await db.trafficRule.findMany({
      where: { linkId },
      orderBy: { priority: 'asc' },
      take: 100
    });

    return { rules };
  }

  static async createRule(companyId: string | undefined, data: CreateTrafficRuleDTO) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = { id: data.linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const link = await db.trafficLink.findFirst({
      where,
      include: {
        rules: {
          select: { priority: true },
          orderBy: { priority: 'desc' },
          take: 1
        }
      }
    });

    if (!link) {
      throw new Error('Traffic link not found or unauthorized');
    }

    // Determine default priority if not provided
    const nextPriority = data.priority !== undefined 
      ? data.priority 
      : (link.rules[0]?.priority !== undefined ? link.rules[0].priority + 1 : 0);

    const rule = await db.trafficRule.create({
      data: {
        linkId: data.linkId,
        name: data.name,
        priority: nextPriority,
        destinationUrl: data.destinationUrl,
        actionType: data.actionType || 'redirect_302',
        conditions: JSON.stringify(data.conditions || []),
        weight: data.weight !== undefined ? data.weight : 100,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });

    return { rule };
  }

  static async updateRule(companyId: string | undefined, ruleId: string, data: UpdateTrafficRuleDTO) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const rule = await db.trafficRule.findUnique({
      where: { id: ruleId },
      include: { link: true }
    });

    if (!rule || (effectiveCompanyId && rule.link.companyId !== effectiveCompanyId)) {
      throw new Error('Traffic rule not found or unauthorized');
    }

    const updated = await db.trafficRule.update({
      where: { id: ruleId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        priority: data.priority !== undefined ? data.priority : undefined,
        destinationUrl: data.destinationUrl !== undefined ? data.destinationUrl : undefined,
        actionType: data.actionType !== undefined ? data.actionType : undefined,
        conditions: data.conditions !== undefined ? JSON.stringify(data.conditions) : undefined,
        weight: data.weight !== undefined ? data.weight : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined
      }
    });

    return { rule: updated };
  }

  static async deleteRule(companyId: string | undefined, ruleId: string) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const rule = await db.trafficRule.findUnique({
      where: { id: ruleId },
      include: { link: true }
    });

    if (!rule || (effectiveCompanyId && rule.link.companyId !== effectiveCompanyId)) {
      throw new Error('Traffic rule not found or unauthorized');
    }

    await db.trafficRule.delete({
      where: { id: ruleId }
    });

    return { success: true };
  }

  static async reorderRules(companyId: string | undefined, linkId: string, orderedRuleIds: string[]) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = { id: linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const link = await db.trafficLink.findFirst({ where });

    if (!link) {
      throw new Error('Traffic link not found or unauthorized');
    }

    const updates = orderedRuleIds.map((ruleId, index) =>
      db.trafficRule.updateMany({
        where: { id: ruleId, linkId },
        data: { priority: index }
      })
    );

    await db.$transaction(updates);

    const rules = await db.trafficRule.findMany({
      where: { linkId },
      orderBy: { priority: 'asc' }
    });

    return { rules };
  }
}
