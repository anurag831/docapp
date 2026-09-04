import { useEffect, useRef, useState, useCallback } from 'react';

export function usePresence(docId, userId, userName, userRole) {
  const [collaborators, setCollaborators] = useState([]);
  const [connected, setConnected] = useState(false);
  const [remoteUpdate, setRemoteUpdate] = useState(null);

  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);

  useEffect(() => {
    if (!docId || !userId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let isMounted = true;
    let ws = null;
    let heartbeatInterval = null;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'join',
            docId: parseInt(docId, 10),
            userId: parseInt(userId, 10),
            name: userName || 'Anonymous',
            role: userRole || 'viewer',
          })
        );

        // Periodic heartbeat
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'heartbeat',
                docId: parseInt(docId, 10),
              })
            );
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence_state') {
            setCollaborators(data.collaborators || []);
          } else if (data.type === 'doc_updated') {
            setRemoteUpdate({
              updatedBy: data.updatedBy,
              timestamp: data.timestamp,
            });
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        if (isMounted) setConnected(false);
      };

      ws.onerror = () => {
        if (isMounted) setConnected(false);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (ws) {
        ws.close();
      }
    };
  }, [docId, userId, userName, userRole]);

  const notifyTyping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (!lastTypingSentRef.current) {
      lastTypingSentRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          docId: parseInt(docId, 10),
          isTyping: true,
        })
      );
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = false;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'typing',
            docId: parseInt(docId, 10),
            isTyping: false,
          })
        );
      }
    }, 2500);
  }, [docId]);

  const broadcastSaved = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'doc_saved',
          docId: parseInt(docId, 10),
          updatedBy: userName,
        })
      );
    }
  }, [docId, userName]);

  const clearRemoteUpdate = useCallback(() => {
    setRemoteUpdate(null);
  }, []);

  return {
    collaborators,
    connected,
    remoteUpdate,
    notifyTyping,
    broadcastSaved,
    clearRemoteUpdate,
  };
}
