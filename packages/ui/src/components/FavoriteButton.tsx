'use strict';

import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

interface FavoriteButtonProps {
    recordId: string;
    type: 'Lead' | 'Opportunity' | 'Project' | 'Task' | 'Client' | 'Invoice' | 'User';
    label: string;
    href: string;
    className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ recordId, type, label, href, className }) => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, [recordId]);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/user-preferences');
            const favorites = res.data.favorites || [];
            setIsFavorite(favorites.some((f: any) => f.recordId === recordId && f.type === type));
        } catch (error) {
            console.error('Fetch favorite status error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsToggling(true);
        try {
            await api.post('/api/user-preferences/favorites/toggle', {
                recordId,
                type,
                label,
                href
            });
            setIsFavorite(!isFavorite);
            toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');

            // Dispatch custom event to notify sidebar
            window.dispatchEvent(new CustomEvent('favoritesUpdated'));
        } catch (error) {
            toast.error('Failed to update favorite');
        } finally {
            setIsToggling(false);
        }
    };

    if (loading) return <div className="w-8 h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>;

    return (
        <button
            onClick={toggleFavorite}
            disabled={isToggling}
            className={clsx(
                "p-2 rounded-xl transition-all border",
                isFavorite
                    ? "bg-amber-50 border-amber-200 text-amber-500 shadow-sm"
                    : "bg-white border-gray-100 text-gray-400 hover:text-amber-500 hover:border-amber-100 hover:bg-amber-50/30",
                className
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            <Star className={clsx("w-5 h-5", isFavorite && "fill-current")} />
        </button>
    );
};

export default FavoriteButton;
