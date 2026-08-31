import React from 'react';

const PremiumDialog = ({ 
  isOpen, 
  title, 
  message, 
  type = 'info', // 'info', 'warning', 'danger', 'success'
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  // Icon mapping based on type
  const renderIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-notion-blue/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-notion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        );
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-[0_4px_14px_0_rgba(225,29,72,0.39)]';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]';
      case 'info':
      default:
        return 'bg-notion-blue hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onCancel}
      ></div>
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200 fade-in">
        <div className="flex flex-col items-center text-center">
          {renderIcon()}
          
          <h3 className="mt-5 text-xl font-bold text-notion-black">
            {title}
          </h3>
          
          <p className="mt-2 text-sm text-zinc-500 font-medium">
            {message}
          </p>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3 w-full">
          {onConfirm && (
            <button 
              onClick={onConfirm}
              className={`w-full sm:w-auto flex-1 px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 ${getConfirmButtonStyles()}`}
            >
              {confirmText}
            </button>
          )}
          
          {onCancel && (
            <button 
              onClick={onCancel}
              className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-bold transition-all transform active:scale-95"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumDialog;
