import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Clock, Globe, RefreshCw, ExternalLink } from 'lucide-react';

export default function ScreenshotViewer({ session, onClose }) {
  const [liveSession, setLiveSession] = useState(session);

  // Real-time listener for live screenshot updates
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'sessions', session.id), (snap) => {
      if (snap.exists()) {
        setLiveSession({ id: snap.id, ...snap.data() });
      }
    });
    return unsubscribe;
  }, [session.id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 text-white">
        <div className="flex items-center gap-3">
          <Globe size={16} className="text-primary-400" />
          <span className="text-sm font-medium truncate max-w-md">
            {liveSession.url}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              liveSession.status === 'running'
                ? 'bg-green-500'
                : liveSession.status === 'pending'
                ? 'bg-yellow-500'
                : 'bg-gray-500'
            }`}
          >
            {liveSession.status}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {liveSession.screenshotUpdatedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} />
              Last update:{' '}
              {new Date(liveSession.screenshotUpdatedAt?.seconds * 1000).toLocaleTimeString()}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <RefreshCw size={12} /> Auto-refresh 60s
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Screenshot display */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {liveSession.latestScreenshot ? (
          <img
            src={liveSession.latestScreenshot}
            alt={`Live screenshot of ${liveSession.url}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="text-center text-gray-400">
            <RefreshCw size={40} className="mx-auto mb-3 animate-spin" />
            <p>Waiting for first screenshot...</p>
            <p className="text-sm mt-1">The VM agent captures a screenshot every 60 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}
