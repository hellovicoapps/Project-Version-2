import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-[var(--color-danger)] hover:opacity-90 text-white',
    warning: 'bg-[var(--color-warning)] hover:opacity-90 text-white',
    info: 'bg-[var(--color-info)] hover:opacity-90 text-white'
  };

  const iconColors = {
    danger: 'text-[var(--color-danger)]',
    warning: 'text-[var(--color-warning)]',
    info: 'text-[var(--color-info)]'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full bg-[var(--text-muted)]/10 ${iconColors[type]}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-[var(--text-main)] mb-2">{title}</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">{message}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-muted)]/10 rounded-xl transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-6 py-2 text-sm font-medium rounded-xl transition-all shadow-lg active:scale-95 ${colors[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
