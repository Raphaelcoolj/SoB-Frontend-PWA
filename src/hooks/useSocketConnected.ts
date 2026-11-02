'use client';

import { useSyncExternalStore } from 'react';
import { socket } from '../lib/socket';

/**
 * Live Socket.IO connectivity state.
 *
 * Several lists poll purely as a realtime safety net. While the socket is
 * healthy those intervals are suspended (the socket event handlers become the
 * source of truth) and restored as soon as the connection drops, so a
 * connected client stops issuing redundant fetches every few seconds.
 *
 * Modelled with `useSyncExternalStore` rather than `useState` + an effect:
 * the socket is external mutable state that can change between the first
 * render and effect attachment, and this hook both reads it without a
 * setState-in-effect (cascading render) and lets React re-check the snapshot
 * once listeners are attached, so a connection opened in that window is not
 * missed.
 */
const subscribe = (onChange: () => void) => {
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
};

const getSnapshot = () => socket.connected;

// During SSR there is no socket; report disconnected so the first client
// render reconciles against the real snapshot instead of assuming a link.
const getServerSnapshot = () => false;

export function useSocketConnected(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
