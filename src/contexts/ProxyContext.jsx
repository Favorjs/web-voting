import React, { createContext, useContext, useState } from 'react';

const DEFAULT_PROXY_VOTES = 120;
const DEFAULT_PROXY_HOLDINGS = 136789566;

const ProxyContext = createContext();

export function ProxyProvider({ children }) {
  const [proxyVotes, setProxyVotes] = useState(DEFAULT_PROXY_VOTES);
  const [proxyHoldings, setProxyHoldings] = useState(DEFAULT_PROXY_HOLDINGS);

  const disableProxy = () => {
    setProxyVotes(0);
    setProxyHoldings(0);
  };

  const enableProxy = () => {
    setProxyVotes(DEFAULT_PROXY_VOTES);
    setProxyHoldings(DEFAULT_PROXY_HOLDINGS);
  };

  return (
    <ProxyContext.Provider value={{
      proxyVotes,
      setProxyVotes,
      proxyHoldings,
      setProxyHoldings,
      disableProxy,
      enableProxy
    }}>
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  return useContext(ProxyContext);
} 