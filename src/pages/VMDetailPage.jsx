import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useSessions } from '../hooks/useFirestore';
import {
  ArrowLeft,
  Globe,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Monitor,
  Clock,
  Maximize2,
  AlertCircle,
  Loader2,
  List,
} from 'lucide-react';
import ScreenshotViewer from '../components/ScreenshotViewer';

function timeAgo(ts) {
  if (!ts) return 'never';
  const seconds = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function VMDetailPage() {
  const { vmId } = useParams();
  const navigate = useNavigate();
  const { sessions, loading, addSession, stopSession, deleteSession } = useSessions(vmId);
  const [vm, setVM] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (!vmId) return;
    const unsubscribe = onSnapshot(doc(db, 'vms', vmId), (snap) => {
      if (snap.exists()) setVM({ id: snap.id, ...snap.data() });
    });
    return unsubscribe;
  }, [vmId]);

  const isReady = vm?.status === 'online';
  const isBooting = vm?.status === 'booting';
  const activeSessions = sessions.filter((s) => s.status === 'running' || s.status === 'pending');
  const stoppedSessions = sessions.filter((s) => s.status === 'stopped' || s.status === 'stopping');
  const slotsLeft = MAX_TABS - activeSessions.length;

  const normalizeUrl = (raw) => {
    let url = raw.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    return url;
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!urlInput.trim() || !isReady) return;

    setLaunching(true);
    try {
      if (batchMode) {
        // Split by newlines, commas, or spaces — each line is a URL
        const urls = urlInput
          .split(/[\n,]+/)
          .map(normalizeUrl)
          .filter(Boolean);
        const toAdd = urls.slice(0, slotsLeft);
        for (const url of toAdd) {
          await addSession(url);
        }
        if (urls.length > toAdd.length) {
          alert(`Only ${toAdd.length} of ${urls.length} URLs launched (${slotsLeft} slots available).`);
        }
      } else {
        const url = normalizeUrl(urlInput);
        if (url && slotsLeft > 0) {
          await addSession(url);
        }
      }
      setUrlInput('');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="p-6">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition mb-4"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor size={24} className="text-primary-500" />
            {vm?.name || 'Loading…'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className={`inline-flex items-center gap-1 font-medium ${
              isReady ? 'text-green-600' : isBooting ? 'text-yellow-600' : 'text-gray-400'
            }`}>
              {isReady ? <Wifi size={12} /> : isBooting ? <Loader2 size={12} className="animate-spin" /> : <WifiOff size={12} />}
              {isReady ? 'Ready' : isBooting ? 'Booting…' : 'Offline'}
            </span>
            <span>{vm?.specs || 'Azure VM'}</span>
            <span>{vm?.provider === 'azure' ? 'Azure · Free Tier' : 'Cloud VM'}</span>
            {vm?.lastSeen && (
              <span className="text-xs text-gray-400">
                Heartbeat: {timeAgo(vm.lastSeen)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">{activeSessions.length}/{MAX_TABS}</div>
          <div className="text-xs text-gray-500">Active Sessions</div>
        </div>
      </div>

      {/* Ready gate */}
      {!isReady && (
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
          isBooting ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
        }`}>
          {isBooting
            ? <Loader2 size={20} className="text-yellow-600 animate-spin" />
            : <AlertCircle size={20} className="text-red-500" />
          }
          <div>
            <div className={`font-medium text-sm ${isBooting ? 'text-yellow-800' : 'text-red-800'}`}>
              {isBooting ? 'VM is booting — installing Chromium & launching browser…' : 'VM is offline'}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isBooting
                ? 'This happens automatically. Sessions can be queued once the agent reports ready.'
                : 'The SocialPlug agent is not running on this VM. Start it with the setup script or ensure the systemd service is enabled.'
              }
            </p>
          </div>
        </div>
      )}

      {/* URL Input — single or batch */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            {batchMode ? 'Paste URLs (one per line)' : 'Enter URL'}
          </label>
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            <List size={12} />
            {batchMode ? 'Single URL' : 'Batch mode'}
          </button>
        </div>

        <form onSubmit={handleLaunch} className="flex gap-2">
          {batchMode ? (
            <textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={"https://linkedin.com\nhttps://reddit.com\nhttps://x.com"}
              rows={4}
              disabled={!isReady}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
          ) : (
            <div className="flex-1 relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                disabled={!isReady}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={!urlInput.trim() || !isReady || slotsLeft <= 0 || launching}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition text-sm font-medium self-end"
          >
            {launching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {batchMode ? 'Launch All' : 'Launch'}
          </button>
        </form>
        {slotsLeft <= 0 && isReady && (
          <p className="text-xs text-red-500 mt-1">All {MAX_TABS} session slots are in use. Stop a session to free a slot.</p>
        )}
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Globe size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No Chrome Sessions</h3>
          <p className="text-sm text-gray-400">
            {isReady
              ? 'Enter one or more URLs above to launch Chrome sessions on this VM'
              : 'This VM is not ready yet — sessions will be available once the agent is online'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Active */}
          {activeSessions.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                Active Sessions ({activeSessions.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onView={() => setSelectedSession(session)}
                    onStop={() => stopSession(session.id)}
                    onDelete={() => { if (confirm('Delete this session?')) deleteSession(session.id); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stopped */}
          {stoppedSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Stopped ({stoppedSessions.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {stoppedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onView={() => setSelectedSession(session)}
                    onDelete={() => { if (confirm('Delete this session?')) deleteSession(session.id); }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Full-screen Screenshot Viewer */}
      {selectedSession && (
        <ScreenshotViewer
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

const MAX_TABS = 10;

function SessionCard({ session, onView, onStop, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Screenshot Preview */}
      <div
        className="relative bg-gray-900 aspect-video cursor-pointer group"
        onClick={onView}
      >
        {session.latestScreenshot ? (
          <img
            src={session.latestScreenshot}
            alt={`Screenshot of ${session.url}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Monitor size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">
                {session.status === 'pending' ? 'Starting…' : 'No screenshot yet'}
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
          <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100 transition" />
        </div>
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            session.status === 'running' ? 'bg-green-500 text-white'
              : session.status === 'pending' ? 'bg-yellow-500 text-white'
              : 'bg-gray-500 text-white'
          }`}>
            {session.status}
          </span>
        </div>
        {/* Timestamp */}
        {session.screenshotUpdatedAt && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/80 bg-black/50 rounded px-1.5 py-0.5">
            <Clock size={10} />
            {new Date(session.screenshotUpdatedAt?.seconds * 1000).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={12} className="text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-800 truncate">{session.url}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <RefreshCw size={10} />
            Auto-screenshot every 60s
          </div>
          <div className="flex items-center gap-1">
            {onStop && (session.status === 'running' || session.status === 'pending') && (
              <button onClick={onStop} className="p-1 text-gray-400 hover:text-red-500 transition" title="Stop session">
                <Square size={14} />
              </button>
            )}
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 transition" title="Delete session">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
