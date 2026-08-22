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
}

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
  buttonText = "Select Plan"
}: PlanProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={clsx(
        "relative rounded-2xl flex flex-col p-6 transition-all duration-300",
        // Using indigo theme, transparent bg, and indigo border
        "bg-transparent border",
        isPopular || isSelected
          ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] shadow-indigo-100"
          : "border-gray-200 hover:border-indigo-300"
      )}
    >
      {isPopular && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          <span className="bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className={clsx("text-xl font-bold", isPopular || isSelected ? "text-indigo-600" : "text-gray-900")}>
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
              isPopular || isSelected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
            )}>
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
            <span className="text-gray-600 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {onSelect && (
        <Button
          onClick={() => onSelect(id)}
          disabled={isLoading}
          className={clsx(
            "w-full py-6 rounded-xl font-semibold transition-all",
            isPopular || isSelected
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg shadow-indigo-200"
              : "bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200"
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            buttonText
          )}
        </Button>
      )}
    </motion.div>
  );
}
