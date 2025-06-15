import React from "react";

import { useNotifications } from "../../contexts/NotificationContext";

import { Notification } from "./Notification";

export const NotificationContainer = () => {
  const { notifications } = useNotifications();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => notification.close()}
        />
      ))}
    </div>
  );
};
