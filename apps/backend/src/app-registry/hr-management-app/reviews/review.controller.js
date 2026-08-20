const { prisma } = require('@workspace/db');
﻿'use strict';

const PerformanceService = require('../hr/performance.service.js');

exports.getReviews = async (req, res, next) => {
    try {
        const Review = prisma.review;
        const { employeeId, managerId, status } = req.query;
        let query = { companyId: req.user.companyId };

        if (req.user.role === 'employee' && (!req.user.permissions || !req.user.permissions.includes('can_manage_team'))) {
            query.employeeId = req.user.id;
        } else if (req.user.permissions && req.user.permissions.includes('can_manage_team')) {
            query.OR = [{ managerId: req.user.id }, { employeeId: req.user.id }];
        } else {
            if (employeeId) query.employeeId = employeeId;
            if (managerId) query.managerId = managerId;
        }

        if (status) query.status = status;

        const reviews = await Review.findMany({
            where: query,
            include: {
                employee: { select: { name: true, email: true, department: true, role: true } },
                manager: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ reviews });
    } catch (error) { next(error); }
};

exports.getReviewById = async (req, res, next) => {
    try {
        const Review = prisma.review;
        const userId = req.user.id;
        const review = await Review.findUnique({ 
            where: { id: req.params.id },
            include: {
                employee: { select: { id: true, name: true, department: true } },
                manager: { select: { name: true } }
            }
        });

        if (!review || review.companyId !== req.user.companyId) return res.status(404).json({ error: 'Review not found' });

        if (req.user.role === 'employee' && review.employee.id !== userId) {
            return res.status(403).json({ error: 'Not authorized to view this review' });
        }
        res.json({ review });
    } catch (error) { next(error); }
};

exports.getPerformanceInsights = async (req, res, next) => {
    try {
        const { employeeId, period } = req.query;
        if (!employeeId || !period) {
            return res.status(400).json({ error: 'employeeId and period are required' });
        }

        const insights = await PerformanceService.getPerformanceInsights(employeeId, period);
        res.json({ insights });
    } catch (error) { next(error); }
};

exports.createReview = async (req, res, next) => {
    try {
        const Review = prisma.review;
        if (!['admin', 'hr', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { employeeId, period, dueDate, managerId } = req.body;

        const exists = await Review.findFirst({ where: { employeeId, period, companyId: req.user.companyId } });
        if (exists) return res.status(400).json({ error: `Review for period ${period} already exists for this employee` });

        // Fetch performance snapshot
        const performanceSnapshot = await PerformanceService.getPerformanceInsights(employeeId, period);

        const review = await Review.create({ data: {
            employeeId,
            period,
            dueDate,
            managerId: managerId || (req.user.id),
            companyId: req.user.companyId,
            performanceSnapshot
        } });

        res.status(201).json({ review });
    } catch (error) { next(error); }
};

exports.submitSelfEvaluation = async (req, res, next) => {
    try {
        const Review = prisma.review;
        const userId = req.user.id;
        const review = await Review.findUnique({ where: { id: req.params.id } });
        
        if (!review || review.companyId !== req.user.companyId) return res.status(404).json({ error: 'Review not found' });
        if (review.employeeId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { selfRatings, selfSummary } = req.body;

        const updatedReview = await Review.update({
            where: { id: req.params.id },
            data: {
                selfRatings: selfRatings || review.selfRatings,
                selfSummary: selfSummary || review.selfSummary,
                status: 'manager_eval_pending',
                selfSubmittedAt: new Date()
            }
        });
        
        res.json({ review: updatedReview });
    } catch (error) { next(error); }
};

exports.submitManagerEvaluation = async (req, res, next) => {
    try {
        const Review = prisma.review;
        const userId = req.user.id;
        const review = await Review.findUnique({ where: { id: req.params.id } });
        
        if (!review || review.companyId !== req.user.companyId) return res.status(404).json({ error: 'Review not found' });

        if (review.managerId !== userId && !['admin', 'hr'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { managerRatings, managerSummary, overallRating, nextPeriodGoals } = req.body;

        const updatedReview = await Review.update({
            where: { id: req.params.id },
            data: {
                managerRatings: managerRatings || review.managerRatings,
                managerSummary: managerSummary || review.managerSummary,
                overallRating: overallRating || review.overallRating,
                nextPeriodGoals: nextPeriodGoals || review.nextPeriodGoals,
                status: 'complete',
                managerSubmittedAt: new Date()
            }
        });
        
        res.json({ review: updatedReview });
    } catch (error) { next(error); }
};

exports.deleteReview = async (req, res, next) => {
    try {
        const Review = prisma.review;
        const review = await Review.findUnique({ where: { id: req.params.id } });
        if (!review || review.companyId !== req.user.companyId) return res.status(404).json({ error: 'Review not found' });
        
        await Review.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { next(error); }
};
