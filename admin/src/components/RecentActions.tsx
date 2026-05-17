import { useState, useEffect } from 'react';
import { getActions, AdminAction } from '../utils/actionLogger';

const getRelativeTime = (timestamp: number): string => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour ago`;
    return `${Math.floor(diff / 86400)} day ago`;
};

const RecentActions = () => {
    const [actions, setActions] = useState<AdminAction[]>([]);

    const refresh = () => setActions(getActions());

    useEffect(() => {
        refresh();
        // Optional: update timestamps every minute
        const interval = setInterval(refresh, 60000);
        return () => clearInterval(interval);
    }, []);

    // Listen for storage events (if multiple tabs)
    useEffect(() => {
        const handleStorage = () => refresh();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    if (actions.length === 0) {
        return (
            <div className="db-card-compact">
                <div className="db-section-header">
                    <h3 className="db-section-title">📋 Recent Actions</h3>
                </div>
                <p className="db-empty-text">No admin actions yet.</p>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'add': return '➕';
            case 'delete': return '🗑️';
            case 'edit': return '✏️';
            default: return '📌';
        }
    };

    return (
        <div className="db-card-compact">
            <div className="db-section-header">
                <h3 className="db-section-title">📋 Recent Actions</h3>
                <span className="db-section-sub">history</span>
            </div>
            <div className="db-actions-list">
                {actions.map(action => (
                    <div key={action.id} className="db-action-row">
                        <span className="db-action-icon">{getIcon(action.type)}</span>
                        <div className="db-action-details">
                            <span className="db-action-text">
                                {action.type === 'add' && 'Added'}
                                {action.type === 'delete' && 'Deleted'}
                                {action.type === 'edit' && 'Edited'}
                                {' '}
                                <strong>{action.gameTitle}</strong>
                            </span>
                            <span className="db-action-time">{getRelativeTime(action.timestamp)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentActions;