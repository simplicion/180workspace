import React, { useState } from 'react';
import { ExternalLink, Star, Shield, ArrowRight, Plus } from 'lucide-react';
import { AddProductModal } from './AddProductModal';

interface TabProps {
    company: any;
    isOwner?: boolean;
}



export function ProductsTab({ company, isOwner = true }: TabProps) {
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    
    const products = company.products || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isAddProductModalOpen && (
                <AddProductModal 
                    isOpen={isAddProductModalOpen} 
                    onClose={() => setIsAddProductModalOpen(false)} 
                    companyId={company.id} 
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Our Products</h2>
                    <p className="text-sm text-gray-500 mt-1">Explore the solutions we&apos;re building</p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => setIsAddProductModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </button>
                )}
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product: any) => (
                        <div key={product.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
                            <div className="p-6 flex-grow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-50 text-2xl flex items-center justify-center border border-blue-100 overflow-hidden">
                                        {product.logoUrl ? (
                                            <img src={product.logoUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            product.icon || "🚀"
                                        )}
                                    </div>
                                    {product.status && (
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                                            product.status === 'Live' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                            {product.status}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                                <p className="text-sm text-gray-600 line-clamp-3">{product.description}</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center mt-auto">
                                <span className="text-xs font-semibold text-gray-500">{product.category || 'Product'}</span>
                                {product.link && (
                                    <a href={product.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-bold flex items-center group-hover:text-blue-700">
                                        View <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <img src="https://cdn-icons-png.flaticon.com/512/411/411681.png" alt="Empty" className="w-8 h-8 opacity-40" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">No products yet</h4>
                    <p className="text-gray-500 text-sm max-w-sm text-center mb-6">Showcase the products your company has built or is currently developing.</p>
                    {isOwner && (
                        <button
                            onClick={() => setIsAddProductModalOpen(true)}
                            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Add First Product
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
