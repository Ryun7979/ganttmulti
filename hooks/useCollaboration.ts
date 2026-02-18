import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Task } from '../types';

interface SyncMessage {
  type: 'SYNC';
  data: Task[];
}

function isValidSyncMessage(data: unknown): data is SyncMessage {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as any;
  return msg.type === 'SYNC' && Array.isArray(msg.data);
}

export const useCollaboration = (
  tasks: Task[],
  setTasks: (tasks: Task[]) => void
) => {
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const isRemoteUpdate = useRef(false);
  const [peerIdTrigger, setPeerIdTrigger] = useState(0);

  // Initialize PeerJS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const peer = new Peer();

      peer.on('open', (id) => {
        setMyPeerId(id);
        console.log('My peer ID is: ' + id);
      });

      peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
      });

      peerRef.current = peer;

      return () => {
        peer.destroy();
        peerRef.current = null;
      };
    }
  }, [peerIdTrigger]);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      setConnections((prev) => [...prev, conn]);
      // Host sends initial state
      setTimeout(() => {
        if (conn.open) {
          // Trigger sync
        }
      }, 500);
    });

    conn.on('data', (data: unknown) => {
      if (isValidSyncMessage(data)) {
        console.log('Received SYNC data', data.data);
        isRemoteUpdate.current = true;
        setTasks(data.data);
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 0);
      } else {
        console.warn('Received invalid data format:', data);
      }
    });

    conn.on('close', () => {
      setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
    });
  }, [setTasks]);

  const connectToPeer = useCallback((peerId: string) => {
    if (!peerRef.current) return;
    const conn = peerRef.current.connect(peerId);
    setupConnection(conn);
  }, [setupConnection]);

  // Broadcast changes whenever tasks change
  useEffect(() => {
    if (!isRemoteUpdate.current && connections.length > 0) {
      connections.forEach((conn) => {
        if (conn.open) {
          conn.send({ type: 'SYNC', data: tasks });
        }
      });
    }
  }, [tasks, connections]);

  const regenerateId = useCallback(() => {
    setMyPeerId(null);
    setConnections([]);
    setPeerIdTrigger(n => n + 1);
  }, []);

  return {
    myPeerId,
    connections,
    connectToPeer,
    isConnected: connections.length > 0,
    connectionCount: connections.length,
    regenerateId
  };
};
