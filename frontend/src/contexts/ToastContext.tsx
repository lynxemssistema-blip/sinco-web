import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

interface ToastContextData {
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((state) => state.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback(({ type, title, message, duration }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);

        // Increase default duration to 8000ms (at least 5s as requested)
        // If it's an error, we can set duration to 0 (stays until clicked) 
        // or just a very long time. Let's use 0 for errors and 8000 for others.
        const finalDuration = duration !== undefined ? duration : (type === 'error' ? 0 : 8000);

        const newToast = { id, type, title, message, duration: finalDuration };

        setToasts((state) => [...state, newToast]);

        if (finalDuration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, finalDuration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

const toastVariants = {
    initial: { opacity: 0, y: -20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const colors = {
        success: { border: 'bg-green-500', icon: 'text-green-500', bg: 'bg-white' },
        error: { border: 'bg-red-500', icon: 'text-red-500', bg: 'bg-white' },
        warning: { border: 'bg-yellow-500', icon: 'text-yellow-500', bg: 'bg-white' },
        info: { border: 'bg-blue-500', icon: 'text-blue-500', bg: 'bg-white' },
    };

    const icons = {
        success: <CheckCircle className="w-6 h-6" />,
        error: <XCircle className="w-6 h-6" />,
        warning: <AlertTriangle className="w-6 h-6" />,
        info: <Info className="w-6 h-6" />,
    };

    const style = colors[toast.type];

    return (
        <motion.div
            layout
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`pointer-events-auto relative flex overflow-hidden rounded-lg shadow-lg border border-gray-100 ${style.bg} hover:shadow-xl transition-shadow`}
        >
            <div className={`w-2 ${style.border}`} />
            <div className="flex-1 p-4 flex gap-3">
                <div className={`mt-0.5 ${style.icon}`}>
                    {icons[toast.type]}
                </div>
                <div className="flex-1">
                    {toast.title && <h3 className="font-bold text-gray-900 leading-snug">{toast.title}</h3>}
                    <p className="text-sm text-gray-600 leading-relaxed mt-0.5">{toast.message}</p>
                </div>
                <button
                    onClick={() => onRemove(toast.id)}
                    className="self-start text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
};
