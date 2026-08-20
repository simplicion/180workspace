'use strict';
const { ExpenseService } = require('@workspace/finance');

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await ExpenseService.getExpenses(req.user.companyId, req.user);

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
    const expense = await ExpenseService.getExpenseById(req.user.companyId, req.params.id);

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
    const expense = await ExpenseService.createExpense(req.user.companyId, req.user, req.body);

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
    const updatedExpense = await ExpenseService.approveClaim(req.user.companyId, req.user, req.params.id, req.body.reviewNote);

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
    
    const updatedExpense = await ExpenseService.updateStatus(req.user.companyId, id, status, reviewNote);

    res.status(200).json({
      status: 'success',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};
