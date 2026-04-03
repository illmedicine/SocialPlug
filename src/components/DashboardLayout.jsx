import { useState } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnvironments } from '../hooks/useFirestore';
import {
  Monitor,
  Camera,
  Zap,
  Users,
  FlaskConical,
  Plus,
  LogOut,
  ChevronRight,
  Settings,
  Building2,
} from 'lucide-react';
import AddEnvironmentModal from './AddEnvironmentModal';
import { PLATFORMS } from './PlatformLogos';

const NAV_ITEMS = [
  { key: 'rooms', label: 'Rooms', icon: Building2, path: '' },
  { key: 'cameras', label: 'Cameras', icon: Camera, path: 'cameras' },
  { key: 'automations', label: 'Automations', icon: Zap, path: '' },
  { key: 'presence', label: 'Presence', icon: Users, path: '' },
];

export default function DashboardLayout() {
  const { user, profile, signOut } = useAuth();
  const { environments, addEnvironment } = useEnvironments();
  const { envId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddEnv, setShowAddEnv] = useState(false);

  const selectedEnv = environments.find((e) => e.id === envId) || environments[0];

  const handleEnvClick = (env) => {
    navigate(`/environment/${env.id}`);
  };

  const handleNavClick = (item) => {
    if (item.path === 'cameras') {
      navigate('/cameras');
    } else if (selectedEnv) {
      navigate(`/environment/${selectedEnv.id}`);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Echo Vue</div>
            <div className="text-[10px] text-gray-400">by Illy Robotics</div>
          </div>
        </div>

        {/* Environments */}
        <div className="px-3 mt-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Environments
            </span>
            <button
              onClick={() => setShowAddEnv(true)}
              className="text-gray-400 hover:text-primary-600 transition"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-0.5">
            {environments.map((env) => (
              <button
                key={env.id}
                onClick={() => handleEnvClick(env)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                  selectedEnv?.id === env.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{env.icon || '🏢'}</span>
                <span className="truncate">{env.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item)}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              <item.icon size={16} className="text-gray-400" />
              <span>{item.label}</span>
            </button>
          ))}

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
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            <Settings size={16} className="text-gray-400" />
            <span>Settings</span>
          </button>

          <button
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            <FlaskConical size={16} className="text-gray-400" />
            <span>Research</span>
          </button>
        </nav>

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
        <Outlet context={{ selectedEnv, environments }} />
        <div className="watermark">Echo Vue</div>
        <div className="watermark-sub">by Illy Robotics</div>
      </main>

      {/* Add Environment Modal */}
      {showAddEnv && (
        <AddEnvironmentModal
          onClose={() => setShowAddEnv(false)}
          onAdd={async (name, icon) => {
            const ref = await addEnvironment(name, icon);
            setShowAddEnv(false);
            navigate(`/environment/${ref.id}`);
          }}
        />
      )}
    </div>
  );
}
