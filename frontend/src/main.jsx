// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Create root and render app
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);