'use client';

import { Check, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@workspace/ui';
import { motion } from 'framer-motion';

export interface PlanProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currencySymbol: string;
  features: string[];
  isPopular?: boolean;
  onSelect?: (planId: string) => void;
  isLoading?: boolean;
  isSelected?: boolean;
  buttonText?: string;
  badgeText?: string;
  theme?: 'indigo' | 'violet';
  buttonVariant?: 'primary' | 'danger' | 'disabled';
}

const THEME_CLASSES = {
  indigo: {
    borderActive: "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] shadow-indigo-100",
    borderHover: "hover:border-indigo-300",
    badgeBg: "bg-indigo-500",
    titleActive: "text-indigo-600",
    iconBgActive: "bg-indigo-100 text-indigo-600",
    btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg shadow-indigo-200",
    btnSecondary: "bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200"
  },
  violet: {
    borderActive: "border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.25)] shadow-violet-200",
    borderHover: "hover:border-violet-300",
    badgeBg: "bg-violet-600",
    titleActive: "text-violet-600",
    iconBgActive: "bg-violet-100 text-violet-600",
    btnPrimary: "bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg shadow-violet-200",
    btnSecondary: "bg-white hover:bg-violet-50 text-violet-600 border border-violet-200"
  }
};

export function SubscriptionPlan({
  id,
  name,
  description,
  price,
  currencySymbol,
  features,
  isPopular,
  onSelect,
  isLoading,
  isSelected,
  buttonText = "Select Plan",
  badgeText,
  theme = 'indigo',
  buttonVariant = 'primary'
}: PlanProps) {
  const styles = THEME_CLASSES[theme] || THEME_CLASSES.indigo;

  return (
    <motion.div
      whileHover={!isLoading ? { y: -5 } : undefined}
      onClick={() => {
        if (!isLoading && onSelect) {
          onSelect(id);
        }
      }}
      className={clsx(
        "relative rounded-2xl flex flex-col p-6 transition-all duration-300",
        onSelect && !isLoading && "cursor-pointer",
        isLoading && "opacity-70 pointer-events-none",
        // transparent bg and border
        "bg-transparent border",
        isPopular || isSelected
          ? styles.borderActive
          : `border-gray-200 ${styles.borderHover}`
      )}
    >
      {(isPopular || badgeText || isLoading) && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          {isLoading ? (
            <span className={clsx(styles.badgeBg, "text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-2")}>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing
            </span>
          ) : (
            <span className={clsx(styles.badgeBg, "text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-1")}>
              {badgeText || "Most Popular"}
            </span>
          )}
        </div>
      )}

      <div className="mb-4">
        <h3 className={clsx("text-xl font-bold", isPopular || isSelected ? styles.titleActive : "text-gray-900")}>
          {name}
        </h3>
        <p className="text-gray-500 text-sm mt-2">{description}</p>
      </div>

      <div className="my-6">
        <span className="text-4xl font-extrabold text-gray-900">{currencySymbol}{price}</span>
        <span className="text-gray-500 font-medium">/mo</span>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <div className={clsx(
              "rounded-full p-1 mt-0.5",
              isPopular || isSelected ? styles.iconBgActive : "bg-gray-100 text-gray-500"
            )}>
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
            <span className="text-gray-600 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        <button
          disabled={buttonVariant === 'disabled'}
          className={clsx(
            "w-full py-3 rounded-xl font-semibold transition-all duration-300",
            buttonVariant === 'disabled' 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
              : buttonVariant === 'danger'
                ? "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm"
                : isSelected ? styles.btnSecondary : styles.btnPrimary
          )}
        >
          {buttonText}
        </button>
      </div>
    </motion.div>
  );
}
