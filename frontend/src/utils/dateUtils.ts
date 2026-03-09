export const formatToBRDate = (dateString: string | null | undefined): string => {
    if (!dateString || dateString === '-' || dateString === '0000-00-00') {
        return '-';
    }

    try {
        // Handle both YYYY-MM-DD and potentially localized strings
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (e) {
        return '-';
    }
};
