import { ReactNode } from 'react';

export default function JobHunterLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-full flex flex-col space-y-6">
            {children}
        </div>
    );
}
