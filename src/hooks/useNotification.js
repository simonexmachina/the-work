import { useState, useCallback } from 'react';

export function useNotification() {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'success', duration = 5000) => {
        const id = Date.now() + Math.random();
        
        setNotifications(prev => [...prev, { id, message, type }]);
        
        if (duration > 0) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
        
        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return { notifications, showNotification, removeNotification };
}

