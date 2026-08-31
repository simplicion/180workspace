'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Block, updateBlock } from '../../../../../../redux/slices/documentSlice';
import { CheckCircle2, XCircle, AlertCircle, MessageSquare, ShieldCheck, UserCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ApprovalButtonBlockProps {
  block: Block;
  isSelected: boolean;
  isPublicView?: boolean;
  token?: string;
  onDecisionSubmitted?: (decision: any) => void;
}

export function ApprovalButtonBlock({ 
  block, 
  isSelected, 
  isPublicView = false, 
  token,
  onDecisionSubmitted 
}: ApprovalButtonBlockProps) {
  const dispatch = useDispatch();
  const documentDetails = useSelector((state: any) => state.document?.documentDetails);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'accept' | 'decline'>('accept');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerRole, setReviewerRole] = useState(block.content?.reviewerRole || 'Senior Reviewer');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const content = block.content || {};
  const decision = content.decision || null;

  const title = content.title || 'Document Approval & Sign-Off';
  const description = content.description || 'Please review the terms, milestones, and deliverables outlined above to approve or request revisions.';
  const acceptLabel = content.acceptLabel || 'Accept & Approve';
  const declineLabel = content.declineLabel || 'Decline / Request Changes';
  const requireReason = content.requireReason !== false;

  const handleOpenDecisionModal = (action: 'accept' | 'decline') => {
    setModalAction(action);
    setReason('');
    setNote('');
    setIsModalOpen(true);
  };

  const handleSubmitDecision = async () => {
    if (!reviewerName.trim()) {
      return toast.error('Please enter your full name');
    }
    if (modalAction === 'decline' && requireReason && !reason.trim()) {
      return toast.error('Please provide the reason for declining or requested changes');
    }

    const payload = {
      action: modalAction,
      reviewerName: reviewerName.trim(),
      reviewerRole: reviewerRole.trim(),
      reason: modalAction === 'decline' ? reason.trim() : undefined,
      note: modalAction === 'accept' ? note.trim() : undefined,
      timestamp: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      if (token) {
        // Public token submission
        await api.post(`/api/p/document/${token}/decision`, payload);
        toast.success(modalAction === 'accept' ? 'Document approved successfully!' : 'Decline response & reason recorded!');
      } else {
        // Internal editor state update
        dispatch(updateBlock({
          id: block.id,
          updates: {
            content: {
              ...content,
              decision: {
                status: modalAction === 'accept' ? 'approved' : 'declined',
                ...payload
              }
            }
          }
        }));
        toast.success(modalAction === 'accept' ? 'Simulated Approval!' : 'Simulated Decline with Reason recorded!');
      }

      setIsModalOpen(false);
      if (onDecisionSubmitted) onDecisionSubmitted(payload);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full my-4">
      {decision ? (
        // Recorded Decision Card
        <div className={`p-5 rounded-2xl border transition-all ${
          decision.status === 'approved' 
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-200 text-emerald-950 shadow-sm' 
            : 'bg-gradient-to-r from-rose-50 to-amber-50/60 border-rose-200 text-rose-950 shadow-sm'
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                decision.status === 'approved' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {decision.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  {decision.status === 'approved' ? 'Document Approved & Accepted' : 'Document Declined / Changes Requested'}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    decision.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {decision.reviewerRole || 'Reviewer'}
                  </span>
                </h4>
                <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                  Reviewed by <span className="font-semibold text-gray-800">{decision.reviewerName}</span>
                  <span className="text-gray-400">•</span>
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(decision.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {!isPublicView && (
              <button
                type="button"
                onClick={() => dispatch(updateBlock({ id: block.id, updates: { content: { ...content, decision: null } } }))}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white/80 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-white transition-colors"
              >
                Reset Decision
              </button>
            )}
          </div>

          {/* Decision Notes / Decline Reason */}
          {decision.reason && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-white/90 border border-rose-200/80">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
                Reason for Declining / Revision Requests:
              </span>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                "{decision.reason}"
              </p>
            </div>
          )}

          {decision.note && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-white/90 border border-emerald-200/80">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Approval Note:
              </span>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                "{decision.note}"
              </p>
            </div>
          )}
        </div>
      ) : (
        // Pending Decision Action Buttons
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-gray-900">{title}</h4>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenDecisionModal('accept')}
              className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> {acceptLabel}
            </button>
            <button
              type="button"
              onClick={() => handleOpenDecisionModal('decline')}
              className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-600" /> {declineLabel}
            </button>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                modalAction === 'accept' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {modalAction === 'accept' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {modalAction === 'accept' ? 'Confirm Document Approval' : 'Decline / Request Revisions'}
                </h3>
                <p className="text-xs text-gray-500">
                  {modalAction === 'accept' ? 'Sign off and approve this document.' : 'Specify why this document is being declined.'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Your Full Name *</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={e => setReviewerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Your Role / Designation</label>
                <input
                  type="text"
                  value={reviewerRole}
                  onChange={e => setReviewerRole(e.target.value)}
                  placeholder="e.g. Senior Architect / Project Lead"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {modalAction === 'decline' ? (
                <div>
                  <label className="text-xs font-bold text-rose-700 block mb-1">
                    Reason for Declining / Revision Requests *
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Budget exceeds approved project quota, please adjust Milestone 2 delivery date..."
                    className="w-full px-3 py-2 border border-rose-200 bg-rose-50/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">This feedback will be attached to the document for the author to review.</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Approval Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. Scope looks great, approved to proceed!"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={isSubmitting}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  modalAction === 'accept' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {isSubmitting ? 'Submitting...' : modalAction === 'accept' ? 'Confirm Approval' : 'Submit Decline Reason'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
