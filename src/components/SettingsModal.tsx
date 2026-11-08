import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import {
  createBackup,
  restoreBackup,
  clearPinData,
  getDiaryPinSeparate,
  saveDiaryPinSeparate,
  saveDiaryPinData,
  clearDiaryPinData,
} from '../utils/storage';
import { hashPin } from '../utils/crypto';
import { PWAInstallButton } from './PWAInstallButton';
import { Logo } from './Logo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRequestChangePin: () => void;
  onLockNow: () => void;
  stats: {
    tasksCount: number;
    routinesCount: number;
    keepsakesCount: number;
    diaryCount: number;
    notesCount: number;
  };
  onDataRestored: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  onRequestChangePin,
  onLockNow,
  stats,
  onDataRestored,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupNotice, setBackupNotice] = useState<{ msg: string; error?: boolean } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState<boolean>(false);

  // Diary PIN settings
  const [diaryPinSeparate, setDiaryPinSeparate] = useState<boolean>(() => getDiaryPinSeparate());
  const [isSettingDiaryPin, setIsSettingDiaryPin] = useState<boolean>(false);
  const [newDiaryPin, setNewDiaryPin] = useState<string>('');
  const [confirmDiaryPin, setConfirmDiaryPin] = useState<string>('');
  const [diaryPinError, setDiaryPinError] = useState<string>('');

  if (!isOpen) return null;

  // Export JSON backup
  const handleExportBackup = () => {
    try {
      const backupData = createBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `myday-hub-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupNotice({ msg: 'Backup exported successfully!' });
      setTimeout(() => setBackupNotice(null), 3000);
    } catch {
      setBackupNotice({ msg: 'Export failed. Please try again.', error: true });
    }
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed !== 'object' || !parsed) {
          throw new Error('Invalid JSON structure');
        }
        const success = restoreBackup(parsed);
        if (success) {
          setBackupNotice({ msg: 'Backup successfully restored!' });
          onDataRestored();
          setTimeout(() => setBackupNotice(null), 3000);
        } else {
          setBackupNotice({ msg: 'Could not restore backup format.', error: true });
        }
      } catch {
        setBackupNotice({ msg: 'Invalid backup JSON file.', error: true });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleWipeAll = () => {
    localStorage.clear();
    clearPinData();
    clearDiaryPinData();
    window.location.reload();
  };

  // Toggle separate diary PIN
  const handleToggleDiarySeparate = () => {
    if (diaryPinSeparate) {
      // Revert to reusing app PIN
      saveDiaryPinSeparate(false);
      clearDiaryPinData();
      setDiaryPinSeparate(false);
      setIsSettingDiaryPin(false);
      setBackupNotice({ msg: 'Diary now reuses your main App PIN.' });
      setTimeout(() => setBackupNotice(null), 3000);
    } else {
      setIsSettingDiaryPin(true);
      setNewDiaryPin('');
      setConfirmDiaryPin('');
      setDiaryPinError('');
    }
  };

  const handleSaveCustomDiaryPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDiaryPin.length < 4 || newDiaryPin.length > 6) {
      setDiaryPinError('PIN must be 4 to 6 digits.');
      return;
    }
    if (newDiaryPin !== confirmDiaryPin) {
      setDiaryPinError('PINs do not match.');
      return;
    }

    const hashed = await hashPin(newDiaryPin);
    saveDiaryPinData(hashed);
    saveDiaryPinSeparate(true);
    setDiaryPinSeparate(true);
    setIsSettingDiaryPin(false);
    setNewDiaryPin('');
    setConfirmDiaryPin('');
    setDiaryPinError('');
    setBackupNotice({ msg: 'Separate Diary PIN successfully configured!' });
    setTimeout(() => setBackupNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-lg rounded-lg bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <h3 className="font-serif text-2xl font-medium tracking-tight">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer flex items-center justify-center"
            aria-label="Close settings"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </div>

        {/* Scrollable Settings Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Notice Banner */}
          {backupNotice && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
                backupNotice.error
                  ? 'border-[var(--color-clay)]/40 text-[var(--color-clay)] bg-[var(--color-paper)]'
                  : 'border-[var(--color-teal)]/40 text-[var(--color-teal)] bg-[var(--color-paper)]'
              }`}
            >
              {backupNotice.error ? (
                <MaterialIcon name="warning" size={18} />
              ) : (
                <MaterialIcon name="check_circle" size={18} filled />
              )}
              <span>{backupNotice.msg}</span>
            </div>
          )}

          {/* Security & PIN */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted)] font-semibold">
              Security & Passcode
            </h4>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MaterialIcon name="key" size={22} className="text-[var(--color-ink)]" />
                  <div>
                    <p className="text-sm font-medium">Main App PIN</p>
                    <p className="text-xs text-[var(--color-muted)]">Hashed offline with SHA-256</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onRequestChangePin();
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card)] text-xs font-semibold hover:border-[var(--color-ink)] transition cursor-pointer"
                >
                  Change PIN
                </button>
              </div>

              {/* Diary Lock Option */}
              <div className="pt-2.5 border-t border-[var(--color-hairline)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MaterialIcon name="verified_user" size={22} filled className="text-[var(--color-indigo)]" />
                    <div>
                      <p className="text-sm font-medium">Diary Lock PIN</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {diaryPinSeparate ? 'Using dedicated Diary PIN' : 'Reusing Main App PIN'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleDiarySeparate}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-card)] text-xs font-semibold hover:border-[var(--color-ink)] transition cursor-pointer"
                  >
                    {diaryPinSeparate ? 'Reuse App PIN' : 'Set Separate PIN'}
                  </button>
                </div>

                {/* Form to set separate Diary PIN */}
                {isSettingDiaryPin && (
                  <form onSubmit={handleSaveCustomDiaryPin} className="mt-3 p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-card)] space-y-2">
                    <p className="text-xs font-mono text-[var(--color-ink)] font-semibold">
                      Create Dedicated Diary PIN (4-6 digits):
                    </p>
                    {diaryPinError && (
                      <p className="text-xs text-[var(--color-clay)]">{diaryPinError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="New PIN"
                        value={newDiaryPin}
                        onChange={e => setNewDiaryPin(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-center focus:outline-none focus:border-[var(--color-saffron)]"
                      />
                      <input
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Confirm PIN"
                        value={confirmDiaryPin}
                        onChange={e => setConfirmDiaryPin(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-center focus:outline-none focus:border-[var(--color-saffron)]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSettingDiaryPin(false)}
                        className="px-2.5 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 rounded bg-[var(--color-indigo)] text-[#FFFBF2] text-xs font-semibold cursor-pointer"
                      >
                        Save Diary PIN
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="pt-2.5 border-t border-[var(--color-hairline)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lock App</p>
                  <p className="text-xs text-[var(--color-muted)]">Lock journal immediately</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-card)] text-xs font-semibold hover:border-[var(--color-ink)] transition cursor-pointer"
                >
                  Lock Now
                </button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted)] font-semibold">
              Appearance
            </h4>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {darkMode ? (
                  <MaterialIcon name="dark_mode" size={22} filled className="text-[var(--color-ink)]" />
                ) : (
                  <MaterialIcon name="light_mode" size={22} filled className="text-[var(--color-ink)]" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {darkMode ? 'Dark Theme' : 'Paper Theme'}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {darkMode ? 'Deep ink tone' : 'Warm paper tone (#F6EFE2)'}
                  </p>
                </div>
              </div>

              <button
                onClick={onToggleDarkMode}
                className="px-3.5 py-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card)] text-xs font-semibold hover:border-[var(--color-ink)] transition cursor-pointer"
              >
                Switch to {darkMode ? 'Paper' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Backup & Data */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted)]">
              Backup & Transfer (JSON)
            </h4>
            <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 space-y-3">
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Export all your tasks, routines, keepsakes, notes, and reflections to an offline JSON backup file.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleExportBackup}
                  className="flex-1 py-2 px-3 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card)] text-xs font-semibold hover:border-[var(--color-ink)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MaterialIcon name="download" size={18} />
                  <span>Export JSON</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json,application/json"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card)] text-xs font-semibold hover:border-[var(--color-ink)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MaterialIcon name="upload" size={18} />
                  <span>Import JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* PWA Installation */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted)] font-semibold">
              Offline PWA
            </h4>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MaterialIcon name="smartphone" size={22} className="text-[var(--color-ink)]" />
                <div>
                  <p className="text-sm font-medium">Home Screen Installation</p>
                  <p className="text-xs text-[var(--color-muted)]">Standalone offline access</p>
                </div>
              </div>
              <PWAInstallButton compact={true} />
            </div>
          </div>

          {/* Device Inventory */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-muted)] font-semibold">
              Device Inventory
            </h4>
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                <span className="text-[var(--color-muted)]">Total Tasks:</span>
                <span className="font-mono tabular-nums font-semibold">{stats.tasksCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                <span className="text-[var(--color-muted)]">Routines:</span>
                <span className="font-mono tabular-nums font-semibold">{stats.routinesCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                <span className="text-[var(--color-muted)]">Keepsakes:</span>
                <span className="font-mono tabular-nums font-semibold">{stats.keepsakesCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-hairline)]">
                <span className="text-[var(--color-muted)]">Diary:</span>
                <span className="font-mono tabular-nums font-semibold">{stats.diaryCount}</span>
              </div>
              <div className="flex justify-between py-1 col-span-2">
                <span className="text-[var(--color-muted)]">Quick Notes:</span>
                <span className="font-mono tabular-nums font-semibold">{stats.notesCount}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-2">
            {!confirmWipe ? (
              <button
                onClick={() => setConfirmWipe(true)}
                className="w-full py-2.5 rounded-full border border-[var(--color-clay)]/30 text-[var(--color-clay)] hover:bg-[var(--color-clay)]/10 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MaterialIcon name="delete" size={18} />
                <span>Reset All Data</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-lg border border-[var(--color-clay)]/40 bg-[var(--color-paper)] text-xs space-y-2">
                <p className="font-semibold text-[var(--color-clay)]">
                  Permanently erase all stored data and PIN on this device?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWipeAll}
                    className="flex-1 py-1.5 rounded-lg bg-[var(--color-clay)] text-[#FFFBF2] font-semibold text-xs hover:opacity-90 transition cursor-pointer"
                  >
                    Yes, Erase Everything
                  </button>
                  <button
                    onClick={() => setConfirmWipe(false)}
                    className="flex-1 py-1.5 rounded-lg border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] font-semibold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
