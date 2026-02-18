import React from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'secondary';
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = '削除',
  confirmVariant = 'danger',
  showCancel = true,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-sm"
      icon={
        <div className={`p-2 rounded-full ${
            confirmVariant === 'danger' ? 'bg-red-100 text-red-600' : 
            confirmVariant === 'primary' ? 'bg-blue-100 text-blue-600' :
            'bg-gray-100 text-gray-600'
          }`}>
          <AlertTriangle size={24} />
        </div>
      }
    >
      <div className="p-6">
        <p className="text-sm text-gray-600 mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3">
          {showCancel && <Button variant="ghost" onClick={onCancel}>キャンセル</Button>}
          <Button variant={confirmVariant as any} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
};