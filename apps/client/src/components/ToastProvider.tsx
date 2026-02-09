'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function ToastProvider() {
    return <ToastContainer position="bottom-center" aria-label="Notificaciones" />;
}
