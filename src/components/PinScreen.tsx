import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { hashPin, verifyPin } from '../utils/crypto';
import { PinData, savePinData } from '../utils/storage';
import { MaterialIcon } from './MaterialIcon';

interface PinScreenProps {
  mode: 'unlock' | 'create' | 'change';
  storedPinData?: PinData | null;
  onSuccess: () => void;
  onCancelChange?: () => void;
}

export const PinScreen: React.FC<PinScreenProps> = ({
  mode,
  storedPinData,
  onSuccess,
  onCancelChange,
}) => {
  const [pin, setPin] = useState<string>('');
  const [createStep, setCreateStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState<string>('');
  const [oldPinVerified, setOldPinVerified] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  const triggerShake = (msg: string) => {
    setIsShaking(true);
    setErrorMsg(msg);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // ignore vibrate restrictions
      }
    }
    setTimeout(() => {
      setIsShaking(false);
      setPin('');
      isProcessingRef.current = false;
    }, 600);
  };

  const handleKeyPress = (digit: string) => {
    if (isProcessingRef.current) return;
    if (pin.length < 4) {
      setErrorMsg('');
      setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    if (isProcessingRef.current) return;
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isProcessingRef.current) return;
    setErrorMsg('');
    setPin('');
  };

  // Auto-navigate and validate when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !isProcessingRef.current) {
      isProcessingRef.current = true;
      const currentEnteredPin = pin;

      const timer = setTimeout(async () => {
        try {
          if (mode === 'unlock') {
            if (!storedPinData) {
              onSuccess();
              return;
            }
            const isValid = await verifyPin(currentEnteredPin, storedPinData.hash, storedPinData.salt);
            if (isValid) {
              onSuccess();
            } else {
              triggerShake('Incorrect PIN. Please try again.');
            }
            return;
          }

          if (mode === 'change' && !oldPinVerified) {
            if (!storedPinData) {
              setOldPinVerified(true);
              setPin('');
              isProcessingRef.current = false;
              return;
            }
            const isValid = await verifyPin(currentEnteredPin, storedPinData.hash, storedPinData.salt);
            if (isValid) {
              setOldPinVerified(true);
              setPin('');
              setErrorMsg('');
              isProcessingRef.current = false;
            } else {
              triggerShake('Current PIN is incorrect');
            }
            return;
          }

          if (createStep === 'enter') {
            setFirstPin(currentEnteredPin);
            setPin('');
            setCreateStep('confirm');
            setErrorMsg('');
            isProcessingRef.current = false;
          } else {
            if (currentEnteredPin !== firstPin) {
              triggerShake('PINs did not match. Please restart setup.');
              setCreateStep('enter');
              setFirstPin('');
              return;
            }
            const hashed = await hashPin(currentEnteredPin);
            savePinData(hashed);
            onSuccess();
          }
        } catch (err) {
          console.error('PIN verification error:', err);
          triggerShake('Verification failed');
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pin, mode, storedPinData, oldPinVerified, createStep, firstPin, onSuccess]);

  let title = 'Enter PIN';
  let subtitle = 'Enter your 4-digit PIN to unlock your personal day hub';

  if (mode === 'create') {
    if (createStep === 'enter') {
      title = 'Create a Secure PIN';
      subtitle = 'Set a 4-digit PIN to protect your personal day hub';
    } else {
      title = 'Confirm Your PIN';
      subtitle = 'Re-enter your 4-digit PIN to confirm';
    }
  } else if (mode === 'change') {
    if (!oldPinVerified) {
      title = 'Current PIN';
      subtitle = 'Enter your existing 4-digit PIN';
    } else if (createStep === 'enter') {
      title = 'New PIN';
      subtitle = 'Enter a new 4-digit PIN';
    } else {
      title = 'Confirm New PIN';
      subtitle = 'Re-enter your new PIN to confirm';
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center min-h-screen bg-[#FAF8F5] dark:bg-[#09090B] text-stone-900 dark:text-stone-100 p-6 select-none">
      {/* Top Brand & Header */}
      <div className="flex flex-col items-center text-center max-w-xs w-full mb-2">
        <div className="w-18 h-18 rounded-3xl bg-[#FEF3C7] dark:bg-amber-950/40 flex items-center justify-center shadow-xs mb-4">
          <MaterialIcon name="lock" size={38} filled className="text-[#EA580C] dark:text-amber-400" />
        </div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {title}
        </h2>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 font-sans leading-relaxed">
          {subtitle}
        </p>

        {/* Visual PIN Dots */}
        <motion.div
          animate={isShaking ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex space-x-4 my-8"
          role="status"
          aria-label={`${pin.length} digits entered`}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? 'bg-amber-600 dark:bg-amber-400 scale-110 shadow-xs'
                  : 'bg-stone-300 dark:bg-stone-700'
              }`}
            />
          ))}
        </motion.div>

        {/* Error message */}
        <div className="h-5 flex items-center justify-center">
          <AnimatePresence>
            {errorMsg && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {errorMsg}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Number Pad - Material Design 3 Tactile circular buttons */}
      <div className="grid grid-cols-3 gap-5 max-w-[270px] w-full place-items-center mt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="w-16 h-16 rounded-full text-2xl font-mono bg-white dark:bg-[#141416] shadow-sm border border-stone-200/90 dark:border-stone-800 flex items-center justify-center text-stone-800 dark:text-stone-100 transition-transform active:scale-90 active:bg-stone-100 dark:active:bg-stone-800 cursor-pointer"
            aria-label={`Digit ${num}`}
          >
            {num}
          </button>
        ))}

        {/* Backspace on bottom left */}
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 transition-transform active:scale-90 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
          aria-label="Delete last digit"
        >
          <MaterialIcon name="backspace" size={24} />
        </button>

        {/* 0 in middle */}
        <button
          onClick={() => handleKeyPress('0')}
          className="w-16 h-16 rounded-full text-2xl font-mono bg-white dark:bg-[#141416] shadow-sm border border-stone-200/90 dark:border-stone-800 flex items-center justify-center text-stone-800 dark:text-stone-100 transition-transform active:scale-90 active:bg-stone-100 dark:active:bg-stone-800 cursor-pointer"
          aria-label="Digit 0"
        >
          0
        </button>

        {/* Checkmark submit on bottom right */}
        <button
          onClick={() => {
            if (pin.length < 4) {
              triggerShake('Please enter all 4 digits');
            }
          }}
          className="w-16 h-16 rounded-full bg-[#EA580C] text-white shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer hover:bg-amber-600"
          aria-label="Confirm PIN"
        >
          <MaterialIcon name="check" size={28} weight={700} />
        </button>
      </div>

      {/* Cancel button in change mode & offline notice */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {mode === 'change' && onCancelChange && (
          <button
            onClick={onCancelChange}
            className="px-4 py-2 rounded-full border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
          <MaterialIcon name="verified_user" size={16} filled className="text-emerald-600 dark:text-emerald-400" />
          <span>Encrypted offline storage on device only</span>
        </div>
      </div>
    </div>
  );
};
