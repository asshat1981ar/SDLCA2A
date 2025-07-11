export const getStatusColor = (status: string): string => {
    switch (status) {
        case 'success':
        case 'completed':
            return 'text-green-400';
        case 'error':
        case 'failed':
            return 'text-red-400';
        case 'in_progress':
        case 'building':
            return 'text-yellow-400';
        case 'planned':
        case 'pending':
            return 'text-gray-400';
        default:
            return 'text-gray-400';
    }
};

export const getStatusBgColor = (status: string): string => {
    switch (status) {
        case 'success':
        case 'completed':
            return 'bg-green-900/20';
        case 'error':
        case 'failed':
            return 'bg-red-900/20';
        case 'in_progress':
        case 'building':
            return 'bg-yellow-900/20';
        case 'planned':
        case 'pending':
            return 'bg-gray-900/20';
        default:
            return 'bg-gray-900/20';
    }
};