import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  SlideProps,
  IconButton,
  Box,
  LinearProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: React.ReactNode;
  progress?: boolean;
}

interface NotificationManagerProps {
  notifications: NotificationProps[];
  onRemove: (id: string) => void;
  maxVisible?: number;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const NotificationItem: React.FC<{
  notification: NotificationProps;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const [progress, setProgress] = useState(100);
  const duration = notification.duration || 6000;

  useEffect(() => {
    if (notification.persistent) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          onClose();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration, notification.persistent, onClose]);

  return (
    <Alert
      severity={notification.type}
      variant="filled"
      sx={{
        mb: 1,
        minWidth: 300,
        maxWidth: 500,
        position: 'relative',
        overflow: 'hidden',
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {notification.action}
          <IconButton
            size="small"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      {notification.title && <AlertTitle>{notification.title}</AlertTitle>}
      {notification.message}
      {!notification.persistent && notification.progress !== false && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'transparent',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        />
      )}
    </Alert>
  );
};

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onRemove,
  maxVisible = 5,
}) => {
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
      }}
    >
      {visibleNotifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          TransitionComponent={SlideTransition}
          sx={{ position: 'relative', mb: 1 }}
        >
          <div>
            <NotificationItem
              notification={notification}
              onClose={() => onRemove(notification.id)}
            />
          </div>
        </Snackbar>
      ))}
    </Box>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = (notification: Omit<NotificationProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { ...notification, id }]);
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Convenience methods
  const success = (message: string, options?: Partial<NotificationProps>) =>
    addNotification({ type: 'success', message, ...options });

  const error = (message: string, options?: Partial<NotificationProps>) =>
    addNotification({ type: 'error', message, persistent: true, ...options });

  const warning = (message: string, options?: Partial<NotificationProps>) =>
    addNotification({ type: 'warning', message, ...options });

  const info = (message: string, options?: Partial<NotificationProps>) =>
    addNotification({ type: 'info', message, ...options });

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };
};