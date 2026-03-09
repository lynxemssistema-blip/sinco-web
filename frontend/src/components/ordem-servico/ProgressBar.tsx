import { memo } from 'react';

export const ProgressBar = memo(({ value, label }: { value?: number; label: string }) => {
    const percent = value || 0;
    const getProgressColor = (p: number) => {
        if (!p || p === 0) return 'bg-gray-200';
        if (p < 30) return 'bg-red-400';
        if (p < 70) return 'bg-yellow-400';
        return 'bg-green-500';
    };
    return (
        <div className="flex items-center gap-1" title={`${label}: ${percent}%`}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${getProgressColor(percent)}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            <span className="text-[10px] text-gray-400 w-6">{percent}%</span>
        </div>
    );
});
