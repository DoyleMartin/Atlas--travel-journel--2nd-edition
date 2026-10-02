import { Outlet } from 'react-router';
import Navbar from '../Navbar/Navbar';
import './AppLayout.css';

/** Navbar + page content. Every in-app page (not login/register) renders inside this. */
export default function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
