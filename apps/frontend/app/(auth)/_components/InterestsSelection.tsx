import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const INTERESTS = [
    'AI', 'SaaS', 'FinTech', 'HealthTech', 'EdTech', 
    'Climate', 'Robotics', 'E-commerce', 'Blockchain', 
    'Marketing', 'Sales', 'Design', 'No-Code', 
    'Fundraising', 'Growth', 'HR', 'Product'
];

export default function InterestsSelection({ 
    onSubmit,
    isSubmitting,
    onBack
}: { 
    onSubmit: (interests: string[]) => void;
    isSubmitting: boolean;
    onBack?: () => void;
}) {
    const [selected, setSelected] = useState<string[]>([]);

    const toggleInterest = (interest: string) => {
        if (selected.includes(interest)) {
            setSelected(selected.filter(i => i !== interest));
        } else {
            setSelected([...selected, interest]);
        }
    };

    const isValid = selected.length >= 5;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl mx-auto relative">
            {onBack && (
                <button 
                    type="button"
                    onClick={onBack}
                    className="mb-6 flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium z-10"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </button>
            )}
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">What are you interested in?</h3>
                <p className="text-gray-500 text-sm flex items-center justify-center flex-wrap gap-1">
                    Select at least 5 topics to personalize your <img src="/black text logo.svg" alt="180workspace" className="h-4" /> experience.
                </p>
                <div className="mt-2 font-bold text-sm">
                    <span className={isValid ? "text-green-600" : "text-blue-600"}>
                        {selected.length} / 5 selected
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
                {INTERESTS.map(interest => {
                    const isSelected = selected.includes(interest);
                    return (
                        <button
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                                isSelected 
                                ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            {isSelected && <Check className="w-4 h-4" />}
                            {interest}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => isValid && onSubmit(selected)}
                disabled={!isValid || isSubmitting}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <LogoLoader className="w-5 h-5 animate-spin" /> : null}
                Complete Setup
            </button>
        </motion.div>
    );
}
