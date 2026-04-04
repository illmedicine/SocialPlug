import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAllSessions, useVMs } from '../hooks/useFirestore';
import {
  Server,
  Wifi,
  WifiOff,
  Activity,
  ExternalLink,
  Monitor,
  Loader2,
  Power,
} from 'lucide-react';

export default function DashboardPage() {
  const { vms } = useOutletContext();
  const { updateVM } = useVMs();
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
          Your Azure Free Tier VM cluster — {vms.length} cloud instances
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total VMs</div>
          <div className="text-2xl font-bold text-gray-900">{vms.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Ready</div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vms.map((vm) => {
          const vmSessions = sessions.filter((s) => s.vmId === vm.id);
          const isOn = vm.status === 'online' || vm.status === 'booting';
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
                        vm.status === 'online' ? 'bg-green-500' : vm.status === 'booting' ? 'bg-yellow-400' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{vm.name}</h3>
                    <div className="text-xs text-gray-400">
                      {vm.specs || 'Azure VM'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                  {/* On/Off toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateVM(vm.id, {
                        status: isOn ? 'offline' : 'pending-boot',
                      });
                    }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${isOn ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={isOn ? 'Turn off' : 'Turn on'}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Activity size={11} />
                  {vmSessions.length} active session{vmSessions.length !== 1 ? 's' : ''}
                </span>
                <span>{vm.provider === 'azure' ? 'Azure · Free Tier' : 'Cloud VM'}</span>
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
    </div>
  );
}
