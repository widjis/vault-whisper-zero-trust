import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Alert, AlertTitle, Snackbar, SnackbarOrigin } from '@mui/material';

// Define notification types
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

// Define notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  autoHideDuration?: number;
  action?: React.ReactNode;
}

// Define notification context interface
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Create the notification context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Default position for notifications
const DEFAULT_POSITION: SnackbarOrigin = {
  vertical: 'bottom',
  horizontal: 'right',
};

// Default auto-hide duration (in milliseconds)
const DEFAULT_AUTO_HIDE_DURATION = 5000;

// Notification provider props
interface NotificationProviderProps {
  children: ReactNode;
  position?: SnackbarOrigin;
  maxNotifications?: number;
}

// Create the notification provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = DEFAULT_POSITION,
  maxNotifications = 3,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate a unique ID for notifications
  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Show a notification
  const showNotification = useCallback(
    (notification: Omit<Notification, 'id'>): string => {
      const id = generateId();
      const newNotification: Notification = {
        ...notification,
        id,
        autoHideDuration: notification.autoHideDuration || DEFAULT_AUTO_HIDE_DURATION,
      };

      setNotifications((prev) => {
        // Limit the number of notifications
        const updatedNotifications = [...prev, newNotification];
        if (updatedNotifications.length > maxNotifications) {
          return updatedNotifications.slice(-maxNotifications);
        }
        return updatedNotifications;
      });

      return id;
    },
    [maxNotifications]
  );

  // Hide a notification
  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Context value
  const value = {
    notifications,
    showNotification,
    hideNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open
          autoHideDuration={notification.autoHideDuration}
          onClose={() => hideNotification(notification.id)}
          anchorOrigin={position}
          sx={{ mb: notifications.indexOf(notification) * 8 }}
        >
          <Alert
            onClose={() => hideNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
            action={notification.action}
          >
            {notification.title && <AlertTitle>{notification.title}</AlertTitle>}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Utility functions for common notifications
export const useNotificationUtils = () => {
  const { showNotification } = useNotification();

  const success = useCallback(
    (message: string, title?: string, options?: Partial<Notification>) => {
      return showNotification({
        type: 'success',
        message,
        title,
        ...options,
      });
    },
    [showNotification]
  );

  const info = useCallback(
    (message: string, title?: string, options?: Partial<Notification>) => {
      return showNotification({
        type: 'info',
        message,
        title,
        ...options,
      });
    },
    [showNotification]
  );

  const warning = useCallback(
    (message: string, title?: string, options?: Partial<Notification>) => {
      return showNotification({
        type: 'warning',
        message,
        title,
        ...options,
      });
    },
    [showNotification]
  );

  const error = useCallback(
    (message: string, title?: string, options?: Partial<Notification>) => {
      return showNotification({
        type: 'error',
        message,
        title,
        autoHideDuration: 8000, // Longer duration for errors
        ...options,
      });
    },
    [showNotification]
  );

  return {
    success,
    info,
    warning,
    error,
  };
};