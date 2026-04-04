import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useVMs } from '../hooks/useFirestore';
import {
  Camera,
  LogOut,
  Settings,
  Server,
  Activity,
} from 'lucide-react';
import { PLATFORMS } from './PlatformLogos';

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { vms, updateVM } = useVMs();
  const { vmId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const onlineCount = vms.filter((v) => v.status === 'online').length;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">SocialPlug</div>
            <div className="text-[10px] text-gray-400">by Illy Robotic Instruments</div>
          </div>
        </div>

        {/* Virtual Machines */}
        <div className="px-3 mt-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Virtual Machines
            </span>
          </div>

          <div className="space-y-0.5">
            {vms.map((vm) => {
              const isActive = vmId === vm.id || location.pathname === `/vm/${vm.id}`;
              return (
                <button
                  key={vm.id}
                  onClick={() => navigate(`/vm/${vm.id}`)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <Server size={15} className={isActive ? 'text-primary-500' : 'text-gray-400'} />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                        vm.status === 'online' ? 'bg-green-500' : vm.status === 'booting' ? 'bg-yellow-400' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate">{vm.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {vm.specs || 'Azure VM'}
                    </div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    vm.status === 'online'
                      ? 'bg-green-100 text-green-700'
                      : vm.status === 'booting'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {vm.status === 'online' ? 'READY' : vm.status === 'booting' ? 'BOOT' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* VM Pool Summary */}
          {vms.length > 0 && (
            <div className="mt-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Activity size={10} />
                  Pool Status
                </span>
                <span className="font-medium">{onlineCount}/{vms.length} online</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition ${
              location.pathname === '/' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Server size={16} className="text-gray-400" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/cameras')}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition ${
              location.pathname === '/cameras' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Camera size={16} className="text-gray-400" />
            <span>Live Monitors</span>
          </button>

          <div className="border-t border-gray-100 my-4" />

          {/* Platforms */}
          <div className="px-2 mb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Platforms
            </span>
          </div>
          {PLATFORMS.map((p) => {
            const isActive = location.pathname === `/platform/${p.key}`;
            return (
              <button
                key={p.key}
                onClick={() => navigate(`/platform/${p.key}`)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <p.Logo size={18} />
                <span>{p.label}</span>
              </button>
            );
          })}

          <div className="border-t border-gray-100 my-4" />

          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition ${
              location.pathname === '/settings' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings size={16} className="text-gray-400" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="flex-1" />

        {/* User */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <img
              src={user?.photoURL || ''}
              alt=""
              className="w-8 h-8 rounded-full bg-gray-200"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">
                {user?.displayName}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {user?.email}
              </div>
            </div>
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-red-500 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <Outlet context={{ vms }} />
        <div className="watermark">SocialPlug</div>
        <div className="watermark-sub">by Illy Robotic Instruments</div>
      </main>
    </div>
  );
}
