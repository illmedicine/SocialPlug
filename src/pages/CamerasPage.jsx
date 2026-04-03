import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Globe, Clock, Monitor, RefreshCw } from 'lucide-react';
import ScreenshotViewer from '../components/ScreenshotViewer';

export default function CamerasPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('status', 'in', ['running', 'pending']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Camera size={24} className="text-primary-500" />
          Live Cameras
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All active Chrome sessions with live screenshot previews
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={24} className="animate-spin text-primary-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24">
          <Camera size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No Active Sessions</h3>
          <p className="text-sm text-gray-400">
            Launch Chrome sessions from a VM room to see live previews here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition cursor-pointer group"
              onClick={() => setSelectedSession(session)}
            >
              <div className="relative bg-gray-900 aspect-video">
                {session.latestScreenshot ? (
                  <img
                    src={session.latestScreenshot}
                    alt={session.url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Monitor size={24} className="text-gray-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      session.status === 'running'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                    }`}
                  >
                    ● LIVE
                  </span>
                </div>
                {session.screenshotUpdatedAt && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/80 bg-black/50 rounded px-1.5 py-0.5">
                    <Clock size={10} />
                    {new Date(session.screenshotUpdatedAt?.seconds * 1000).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <div className="flex items-center gap-1.5">
                  <Globe size={11} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{session.url}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSession && (
        <ScreenshotViewer
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
