import { createContext, useState, useContext, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

const ProxyContext = createContext();

export const ProxyProvider = ({ children }) => {
  const [proxyVotes, setProxyVotes] = useState(120);
  const [proxyHoldings, setProxyHoldings] = useState(136789566);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(API_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleProxyUpdate = (settings) => {
      setProxyVotes(settings.proxyVotes);
      setProxyHoldings(settings.proxyHoldings);
    };

    socket.on('proxySettingsUpdated', handleProxyUpdate);

    return () => {
      socket.off('proxySettingsUpdated', handleProxyUpdate);
    };
  }, [socket]);

  // Load proxy settings from server on mount
  useEffect(() => {
    const loadProxySettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/proxy-settings`);
        if (response.ok) {
          const { data } = await response.json();
          if (data) {
            setProxyVotes(data.proxyVotes);
            setProxyHoldings(data.proxyHoldings);
          }
        }
      } catch (err) {
        console.error('Failed to load proxy settings:', err);
        setError('Failed to load proxy settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadProxySettings();
  }, []);

  // Save proxy settings to server whenever they change
  const updateProxySettings = async (newVotes, newHoldings) => {
    try {
      const response = await fetch(`${API_URL}/api/proxy-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          proxyVotes: newVotes,
          proxyHoldings: newHoldings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update proxy settings');
      }

      const { data } = await response.json();
      
      // The server will broadcast the update via WebSocket,
      // which will trigger the state update through the socket listener
      
      return { success: true, data };
    } catch (err) {
      console.error('Error updating proxy settings:', err);
      setError('Failed to update proxy settings');
      return { success: false, error: err.message };
    }
  };

  return (
    <ProxyContext.Provider
      value={{
        proxyVotes,
        proxyHoldings,
        isLoading,
        error,
        updateProxySettings,
      }}
    >
      {children}
    </ProxyContext.Provider>
  );
};

export const useProxy = () => {
  const context = useContext(ProxyContext);
  if (context === undefined) {
    throw new Error('useProxy must be used within a ProxyProvider');
  }
  return context;
};

export default ProxyContext;
