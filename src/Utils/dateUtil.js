export const formatDate = (dateString) => {
    if (!dateString) return '-'; // Handle empty or undefined dates

    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return '-';
    }

    // Format as "MMM DD, YYYY" (e.g., "Jan 01, 2023")
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};