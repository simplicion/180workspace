'use client';


import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Mail, Phone, MapPin, Banknote, ShieldCheck, ShieldAlert, MoreVertical, Edit, Trash2, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Vendor { id?: string;
    _id: string;
    name: string;
    email: string;
    phone: string;
    category: string;
    status: 'active' | 'inactive';
    bankDetails?: {
        verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed';
        bankName: string;
        accountNumber: string;
    };
    createdAt: string;
}

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/vendors');
            setVendors(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (error) {
            toast.error('Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const safeVendors = Array.isArray(vendors) ? vendors : [];
    const filteredVendors = safeVendors.filter(v =>
        v?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
                    <p className="text-gray-500">Manage supplier profiles and bank details</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Vendor
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search vendors by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Vendor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.length === 0 ? (
                    <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No vendors found</h3>
                        <p className="text-gray-500">Try adjusting your search or add a new vendor.</p>
                    </div>
                ) : (
                    filteredVendors.map((vendor) => (
                        <div key={vendor.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl uppercase">
                                        {vendor.name.charAt(0)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                            vendor.status === 'active' ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {vendor.status}
                                        </span>
                                        <button className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{vendor.name}</h3>
                                <p className="text-sm text-gray-500 mb-4">{vendor.category}</p>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {vendor.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {vendor.phone}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        {vendor.bankDetails?.verificationStatus === 'verified' ? (
                                            <ShieldCheck className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                        )}
                                        <span className={clsx(
                                            "text-xs font-medium",
                                            vendor.bankDetails?.verificationStatus === 'verified' ? "text-green-600" : "text-amber-600"
                                        )}>
                                            {vendor.bankDetails?.verificationStatus === 'verified' ? 'Bank Verified' : 'Action Required'}
                                        </span>
                                    </div>
                                    <button className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-1">
                                        Details
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
