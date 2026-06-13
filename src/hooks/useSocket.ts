/**
 * @file useSocket.ts
 * @description Custom hook for managing Socket.io real-time event listeners.
 * Joins the user's personal notification room, listens for live events,
 * and updates Zustand stores on each incoming event.
 * Disconnects and cleans up all listeners on unmount.
 */

import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useNotificationStore } from '../store/notificationStore';
import { Notification } from '../types/notification';

export const useSocket = () => {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!socket || typeof window === 'undefined') return;

    /**
     * Handler for incoming real-time notifications.
     * Received when: someone likes a post, comments, follows, debates.
     */
    const handleNewNotification = (notification: Notification) => {
      addNotification(notification);
    };

    // Attach event listeners
    socket.on('new_notification', handleNewNotification);

    // Cleanup listeners on unmount to avoid stale callbacks
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [addNotification]);

  /**
   * Joins a post-specific room to receive real-time comment/debate updates.
   * @param postId - The MongoDB ID of the post to subscribe to.
   */
  const joinPostRoom = (postId: string) => {
    if (socket?.connected) {
      socket.emit('join_post', postId);
    }
  };

  /**
   * Leaves a post-specific socket room.
   * @param postId - The MongoDB ID of the post to unsubscribe from.
   */
  const leavePostRoom = (postId: string) => {
    if (socket?.connected) {
      socket.emit('leave_post', postId);
    }
  };

  return { joinPostRoom, leavePostRoom };
};
