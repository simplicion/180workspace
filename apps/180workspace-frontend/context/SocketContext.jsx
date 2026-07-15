"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn("useSocket must be used within a SocketProvider");
    return { socket: null };
  }
  return context;
};
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Mock socket for now until Phase 7
    const mockSocket = {
      on: () => {},
      off: () => {},
      emit: () => {},
    };
    setSocket(mockSocket);
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
