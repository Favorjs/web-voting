import React, { createContext, useContext, useState } from 'react';

const ProxyContext = createContext();

export function ProxyProvider({ children }) {
  const [proxyEnabled, setProxyEnabled] = useState(true);

  return (
    <ProxyContext.Provider value={{ proxyEnabled, setProxyEnabled }}>
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  return useContext(ProxyContext);
} 