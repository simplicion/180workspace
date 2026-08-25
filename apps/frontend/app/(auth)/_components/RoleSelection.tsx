import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, GraduationCap, Briefcase, Lightbulb, UserCheck, Handshake } from 'lucide-react';

const USER_PERSONAS = [
    { id: 'Student / Job Seeker', label: 'Student / Job Seeker', icon: GraduationCap },
    { id: 'Founder', label: 'Founder', icon: Lightbulb },
    { id: 'Investor', label: 'Investor', icon: Briefcase },
    { id: 'Mentor', label: 'Mentor', icon: UserCheck },
    { id: 'Service Provider', label: 'Service Provider', icon: Handshake },
];

export default function RoleSelection({ 
    onSelect,
    onBack
}: { 
    onSelect: (role: string, headline?: string) => void;
    onBack?: () => void;
}) {
    const [selectedIntent, setSelectedIntent] = useState<'ADMIN' | 'USER' | null>(null);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl mx-auto">
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                    How do you want to use <img src="/black text logo.svg" alt="180workspace" className="h-6" />?
                </h3>
                <p className="text-gray-500 text-sm">Select your primary goal to personalize your experience.</p>
            </div>

            <AnimatePresence mode="wait">
                {!selectedIntent ? (
                    <motion.div 
                        key="intent-selection"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <button
                            onClick={() => onSelect('ADMIN')}
                            className="w-full flex items-center gap-5 p-5 text-left border border-gray-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50/50 transition-all group"
                        >
                            <div className="p-4 bg-gray-100 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <Building2 className="w-7 h-7 text-gray-500 group-hover:text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">Manage my Startup / Company</h4>
                                <p className="text-sm text-gray-500 mt-1">Set up a workspace, manage employees, and access 180workspace tools.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setSelectedIntent('USER')}
                            className="w-full flex items-center gap-5 p-5 text-left border border-gray-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50/50 transition-all group"
                        >
                            <div className="p-4 bg-gray-100 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <Users className="w-7 h-7 text-gray-500 group-hover:text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">Network, pitch ideas, or find jobs</h4>
                                <p className="text-sm text-gray-500 mt-1">Join the community, connect with others, and discover opportunities.</p>
                            </div>
                        </button>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="persona-selection"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <button 
                            onClick={() => setSelectedIntent(null)}
                            className="text-sm text-gray-500 hover:text-gray-800 mb-2 block"
                        >
                            &larr; Back
                        </button>
                        <h4 className="font-bold text-gray-900 mb-4">Which best describes you?</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {USER_PERSONAS.map((persona) => {
                                const Icon = persona.icon;
                                return (
                                    <button
                                        key={persona.id}
                                        onClick={() => onSelect('USER', persona.id)}
                                        className="flex items-center gap-3 p-3 text-left border border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100">
                                            <Icon className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                                        </div>
                                        <span className="font-semibold text-gray-800 group-hover:text-blue-700">{persona.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
