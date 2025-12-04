/**
 * Notification Service
 * Handles API calls for the notification system
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

class NotificationService {
    /**
     * Get notifications with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Notifications and pagination info
     */
    static async getNotifications(options = {}) {
        const { page = 1, limit = 20, unreadOnly = false, type = null } = options;
        
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            unreadOnly: unreadOnly.toString()
        });
        
        if (type) params.append('type', type);

        try {
            const response = await fetch(`${API_BASE_URL}/notifications?${params}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Get notifications error:', error);
            return { success: false, notifications: [], error: error.message };
        }
    }

    /**
     * Get unread notification count
     * @returns {Promise<number>} Unread count
     */
    static async getUnreadCount() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.unreadCount : 0;
        } catch (error) {
            console.error('[NotificationService] Get unread count error:', error);
            return 0;
        }
    }

    /**
     * Mark a single notification as read
     * @param {string} notificationId - Notification ID
     * @returns {Promise<Object>} Result
     */
    static async markAsRead(notificationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Mark as read error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark all notifications as read
     * @returns {Promise<Object>} Result
     */
    static async markAllAsRead() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Mark all as read error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a single notification
     * @param {string} notificationId - Notification ID
     * @returns {Promise<Object>} Result
     */
    static async deleteNotification(notificationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Delete notification error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear all notifications
     * @returns {Promise<Object>} Result
     */
    static async clearAll() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Clear all error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a movie to the request list (for movie availability alerts)
     * @param {string} movieTitle - Movie title to track
     * @returns {Promise<Object>} Result
     */
    static async addMovieRequest(movieTitle) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/movie-request`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ movieTitle })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Add movie request error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a movie from the request list
     * @param {string} movieTitle - Movie title to remove
     * @returns {Promise<Object>} Result
     */
    static async removeMovieRequest(movieTitle) {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/movie-request/${encodeURIComponent(movieTitle)}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[NotificationService] Remove movie request error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's movie requests
     * @returns {Promise<Array>} List of movie titles
     */
    static async getMovieRequests() {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/movie-requests`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.movieRequests : [];
        } catch (error) {
            console.error('[NotificationService] Get movie requests error:', error);
            return [];
        }
    }
}

export default NotificationService;
