import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
        {children}
      </div>
    </div>
  );
};
