import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useSessions } from '../hooks/useFirestore';
import {
  ArrowLeft,
  Plus,
  Globe,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Monitor,
  Clock,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import ScreenshotViewer from '../components/ScreenshotViewer';

export default function VMDetailPage() {
  const { envId, vmId } = useParams();
  const navigate = useNavigate();
  const { selectedEnv } = useOutletContext();
  const { sessions, loading, addSession, stopSession, deleteSession } = useSessions(vmId);
  const [vm, setVM] = useState(null);
  const [newUrl, setNewUrl] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (!vmId) return;
    const unsubscribe = onSnapshot(doc(db, 'vms', vmId), (snap) => {
      if (snap.exists()) setVM({ id: snap.id, ...snap.data() });
    });
    return unsubscribe;
  }, [vmId]);

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (sessions.length >= 10) {
      alert('Maximum 10 sessions per VM. Stop a session first.');
      return;
    }
    await addSession(url);
    setNewUrl('');
  };

  const activeSessions = sessions.filter((s) => s.status === 'running' || s.status === 'pending');
  const stoppedSessions = sessions.filter((s) => s.status === 'stopped' || s.status === 'stopping');

  return (
    <div className="p-6">
      {/* Back button and header */}
      <button
        onClick={() => navigate(`/environment/${envId}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition mb-4"
      >
        <ArrowLeft size={16} /> Back to {selectedEnv?.name || 'Environment'}
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor size={24} className="text-primary-500" />
            {vm?.name || 'Loading...'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className={`inline-flex items-center gap-1 ${vm?.status === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
              {vm?.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {vm?.status || 'unknown'}
            </span>
            <span className="font-mono">{vm?.publicIP || 'No IP'}</span>
            <span>{vm?.provider || 'Oracle Cloud'}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">{activeSessions.length}/10</div>
          <div className="text-xs text-gray-500">Active Sessions</div>
        </div>
      </div>

      {/* URL Input */}
      <form onSubmit={handleLaunch} className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Enter URL to open in Chrome (e.g. https://example.com)"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          type="submit"
          disabled={!newUrl.trim() || activeSessions.length >= 10}
          className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition text-sm font-medium"
        >
          <Play size={14} /> Launch
        </button>
      </form>

      {/* Sessions Grid with Screenshot Previews */}
      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Globe size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No Chrome Sessions</h3>
          <p className="text-sm text-gray-400">Enter a URL above to launch a Chrome session on this VM</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              {/* Screenshot Preview */}
              <div
                className="relative bg-gray-900 aspect-video cursor-pointer group"
                onClick={() => setSelectedSession(session)}
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
                        {session.status === 'pending' ? 'Starting...' : 'No screenshot yet'}
                      </p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <Maximize2
                    size={24}
                    className="text-white opacity-0 group-hover:opacity-100 transition"
                  />
                </div>
                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      session.status === 'running'
                        ? 'bg-green-500 text-white'
                        : session.status === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}
                  >
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

              {/* Session Info */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={12} className="text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {session.url}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <RefreshCw size={10} />
                    Screenshot every 60s
                  </div>
                  <div className="flex items-center gap-1">
                    {session.status === 'running' || session.status === 'pending' ? (
                      <button
                        onClick={() => stopSession(session.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                        title="Stop session"
                      >
                        <Square size={14} />
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        if (confirm('Delete this session?')) deleteSession(session.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                      title="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
