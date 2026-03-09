import { createContext, useContext, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface Alert {
    message: string;
    type: AlertType;
    id: number;
}

interface AlertContextType {
    showAlert: (message: string, type?: AlertType) => void;
    hideAlert: (id: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const showAlert = (message: string, type: AlertType = 'info') => {
        const id = Date.now();
        setAlerts((prev) => [...prev, { message, type, id }]);
        // Auto-close after 5 seconds
        setTimeout(() => hideAlert(id), 5000);
    };

    const hideAlert = (id: number) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    };

    const getIcon = (type: AlertType) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" size={24} />;
            case 'warning': return <AlertTriangle className="text-yellow-500" size={24} />;
            case 'error': return <XCircle className="text-red-500" size={24} />;
            default: return <AlertCircle className="text-blue-500" size={24} />;
        }
    };

    const getBgColor = (type: AlertType) => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'error': return 'bg-red-50 border-red-200';
            default: return 'bg-blue-50 border-blue-200';
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center p-4 space-y-4">
                <AnimatePresence>
                    {alerts.map((alert) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            className={`pointer-events-auto max-w-md w-full p-4 rounded-2xl shadow-2xl border flex items-start gap-4 ${getBgColor(alert.type)}`}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(alert.type)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800 break-words">
                                    {alert.message}
                                </p>
                            </div>
                            <button
                                onClick={() => hideAlert(alert.id)}
                                className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors text-gray-400"
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
