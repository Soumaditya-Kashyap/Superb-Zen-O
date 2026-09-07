/**
 * NotificationMenu Component
 * A dropdown menu displaying user notifications with real-time updates
 * 
 * Features:
 * - Real-time notifications via Socket.io
 * - Different UI per notification type
 * - Accept/Decline for friend requests
 * - Join button for watch invites
 * - Mark as read functionality
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, 
    UserPlus, 
    UserCheck, 
    Tv, 
    Film, 
    Megaphone,
    Check,
    X,
    Trash2,
    Loader,
    Users,
    MessageCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import NotificationService from '../services/notificationService';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || 'http://localhost:5000';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return `${API_URL}/api`;
};
const API_BASE_URL = getApiBaseUrl();

// Notification type icons and colors
const notificationConfig = {
    FRIEND_REQ: {
        icon: UserPlus,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        label: 'Friend Request'
    },
    FRIEND_ACCEPT: {
        icon: UserCheck,
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        label: 'Friend Accepted'
    },
    WATCH_INVITE: {
        icon: Tv,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
        label: 'Watch Party'
    },
    ROOM_ENDED: {
        icon: Users,
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        label: 'Room Ended'
    },
    MOVIE_ALERTS: {
        icon: Film,
        color: 'from-gold to-gold-light',
        bgColor: 'bg-gold/10',
        borderColor: 'border-gold/30',
        label: 'Movie Alert'
    },
    MESSAGE: {
        icon: MessageCircle,
        color: 'from-cyan-500 to-cyan-600',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/30',
        label: 'Message'
    },
    SYSTEM: {
        icon: Megaphone,
        color: 'from-gray-400 to-gray-500',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        label: 'System'
    }
};

const NotificationMenu = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState({});
    const [initialFetchDone, setInitialFetchDone] = useState(false);
    
    const menuRef = useRef(null);
    const notificationSoundRef = useRef(new Audio('/sounds/WhatsApp-Audio-2025-12-05-at-02.03.57_d2ed0ea1.mp3'));
    const socketRef = useRef(null);
    const token = localStorage.getItem('token');

    // Fetch notifications function
    const fetchNotifications = async (pageNum = 1, append = false) => {
        if (!token) return;
        
        setLoading(true);
        try {
            console.log('[Notification] Fetching notifications for page:', pageNum);
            const result = await NotificationService.getNotifications({
                page: pageNum,
                limit: 20
            });
            
            console.log('[Notification] API Response:', result);

            if (result.success) {
                const notifs = result.notifications || [];
                console.log('[Notification] Found', notifs.length, 'notifications');
                
                if (append) {
                    setNotifications(prev => [...prev, ...notifs]);
                } else {
                    setNotifications(notifs);
                }
                setHasMore(result.pagination?.hasMore || false);
                if (result.unreadCount !== undefined) {
                    setUnreadCount(result.unreadCount);
                }
            } else {
                console.error('[Notification] API returned success: false', result);
            }
        } catch (error) {
            console.error('[Notification] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch unread count function
    const fetchUnreadCount = async () => {
        if (!token) return;
        try {
            const count = await NotificationService.getUnreadCount();
            console.log('[Notification] Unread count fetched:', count);
            setUnreadCount(count);
        } catch (error) {
            console.error('[Notification] Unread count error:', error);
        }
    };

    // Initialize socket connection for real-time notifications
    useEffect(() => {
        if (!token) return;

        console.log('[Notification] Initializing socket connection...');
        
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Notification] ✅ Socket connected, ID:', socket.id);
        });
        
        socket.on('connect_error', (error) => {
            console.error('[Notification] ❌ Socket connection error:', error.message);
        });

        // Listen for new notifications
        socket.on('new_notification', (notification) => {
            console.log('[Notification] 🔔 Received new notification:', notification);
            
            // Play notification sound
            if (notificationSoundRef.current) {
                notificationSoundRef.current.currentTime = 0;
                notificationSoundRef.current.play().catch(err => {
                    console.log('[Notification] Sound play failed:', err.message);
                });
            }
            
            // Add to top of list
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Notification] Socket disconnected:', reason);
        });

        return () => {
            console.log('[Notification] Cleaning up socket');
            socket.disconnect();
        };
    }, [token]);

    // Fetch initial data on mount - only once
    useEffect(() => {
        if (!token || initialFetchDone) return;
        
        console.log('[Notification] Component mounted, fetching initial data...');
        setInitialFetchDone(true);
        
        // Fetch both notifications and count
        fetchNotifications();
        fetchUnreadCount();
        
        // Periodic refresh every 30 seconds as fallback for real-time
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [token, initialFetchDone]);

    // Handle click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mark all as read when menu opens
    const handleMenuOpen = async () => {
        const wasOpen = isOpen;
        setIsOpen(!isOpen);
        
        // Refresh notifications when opening the menu
        if (!wasOpen) {
            console.log('[Notification] Menu opened, refreshing notifications...');
            console.log('[Notification] Current notifications state:', notifications);
            await fetchNotifications();
        }
        
        if (!wasOpen && unreadCount > 0) {
            // Mark all as read after a short delay
            setTimeout(async () => {
                await NotificationService.markAllAsRead();
                setUnreadCount(0);
                setNotifications(prev => 
                    prev.map(n => ({ ...n, isRead: true }))
                );
            }, 1000);
        }
    };

    // Load more notifications
    const loadMore = async () => {
        if (loading || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        await fetchNotifications(nextPage, true);
    };

    // Handle friend request accept
    const handleAcceptFriend = async (notificationId, senderId) => {
        setActionLoading(prev => ({ ...prev, [notificationId]: 'accept' }));
        
        try {
            const response = await fetch(`${API_BASE_URL}/connections/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senderId })
            });

            if (response.ok) {
                // Remove notification from list
                setNotifications(prev => prev.filter(n => n._id !== notificationId));
            }
        } catch (error) {
            console.error('[Notification] Accept friend error:', error);
        } finally {
            setActionLoading(prev => ({ ...prev, [notificationId]: null }));
        }
    };

    // Handle friend request decline
    const handleDeclineFriend = async (notificationId, senderId) => {
        setActionLoading(prev => ({ ...prev, [notificationId]: 'decline' }));
        
        try {
            const response = await fetch(`${API_BASE_URL}/connections/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senderId })
            });

            if (response.ok) {
                // Remove notification from list
                setNotifications(prev => prev.filter(n => n._id !== notificationId));
            }
        } catch (error) {
            console.error('[Notification] Decline friend error:', error);
        } finally {
            setActionLoading(prev => ({ ...prev, [notificationId]: null }));
        }
    };

    // Handle notification click (for navigation)
    const handleNotificationClick = (notification) => {
        switch (notification.type) {
            case 'FRIEND_REQ':
                // Navigate to chat page where they can see pending requests
                navigate('/chat');
                break;
            case 'FRIEND_ACCEPT':
                // Navigate to chat to see the new friend
                navigate('/chat');
                break;
            case 'WATCH_INVITE':
                // Navigate to watch together page with room ID
                if (notification.metadata?.roomId) {
                    navigate(`/watch-together?roomId=${notification.metadata.roomId}`);
                } else {
                    navigate('/watch-together');
                }
                break;
            case 'ROOM_ENDED':
                // Navigate to watch together page
                navigate('/watch-together');
                break;
            case 'MESSAGE':
                // Navigate to chat page
                navigate('/chat');
                break;
            case 'MOVIE_ALERTS':
                // Navigate to home with movie modal open
                if (notification.relatedId) {
                    navigate(`/?movie=${notification.relatedId}`);
                } else {
                    navigate('/');
                }
                break;
            case 'SYSTEM':
                // System notifications may have a link in metadata
                if (notification.metadata?.link) {
                    navigate(notification.metadata.link);
                }
                break;
            default:
                break;
        }
        setIsOpen(false);
    };

    // Delete single notification
    const handleDeleteNotification = async (e, notificationId) => {
        e.stopPropagation();
        setActionLoading(prev => ({ ...prev, [notificationId]: 'delete' }));
        
        try {
            await NotificationService.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
        } catch (error) {
            console.error('[Notification] Delete error:', error);
        } finally {
            setActionLoading(prev => ({ ...prev, [notificationId]: null }));
        }
    };

    // Clear all notifications
    const handleClearAll = async () => {
        try {
            await NotificationService.clearAll();
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('[Notification] Clear all error:', error);
        }
    };

    // Render notification item
    const renderNotification = (notification) => {
        const config = notificationConfig[notification.type] || notificationConfig.SYSTEM;
        const Icon = config.icon;
        const isUnread = !notification.isRead;
        const sender = notification.sender;

        return (
            <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`relative p-3 rounded-xl border transition-all duration-200
                    ${isUnread ? 'bg-gold/5 border-gold/20' : 'bg-white/5 border-white/10'}
                    hover:bg-white/10 cursor-pointer group`}
                onClick={() => handleNotificationClick(notification)}
            >
                <div className="flex items-start gap-3">
                    {/* Icon or Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full 
                        bg-gradient-to-br ${config.color} 
                        flex items-center justify-center shadow-lg`}>
                        {sender?.profilePicture ? (
                            <img 
                                src={sender.profilePicture} 
                                alt={sender.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <Icon size={20} className="text-white" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium line-clamp-2">
                            {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full 
                                ${config.bgColor} ${config.borderColor} border`}>
                                {config.label}
                            </span>
                            <span className="text-xs text-gray-400">
                                {notification.timeAgo || formatTimeAgo(notification.createdAt)}
                            </span>
                        </div>

                        {/* Action Buttons - Only for Friend Requests */}
                        {notification.type === 'FRIEND_REQ' && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcceptFriend(notification._id, notification.sender?._id);
                                    }}
                                    disabled={actionLoading[notification._id]}
                                    className="flex items-center gap-1 px-3 py-1.5 
                                        bg-green-500/20 hover:bg-green-500/30 
                                        text-green-400 rounded-lg text-xs font-medium
                                        border border-green-500/30 transition-colors"
                                >
                                    {actionLoading[notification._id] === 'accept' ? (
                                        <Loader size={12} className="animate-spin" />
                                    ) : (
                                        <Check size={12} />
                                    )}
                                    Accept
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeclineFriend(notification._id, notification.sender?._id);
                                    }}
                                    disabled={actionLoading[notification._id]}
                                    className="flex items-center gap-1 px-3 py-1.5 
                                        bg-red-500/20 hover:bg-red-500/30 
                                        text-red-400 rounded-lg text-xs font-medium
                                        border border-red-500/30 transition-colors"
                                >
                                    {actionLoading[notification._id] === 'decline' ? (
                                        <Loader size={12} className="animate-spin" />
                                    ) : (
                                        <X size={12} />
                                    )}
                                    Decline
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Delete button */}
                    <button
                        onClick={(e) => handleDeleteNotification(e, notification._id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 
                            hover:bg-red-500/20 rounded-lg transition-all"
                    >
                        {actionLoading[notification._id] === 'delete' ? (
                            <Loader size={14} className="text-red-400 animate-spin" />
                        ) : (
                            <Trash2 size={14} className="text-red-400" />
                        )}
                    </button>

                    {/* Unread indicator */}
                    {isUnread && (
                        <div className="absolute top-3 left-3 w-2 h-2 bg-gold rounded-full" />
                    )}
                </div>
            </motion.div>
        );
    };

    // Format time ago helper
    const formatTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="relative" ref={menuRef}>
            {/* Bell Button */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleMenuOpen}
                className="relative p-3 bg-gradient-to-br from-gold/15 to-gold-light/10 
                    hover:from-gold/20 hover:to-gold-light/15 
                    rounded-xl border border-gold/30 shadow-lg shadow-gold/10"
            >
                <Bell size={22} className="text-gold" />
                
                {/* Unread Badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[20px] h-5 
                                bg-red-500 rounded-full flex items-center justify-center
                                text-white text-xs font-bold px-1
                                shadow-lg shadow-red-500/50 animate-pulse"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-96 max-h-[500px]
                            bg-black/90 backdrop-blur-xl rounded-2xl
                            border border-white/10 shadow-2xl shadow-black/50
                            overflow-hidden z-[1000]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 
                            border-b border-white/10 bg-gradient-to-r from-gold/10 to-transparent">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Bell size={20} className="text-gold" />
                                Notifications
                            </h3>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="text-xs text-gray-400 hover:text-red-400 
                                            transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={14} />
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[400px] p-2 space-y-2 custom-scrollbar">
                            {loading && notifications.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader size={24} className="text-gold animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-8">
                                    <Bell size={40} className="text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm">No notifications yet</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        We'll notify you when something happens
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <AnimatePresence mode="popLayout">
                                        {notifications.map(renderNotification)}
                                    </AnimatePresence>

                                    {/* Load More */}
                                    {hasMore && (
                                        <button
                                            onClick={loadMore}
                                            disabled={loading}
                                            className="w-full py-2 text-sm text-gold 
                                                hover:bg-gold/10 rounded-lg transition-colors"
                                        >
                                            {loading ? (
                                                <Loader size={16} className="animate-spin mx-auto" />
                                            ) : (
                                                'Load More'
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationMenu;