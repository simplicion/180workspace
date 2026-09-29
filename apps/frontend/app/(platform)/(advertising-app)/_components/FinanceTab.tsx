"use client";
import React from 'react';
import { ExternalLink, TrendingUp, DollarSign, Trophy, CheckCircle2, Activity } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { EditWhyInvestorsFollowUsModal } from './EditWhyInvestorsFollowUsModal';

interface TabProps {
    company: any;
    isPublicView?: boolean;
    onProfileUpdate?: () => void;
}

// Custom icon for Sequoia
function LeafIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export function FinanceTab({ company, isPublicView = false, onProfileUpdate }: TabProps) {
    const { company: settingsCompany } = useSettings();
    const currencySymbol = settingsCompany?.currencySymbol || '$';
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

    let meta: any = {};
    try { meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {}); } catch(e) {}
    const highlights = company.companyHighlights && company.companyHighlights.length > 0 ? company.companyHighlights : (meta.companyHighlights || []);
    const pitchDeckUrl = meta.pitchDeckUrl || "";

    const investors = company.investors?.length > 0 ? company.investors : [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Financials & Funding */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Real-Time Operations Data */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center mb-1">
                        <Activity className="h-5 w-5 text-indigo-600 mr-2" />
                        <h3 className="text-lg font-bold text-gray-900">Platform Activity</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">Real-time system data</p>
                    
                    <div className="grid grid-cols-2 gap-y-6">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Business Status</div>
                            <div className={`font-bold text-lg ${company.calculatedFinancials?.businessStatus === 'Profitable' ? 'text-indigo-700' : 'text-orange-600'}`}>
                                {company.calculatedFinancials?.businessStatus || 'Not provided'}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Burn Rate</div>
                            <div className="font-bold text-gray-900 text-lg">{currencySymbol}{company.calculatedFinancials?.burnRate || '0.00'}/mo</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Total Income</div>
                            <div className="font-bold text-gray-900 text-lg">{currencySymbol}{company.calculatedFinancials?.totalIncome?.toLocaleString() || '0'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Total Expenses</div>
                            <div className="font-bold text-gray-900 text-lg">{currencySymbol}{company.calculatedFinancials?.totalExpenses?.toLocaleString() || '0'}</div>
                        </div>
                    </div>
                </div>

                {/* Reported Financials */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center mb-1">
                        <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="text-lg font-bold text-gray-900">Reported Financials</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">Company reported metrics</p>
                    
                    <div className="grid grid-cols-2 gap-y-6">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Annual Revenue</div>
                            <div className="font-bold text-gray-900 text-lg truncate" title={company.annualRevenue || 'Not provided'}>{company.annualRevenue || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Revenue Growth</div>
                            <div className="font-bold text-gray-900 text-lg truncate">{company.revenueGrowth || 'Not provided'}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">YoY</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Burn Rate</div>
                            <div className="font-bold text-gray-900 text-lg truncate">{company.burnRate || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Runway</div>
                            <div className="font-bold text-gray-900 text-lg truncate">{company.runway || 'Not provided'}</div>
                        </div>
                    </div>
                </div>

                {/* Funding Information */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center mb-1">
                        <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-bold text-gray-900">Funding Info</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">Investment & funding rounds</p>
                    
                    <div className="grid grid-cols-2 gap-y-6">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Total Funding</div>
                            <div className="font-bold text-gray-900 text-lg truncate" title={company.totalFunding || 'Not provided'}>{company.totalFunding || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Funding Stage</div>
                            <div className="font-bold text-gray-900 text-lg truncate" title={company.fundingStage || 'Not provided'}>{company.fundingStage || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Last Round</div>
                            <div className="font-bold text-gray-900 text-lg truncate" title={company.lastRound || 'Not provided'}>{company.lastRound || 'Not provided'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Last Valued</div>
                            <div className="font-bold text-gray-900 text-lg truncate" title={company.lastValued || 'Not provided'}>{company.lastValued || 'Not provided'}</div>
                        </div>
                        <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Lead Investor</div>
                            <div className="font-bold text-gray-900 text-lg truncate" title={company.leadInvestor || 'Not provided'}>{company.leadInvestor || 'Not provided'}</div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Why Investors Follow Us Section */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mt-6 relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        Why Investors Follow Us
                    </h3>
                    {!isPublicView && (
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            Edit
                        </button>
                    )}
                </div>
                
                {highlights.length > 0 ? (
                    <ul className="space-y-6">
                        {highlights.map((highlight: any, idx: number) => {
                            // Map icon name to lucide-react component
                            let IconComponent = TrendingUp;
                            if (highlight.icon === 'TrendingUp') IconComponent = TrendingUp;
                            else if (highlight.icon === 'DollarSign') IconComponent = DollarSign;
                            else if (highlight.icon === 'Trophy') IconComponent = Trophy;
                            else if (highlight.icon === 'CheckCircle2') IconComponent = CheckCircle2;
                            // Add more as needed

                            return (
                                <li key={idx} className="flex items-start text-sm text-gray-700">
                                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                        <IconComponent className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-base mb-1">{highlight.title}</div>
                                        <div className="text-gray-500">{highlight.details}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No highlights added yet.
                    </div>
                )}
                
                {pitchDeckUrl && (
                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                        <a 
                            href={pitchDeckUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Pitch Deck
                        </a>
                    </div>
                )}
            </div>



            {isEditModalOpen && (
                <EditWhyInvestorsFollowUsModal 
                    isOpen={isEditModalOpen} 
                    onClose={() => setIsEditModalOpen(false)} 
                    company={company} 
                    onSave={onProfileUpdate} 
                />
            )}
        </div>
    );
}
