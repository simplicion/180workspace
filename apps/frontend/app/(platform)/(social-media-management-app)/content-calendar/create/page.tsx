'use client';


import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { contentCalendarService, CalendarConfig } from '@/lib/services/content-calendar.service';
import toast from 'react-hot-toast';
import { Sparkles, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Target, Users, Megaphone, Hash, BarChart3, Settings2, Building2, User } from 'lucide-react';
import clsx from 'clsx';
import CustomSelect from '@/components/ui/CustomSelect';
import { industriesList } from '@workspace/common';
const STEPS = [
    { id: 1, title: 'Basic Info', icon: Settings2 },
    { id: 2, title: 'Audience', icon: Users },
    { id: 3, title: 'Platforms & Time', icon: CalendarIcon },
    { id: 4, title: 'Content Strategy', icon: Target },
    { id: 5, title: 'Brand Voice', icon: Megaphone },
    { id: 6, title: 'Goals', icon: BarChart3 },
    { id: 7, title: 'Hashtags & Competitors', icon: Hash },
];

export default function CreateCalendarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const extendFrom = searchParams?.get('extendFrom');
    
    const [currentStep, setCurrentStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [config, setConfig] = useState<CalendarConfig>({
        calendarType: 'company',
        brand_name: '',
        industry: '',
        subdomain: '',
        target_audience: '',
        platforms: ['Instagram', 'LinkedIn'],
        durationWords: '1 month',
        frequency: '3x a week',
        startDate: new Date().toISOString().split('T')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        contentPillars: ['Educational', 'Promotional', 'Behind the Scenes'],
        brandVoice: 'Professional yet approachable',
        engagementGoal: 'Increase brand awareness and website traffic',
        hashtagStrategy: 'Mix of broad and niche industry tags',
        competitors: [],
    });

    const [pillarsInput, setPillarsInput] = useState(config.contentPillars.join(', '));
    const [competitorsInput, setCompetitorsInput] = useState(config.competitors.join(', '));

    // Handle Extension Mode
    useEffect(() => {
        const loadExisting = async () => {
            if (extendFrom) {
                try {
                    const { calendar } = await contentCalendarService.getCalendar(extendFrom);
                    // Map calendar back to config
                    const nextMonth = new Date(calendar.startDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    
                    setConfig({
                        calendarType: calendar.calendarType,
                        brand_name: calendar.brandName,
                        industry: calendar.industry,
                        subdomain: calendar.subdomain,
                        target_audience: calendar.targetAudience,
                        platforms: calendar.platforms,
                        durationWords: calendar.calendarDuration,
                        frequency: calendar.frequency,
                        startDate: nextMonth.toISOString().split('T')[0], // Suggest next month
                        timezone: calendar.timezone,
                        contentPillars: calendar.contentPillars,
                        brandVoice: calendar.tone,
                        engagementGoal: calendar.engagementGoal,
                        hashtagStrategy: calendar.hashtagStrategy,
                        competitors: calendar.competitors,
                    });
                    
                    setPillarsInput(calendar.contentPillars.join(', '));
                    setCompetitorsInput(calendar.competitors.join(', '));
                    // Go to Step 1 directly
                    setCurrentStep(1);
                    toast.success('Prefilled with last month\'s strategy! Just review and generate.');
                } catch (err) {
                    console.error('Failed to prefill calendar', err);
                }
            }
        };
        loadExisting();
    }, [extendFrom]);

    const handleNext = () => {
        // Sync buffers before moving
        if (currentStep === 4) {
            handleChange('contentPillars', pillarsInput.split(',').map(s => s.trim()).filter(Boolean));
        }
        if (currentStep === 7) {
            handleChange('competitors', competitorsInput.split(',').map(s => s.trim()).filter(Boolean));
        }
        if (currentStep < 7) setCurrentStep(c => c + 1);
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(c => c - 1);
        } else {
            router.push('/content-calendar');
        }
    };

    const handleChange = (field: keyof CalendarConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handlePlatformToggle = (platform: string) => {
        setConfig(prev => {
            const temp = [...prev.platforms];
            if (temp.includes(platform)) {
                return { ...prev, platforms: temp.filter(p => p !== platform) };
            } else {
                return { ...prev, platforms: [...temp, platform] };
            }
        });
    };

    const handleSubmit = async () => {
        // Final sync for step 7 competitors
        const finalCompetitors = competitorsInput.split(',').map(s => s.trim()).filter(Boolean);
        const finalConfig = { ...config, competitors: finalCompetitors };
        
        setIsGenerating(true);
        try {
            const res = await contentCalendarService.createCalendar(finalConfig);
            toast.success('Calendar generated successfully!');
            router.push(`/content-calendar/${res.calendar_id}`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to generate calendar');
        } finally {
            setIsGenerating(false);
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 0: return true;
            case 1: return !!config.brand_name && !!config.industry;
            case 2: return !!config.target_audience;
            case 3: return config.platforms.length > 0 && !!config.startDate;
            case 4: return pillarsInput.trim().length > 0;
            case 5: return !!config.brandVoice;
            case 6: return !!config.engagementGoal;
            case 7: return true; 
            default: return true;
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Premium Generation Overlay */}
            {isGenerating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-xl transition-all duration-500 animate-in fade-in">
                    <div className="text-center space-y-8 max-w-md px-6">
                        <div className="relative">
                            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30 animate-pulse">
                                <Sparkles className="w-12 h-12 text-white animate-bounce" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Crafting Your Strategy...</h2>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                Our AI is analyzing your brand, audience, and industry trends to build a viral content calendar.
                            </p>
                        </div>
                        <div className="flex justify-center gap-1.5">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
            )}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                    AI Content Calendar Creator
                </h1>
                <p className="text-gray-500 mt-2">Configure your brand details and let AI generate a complete content strategy.</p>
            </div>

            {/* Stepper */}
            {currentStep !== 0 && (
                <div className="mb-8 flex justify-between items-center relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full -z-10"></div>
                    <div 
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full -z-10 transition-all duration-300`}
                        aria-hidden="true"
                        ref={(el) => { if (el) el.style.width = `${((Math.max(0, currentStep - 1)) / (STEPS.length - 1)) * 100}%`; }}
                    ></div>
                    
                    {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                                isActive ? "border-indigo-600 bg-indigo-50 text-indigo-600" :
                                isCompleted ? "border-indigo-600 bg-indigo-600 text-white" :
                                "border-gray-200 bg-white text-gray-400"
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={clsx(
                                "text-xs font-medium hidden md:block",
                                isActive || isCompleted ? "text-gray-900" : "text-gray-400"
                            )}>{step.title}</span>
                        </div>
                    );
                })}
                </div>
            )}

            <div className={clsx(
                "card p-8 min-h-[400px] transition-all duration-500",
                isGenerating && "opacity-0 scale-95 pointer-events-none"
            )}>
                {/* Step 0: Type Selection */}
                {currentStep === 0 && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-gray-900">What are we building today?</h2>
                            <p className="text-gray-500">Choose the workspace context to customize your AI generation.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => { handleChange('calendarType', 'company'); setCurrentStep(1); }}
                                className={clsx(
                                    "group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10",
                                    config.calendarType === 'company' ? "border-indigo-600 bg-indigo-50/30" : "border-gray-100 bg-white hover:border-indigo-200"
                                )}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Corporate / Company</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Ideal for multi-person teams, marketing campaigns, and brand initiatives. Focuses on ROI, professional voice, and corporate pillars.
                                </p>
                                <div className="mt-6 flex items-center text-indigo-600 font-bold text-sm">
                                    Select Mode <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            <button
                                onClick={() => { handleChange('calendarType', 'personal'); setCurrentStep(1); }}
                                className={clsx(
                                    "group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10",
                                    config.calendarType === 'personal' ? "border-violet-600 bg-violet-50/30" : "border-gray-100 bg-white hover:border-violet-200"
                                )}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform">
                                    <User className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Personal / Individual</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Perfect for solopreneurs, influencers, and personal branding. Focuses on growth, community, and authentic human voice.
                                </p>
                                <div className="mt-6 flex items-center text-violet-600 font-bold text-sm">
                                    Select Mode <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">1. Basic Information</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {config.calendarType === 'company' ? 'Brand / Company Name' : 'Personal Brand / Name'} <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                className="input" 
                                value={config.brand_name} 
                                onChange={(e) => handleChange('brand_name', e.target.value)}
                                placeholder={config.calendarType === 'company' ? 'e.g. Acme Corp' : 'e.g. John Doe / TechTips'} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {config.calendarType === 'company' ? 'Industry / Niche' : 'Area of Expertise'} <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect 
                                className="input" 
                                value={config.industry} 
                                onChange={(e: any) => handleChange('industry', e.target.value)}
                            >
                                <option value="">Select Industry</option>
                                {industriesList.map(industry => (
                                    <option key={industry} value={industry}>{industry}</option>
                                ))}
                            </CustomSelect>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {config.calendarType === 'company' ? 'Subdomain/Product (Optional)' : 'Main Focus / Website (Optional)'}
                            </label>
                            <input 
                                type="text" 
                                className="input" 
                                value={config.subdomain} 
                                onChange={(e) => handleChange('subdomain', e.target.value)}
                                placeholder={config.calendarType === 'company' ? 'Specific product or service line' : 'Personal portfolio or main niche focus'} 
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Target Audience */}
                {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">2. Target Audience</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {config.calendarType === 'company' ? 'Describe Your Ideal Market Segment' : 'Describe Your Ideal Community / Followers'} <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                {config.calendarType === 'company' 
                                    ? 'Include demographics, psychographics, and industry pain points.' 
                                    : 'Who are they? What do they care about? Why do they follow you?'}
                            </p>
                            <textarea 
                                className="input min-h-[150px]" 
                                value={config.target_audience} 
                                onChange={(e) => handleChange('target_audience', e.target.value)}
                                placeholder={config.calendarType === 'company' 
                                    ? "e.g. Marketing managers at mid-sized tech companies struggling to prove ROI..." 
                                    : "e.g. Aspiring UI/UX designers looking for practical portfolio tips and career advice..."} 
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Platforms & Time */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">3. Platforms & Schedule</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Target Platforms <span className="text-red-500">*</span></label>
                            <div className="flex flex-wrap gap-3">
                                {['Instagram', 'LinkedIn', 'Twitter/X', 'Facebook', 'TikTok', 'YouTube Shorts'].map(platform => (
                                    <button
                                        key={platform}
                                        onClick={() => handlePlatformToggle(platform)}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                                            config.platforms.includes(platform) 
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                        )}
                                    >
                                        {platform}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration <span className="text-red-500">*</span></label>
                                <CustomSelect className="select" title="Calendar duration" value={config.durationWords} onChange={(e) => handleChange('durationWords', e.target.value)}>
                                    <option value="1 week">1 week</option>
                                    <option value="2 weeks">2 weeks</option>
                                    <option value="1 month">1 month</option>
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Posting Frequency <span className="text-red-500">*</span></label>
                                <CustomSelect className="select" title="Posting frequency" value={config.frequency} onChange={(e) => handleChange('frequency', e.target.value)}>
                                    <option value="1x a week">1x a week</option>
                                    <option value="3x a week">3x a week</option>
                                    <option value="5x a week">5x a week</option>
                                    <option value="Daily">Daily</option>
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    className="input" 
                                    title="Calendar start date"
                                    placeholder="YYYY-MM-DD"
                                    value={config.startDate} 
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                <input 
                                    type="text" 
                                    className="input bg-gray-50" 
                                    title="Detected timezone"
                                    placeholder="Timezone"
                                    value={config.timezone} 
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Content Strategy */}
                {currentStep === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">4. Content Strategy</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content Pillars <span className="text-red-500">*</span></label>
                            <p className="text-xs text-gray-500 mb-2">
                                {config.calendarType === 'company' 
                                    ? 'Comma separated themes your brand talks about.' 
                                    : 'Topics you want to be known for (comma separated).'}
                            </p>
                            <input 
                                type="text" 
                                className="input font-medium" 
                                value={pillarsInput} 
                                onChange={(e) => setPillarsInput(e.target.value)}
                                onBlur={() => handleChange('contentPillars', pillarsInput.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder={config.calendarType === 'company' 
                                    ? "e.g. Educational, Culture, Product Updates" 
                                    : "e.g. Design Tutorials, Career Growth, Personal Journey"} 
                            />
                        </div>
                    </div>
                )}

                {/* Step 5: Brand Voice */}
                {currentStep === 5 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">5. {config.calendarType === 'company' ? 'Brand Voice' : 'Personal Voice'}</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tone of Voice <span className="text-red-500">*</span></label>
                            <textarea 
                                className="input min-h-[100px]" 
                                value={config.brandVoice} 
                                onChange={(e) => handleChange('brandVoice', e.target.value)}
                                placeholder={config.calendarType === 'company' 
                                    ? "e.g. Witty and conversational, or Professional and authoritative" 
                                    : "e.g. Relatable and helpful, or Spicy and controversial"} 
                            />
                        </div>
                    </div>
                )}

                {/* Step 6: Goals */}
                {currentStep === 6 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">6. Primary Goals</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Goal <span className="text-red-500">*</span></label>
                            <textarea 
                                className="input min-h-[100px]" 
                                value={config.engagementGoal} 
                                onChange={(e) => handleChange('engagementGoal', e.target.value)}
                                placeholder={config.calendarType === 'company' 
                                    ? "e.g. Drive webinar signups, Increase comments, Build thought leadership" 
                                    : "e.g. Get 100 new followers/week, Build personal authority, Net working connections"} 
                            />
                        </div>

                        {config.calendarType === 'company' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Budget / Resources (Optional)</label>
                                <input 
                                    type="text" 
                                    className="input" 
                                    value={config.marketingBudget || ''} 
                                    onChange={(e) => handleChange('marketingBudget', e.target.value)}
                                    placeholder="e.g. $500/month for ads, Internal design team available" 
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Individual Focus / Growth Milestones (Optional)</label>
                                <input 
                                    type="text" 
                                    className="input" 
                                    value={config.personalGoals || ''} 
                                    onChange={(e) => handleChange('personalGoals', e.target.value)}
                                    placeholder="e.g. Launch a newsletter, Reach 5k followers, Consistently post for 30 days" 
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Step 7: Hashtags & Competitors */}
                {currentStep === 7 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold mb-4">7. Hashtags & Competitors (Optional)</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtag Strategy</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={config.hashtagStrategy} 
                                onChange={(e) => handleChange('hashtagStrategy', e.target.value)}
                                placeholder="e.g. Focus on niche B2B tags, or Broad lifestyle tags" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Competitors to Analyze</label>
                            <p className="text-xs text-gray-500 mb-2">Comma separated list of competitors.</p>
                            <input 
                                type="text" 
                                className="input font-medium" 
                                value={competitorsInput} 
                                onChange={(e) => setCompetitorsInput(e.target.value)}
                                onBlur={() => handleChange('competitors', competitorsInput.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="e.g. CompetitorA, CompetitorB" 
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8 border-t border-gray-200 pt-6">
                <button 
                    className="btn px-6 hover:bg-gray-50 transition-colors" 
                    onClick={handlePrev}
                    disabled={isGenerating}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                
                {currentStep < 7 ? (
                    <button 
                        className="btn-primary px-6" 
                        onClick={handleNext}
                        disabled={!isStepValid()}
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                ) : (
                    <button type="submit" 
                        className="btn-primary px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1 active:translate-y-0" 
                        
                        disabled={!isStepValid() || isGenerating}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Calendar
                    </button>
                )}
            </div>
        </div>
    );
}
