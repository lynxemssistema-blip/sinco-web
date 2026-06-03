export const formatToBRDate = (dateString: string | null | undefined): string => {
    if (!dateString || dateString === '-' || dateString === '0000-00-00') {
        return '-';
    }

    if (dateString.includes('/')) {
        return dateString; // Already formatted by the backend
    }

    try {
        if (dateString.includes('-') && !dateString.includes('T')) {
            const [year, month, day] = dateString.split('-');
            if (year.length === 4) return `${day}/${month}/${year}`;
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();

        return `${day}/${month}/${year}`;
    } catch (e) {
        return '-';
    }
};

export const isDateInPast = (dateString: string | null | undefined): boolean => {
    if (!dateString || dateString === '-' || dateString === '0000-00-00') return false;
    try {
        let date: Date;
        if (dateString.includes('/')) {
            const [day, month, year] = dateString.split('/');
            date = new Date(Number(year), Number(month) - 1, Number(day));
        } else if (dateString.includes('-') && !dateString.includes('T')) {
            const [year, month, day] = dateString.split('-');
            date = new Date(Number(year), Number(month) - 1, Number(day));
        } else {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    } catch (e) {
        return false;
    }
};
