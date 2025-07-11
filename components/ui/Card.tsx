
import React from 'react';

interface CardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
    return (
        <div className={`bg-gray-800/50 border border-gray-700 rounded-2xl shadow-lg ${className}`}>
            <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};

export default Card;
