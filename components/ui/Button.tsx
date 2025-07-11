
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, ...props }) => {
    const baseClasses = "px-6 py-2.5 font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-center";
    
    const variantClasses = {
        primary: "bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-cyan-500",
        secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500",
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
