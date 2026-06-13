import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-dark-400 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
