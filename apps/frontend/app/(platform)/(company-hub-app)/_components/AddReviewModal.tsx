"use client";

import React, { useState } from "react";
import { X, Star, CheckCircle2, AlertCircle, ShieldAlert, User, Mail, Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { useAddCompanyReviewMutation } from "../../../../redux/api/companyApi";
import toast from "react-hot-toast";

interface AddReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName?: string;
  onReviewSubmitted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Exceptional",
};

export function AddReviewModal({
  isOpen,
  onClose,
  companyId,
  companyName = "Company",
  onReviewSubmitted,
}: AddReviewModalProps) {
  const currentUser = useSelector((state: any) => state.auth?.user);

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [error, setError] = useState("");

  const [addReview, { isLoading }] = useAddCompanyReviewMutation();

  if (!isOpen) return null;

  // Check if current user is an employee/member of this company
  const isCompanyMember = Boolean(
    currentUser && (currentUser.companyId === companyId || currentUser.company?.id === companyId)
  );

  const isVerifiedUser = Boolean(currentUser && !isCompanyMember);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isCompanyMember) {
      setError("Company members and employees cannot submit reviews for their own company.");
      return;
    }

    if (rating === 0) {
      setError("Please select a star rating between 1 and 5.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide a review title.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide your review details.");
      return;
    }

    if (!isVerifiedUser && !reviewerName.trim()) {
      setError("Please enter your name as a guest reviewer.");
      return;
    }

    try {
      await addReview({
        companyId,
        data: {
          rating,
          title: title.trim(),
          description: description.trim(),
          reviewerName: isVerifiedUser ? currentUser.name : reviewerName.trim(),
          reviewerEmail: isVerifiedUser ? currentUser.email : reviewerEmail.trim() || undefined,
        },
      }).unwrap();

      toast.success(
        isVerifiedUser
          ? "Verified review submitted successfully!"
          : "Review submitted successfully as guest!"
      );
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      onClose();
      // Reset form
      setRating(0);
      setTitle("");
      setDescription("");
      setReviewerName("");
      setReviewerEmail("");
    } catch (err: any) {
      console.error("Failed to submit review:", err);
      setError(err?.data?.message || err?.message || "Failed to submit review. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500 fill-yellow-500" />
              Add Review for {companyName}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Share your honest feedback and experience with the community.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form id="add-review-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Same-Company Member Warning */}
          {isCompanyMember && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-xl flex items-start space-x-2.5 shadow-xs">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Self-Review Restriction</p>
                <p className="mt-0.5 text-amber-700">
                  You are registered as a member/employee of <strong>{companyName}</strong>. Platform integrity guidelines do not allow internal company members to review their own organization.
                </p>
              </div>
            </div>
          )}

          {/* Verification Status Banner */}
          {!isCompanyMember && isVerifiedUser && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center space-x-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Posting as <strong className="text-emerald-900">{currentUser.name || currentUser.email}</strong>
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Verified Review
              </span>
            </div>
          )}

          {!isCompanyMember && !isVerifiedUser && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center space-x-2 text-gray-700">
                <User className="w-4 h-4 text-gray-500 shrink-0" />
                <span>Submitting as a guest reviewer</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-700">
                Unverified Review
              </span>
            </div>
          )}

          {/* Guest User Inputs */}
          {!isVerifiedUser && !isCompanyMember && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Your Email (Optional)
                </label>
                <input
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Star Rating Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isCompanyMember}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 focus:outline-hidden hover:scale-115 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-xs"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              {(hoveredRating || rating) > 0 && (
                <span className="ml-2.5 text-xs font-semibold text-gray-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-lg">
                  {RATING_LABELS[hoveredRating || rating]}
                </span>
              )}
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Review Title / Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={isCompanyMember}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Exceptional product quality and collaborative culture"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:opacity-60"
              required
            />
          </div>

          {/* Review Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Review Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              disabled={isCompanyMember}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Share details about project delivery, communication, services, or overall experience..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none disabled:bg-gray-100 disabled:opacity-60"
              required
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-review-form"
            disabled={isLoading || isCompanyMember}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
