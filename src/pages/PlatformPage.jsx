import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useVMs } from '../hooks/useFirestore';
import { PLATFORMS } from '../components/PlatformLogos';
import ScreenshotViewer from '../components/ScreenshotViewer';
import {
  Plus,
  Globe,
  Play,
  Square,
  Trash2,
  Monitor,
  Clock,
  Maximize2,
  RefreshCw,
  Server,
  ChevronDown,
} from 'lucide-react';

export default function PlatformPage() {
  const { platformKey } = useParams();
  const { user } = useAuth();
  const { selectedEnv, environments } = useOutletContext();
  const navigate = useNavigate();

  const platform = PLATFORMS.find((p) => p.key === platformKey);
  const PlatformLogo = platform?.Logo;

  // Get all VMs across all environments
  const [allVMs, setAllVMs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVM, setSelectedVM] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showVMDropdown, setShowVMDropdown] = useState(false);

  // Load all VMs for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'vms'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vms = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllVMs(vms);
      if (!selectedVM && vms.length > 0) setSelectedVM(vms[0].id);
    });
    return unsubscribe;
  }, [user]);

  // Load sessions for this platform
  useEffect(() => {
    if (!user || !platformKey) return;
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('platform', '==', platformKey)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, platformKey]);

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!selectedVM) {
      alert('Please select a VM first. Add VMs from an Environment room.');
      return;
    }
    const vmSessions = sessions.filter((s) => s.vmId === selectedVM && (s.status === 'running' || s.status === 'pending'));
    if (vmSessions.length >= 10) {
      alert('Maximum 10 sessions per VM reached.');
      return;
    }
    const url = customUrl.trim() || platform.defaultUrl;
    const finalUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;

    await addDoc(collection(db, 'sessions'), {
      url: finalUrl,
      vmId: selectedVM,
      userId: user.uid,
      platform: platformKey,
      status: 'pending',
      latestScreenshot: null,
      screenshotUpdatedAt: null,
      createdAt: serverTimestamp(),
    });
    setCustomUrl('');
  };

  const stopSession = async (id) => {
    await updateDoc(doc(db, 'sessions', id), { status: 'stopping' });
  };

  const deleteSession = async (id) => {
    await deleteDoc(doc(db, 'sessions', id));
  };

  if (!platform) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Platform not found</p>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === 'running' || s.status === 'pending');
  const currentVM = allVMs.find((v) => v.id === selectedVM);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <PlatformLogo size={36} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{platform.label}</h1>
            <p className="text-sm text-gray-500">
              {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''} across {new Set(activeSessions.map((s) => s.vmId)).size} VM{new Set(activeSessions.map((s) => s.vmId)).size !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Launch bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <form onSubmit={handleLaunch} className="flex gap-2 items-end">
          {/* VM Selector */}
          <div className="w-52 relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">Target VM</label>
            <button
              type="button"
              onClick={() => setShowVMDropdown(!showVMDropdown)}
              className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white hover:border-primary-400 transition"
            >
              <span className="flex items-center gap-2 truncate">
                <Server size={14} className="text-gray-400" />
                {currentVM ? currentVM.name : 'Select VM...'}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            {showVMDropdown && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto">
                {allVMs.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No VMs found. Add VMs from an Environment.
                  </div>
                ) : (
                  allVMs.map((vm) => (
                    <button
                      key={vm.id}
                      type="button"
                      onClick={() => { setSelectedVM(vm.id); setShowVMDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition flex items-center justify-between ${
                        selectedVM === vm.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="truncate">{vm.name}</span>
                      <span className="text-[10px] font-mono text-gray-400">{vm.publicIP}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* URL Input */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">URL (optional - defaults to {platform.label})</label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={platform.defaultUrl}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Launch Button */}
          <button
            type="submit"
            disabled={!selectedVM}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg transition text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: platform.color === '#FFFC00' ? '#333' : platform.color }}
          >
            <Play size={14} /> Launch on VM
          </button>
        </form>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <PlatformLogo size={56} className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No {platform.label} Sessions</h3>
          <p className="text-sm text-gray-400">
            Select a VM and launch {platform.label} to start monitoring
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => {
            const vm = allVMs.find((v) => v.id === session.vmId);
            return (
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
                    <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  {/* Status + Platform badge */}
                  <div className="absolute top-2 left-2">
                    <PlatformLogo size={18} />
                  </div>
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
                    <span className="text-sm font-medium text-gray-800 truncate">{session.url}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Server size={10} />
                      <span>{vm?.name || 'Unknown VM'}</span>
                      <span className="font-mono">{vm?.publicIP}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(session.status === 'running' || session.status === 'pending') && (
                        <button
                          onClick={() => stopSession(session.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition"
                          title="Stop"
                        >
                          <Square size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Delete this session?')) deleteSession(session.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <ScreenshotViewer session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
