import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAllSessions } from '../hooks/useFirestore';
import {
  Server,
  Wifi,
  WifiOff,
  Globe,
  Activity,
  ExternalLink,
  Monitor,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const { vms } = useOutletContext();
  const { sessions } = useAllSessions();
  const navigate = useNavigate();

  const onlineCount = vms.filter((v) => v.status === 'online').length;
  const totalSessions = sessions.length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">VM Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your cloud VM fleet and Chrome sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total VMs</div>
          <div className="text-2xl font-bold text-gray-900">{vms.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Online</div>
          <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Offline</div>
          <div className="text-2xl font-bold text-gray-400">{vms.length - onlineCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Active Sessions</div>
          <div className="text-2xl font-bold text-primary-600">{totalSessions}</div>
        </div>
      </div>

      {/* VM Grid */}
      {vms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center mb-4">
            <Server size={42} className="text-primary-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-1">No Virtual Machines</h3>
          <p className="text-sm text-gray-500 mb-4">
            Register your first VM from the sidebar to start launching Chrome sessions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vms.map((vm) => {
            const vmSessions = sessions.filter((s) => s.vmId === vm.id);
            return (
              <div
                key={vm.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition cursor-pointer group"
                onClick={() => navigate(`/vm/${vm.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Server size={20} className="text-gray-500" />
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          vm.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{vm.name}</h3>
                      <div className="text-xs text-gray-400 font-mono">
                        {vm.publicIP || 'No IP assigned'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                      vm.status === 'online'
                        ? 'bg-green-100 text-green-700'
                        : vm.status === 'booting'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {vm.status === 'online' ? <Wifi size={11} /> : vm.status === 'booting' ? <Loader2 size={11} className="animate-spin" /> : <WifiOff size={11} />}
                    {vm.status === 'online' ? 'Ready' : vm.status === 'booting' ? 'Booting' : 'Offline'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Activity size={11} />
                    {vmSessions.length} active session{vmSessions.length !== 1 ? 's' : ''}
                  </span>
                  <span>{vm.provider || 'Oracle Cloud'}</span>
                </div>

                {/* Session previews */}
                {vmSessions.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {vmSessions.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex-shrink-0 w-28 bg-gray-900 rounded overflow-hidden aspect-video">
                        {s.latestScreenshot ? (
                          <img src={s.latestScreenshot} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Monitor size={14} className="text-gray-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    {vmSessions.length > 3 && (
                      <div className="flex-shrink-0 w-28 bg-gray-100 rounded aspect-video flex items-center justify-center text-xs text-gray-500">
                        +{vmSessions.length - 3} more
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-end">
                  <span className="text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    <ExternalLink size={12} /> Manage Sessions
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
