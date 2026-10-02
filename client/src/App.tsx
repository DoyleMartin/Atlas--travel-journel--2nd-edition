import { Routes, Route } from 'react-router';
import './App.css';

// TODO: real routes arrive in 1d
export default function App() {
  return (
    <Routes>
      <Route path="*" element={<h1 className="app-placeholder">Atlas</h1>} />
    </Routes>
  );
}
