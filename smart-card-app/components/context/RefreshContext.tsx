import { createContext, useContext, useState } from "react";

type RefreshContextType = {
  contactsRefreshKey: number;
  refreshContacts: () => void;
};

const RefreshContext = createContext<RefreshContextType | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [contactsRefreshKey, setContactsRefreshKey] = useState(0);

  const refreshContacts = () => {
    setContactsRefreshKey((k) => k + 1);
  };

  return (
    <RefreshContext.Provider
      value={{ contactsRefreshKey, refreshContacts }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    throw new Error("useRefresh must be used inside RefreshProvider");
  }
  return ctx;
}
