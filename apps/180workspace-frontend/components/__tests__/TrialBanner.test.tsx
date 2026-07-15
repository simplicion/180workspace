import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TrialBanner from '../TrialBanner';
import { useSubscription } from '../../lib/useSubscription';

// Mock the hook
jest.mock('../../lib/useSubscription');
const mockUseSubscription = useSubscription;

describe('TrialBanner Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders nothing if loading is true', () => {
        mockUseSubscription.mockReturnValue({ loading: true, isWarning: true, isExpired: false });
        const { container } = render(<TrialBanner />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing if not in warning or expired state', () => {
        mockUseSubscription.mockReturnValue({ loading: false, isWarning: false, isExpired: false });
        const { container } = render(<TrialBanner />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders warning message when days left > 0', () => {
        mockUseSubscription.mockReturnValue({
            loading: false,
            isWarning: true,
            isExpired: false,
            isTrialing: true,
            daysLeft: 5
        });

        render(<TrialBanner />);
        
        expect(screen.getByText(/Trial expires in/i)).toBeInTheDocument();
        expect(screen.getByText('5 days')).toBeInTheDocument();
        // Should have amber warning background
        expect(screen.getByText(/Trial expires in/i).closest('div.bg-amber-400')).toBeInTheDocument();
    });

    it('renders critical warning message when days left <= 2', () => {
        mockUseSubscription.mockReturnValue({
            loading: false,
            isWarning: true,
            isExpired: false,
            isTrialing: false,
            daysLeft: 1
        });

        render(<TrialBanner />);
        
        expect(screen.getByText(/Subscription expires in/i)).toBeInTheDocument();
        expect(screen.getByText('1 day')).toBeInTheDocument();
        // Should have red critical background
        expect(screen.getByText(/Subscription expires in/i).closest('div.bg-red-500')).toBeInTheDocument();
    });

    it('renders expired message and no dismiss button when expired', () => {
        mockUseSubscription.mockReturnValue({
            loading: false,
            isWarning: false,
            isExpired: true,
            isTrialing: true,
            daysLeft: 0
        });

        render(<TrialBanner />);
        
        expect(screen.getByText(/Your trial has/i)).toBeInTheDocument();
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
        
        // Upgrade button should be present
        expect(screen.getByRole('link', { name: /Upgrade Plan/i })).toBeInTheDocument();
        
        // Dismiss button should not be present
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
