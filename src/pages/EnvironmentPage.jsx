import { useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useVMs } from '../hooks/useFirestore';
import { Plus, Server, Wifi, WifiOff, Trash2, ExternalLink } from 'lucide-react';
import AddVMModal from '../components/AddVMModal';

export default function EnvironmentPage() {
  const { selectedEnv } = useOutletContext();
  const { envId } = useParams();
  const activeEnvId = envId || selectedEnv?.id;
  const { vms, loading, addVM, deleteVM } = useVMs(activeEnvId);
  const [showAddVM, setShowAddVM] = useState(false);
  const navigate = useNavigate();

  if (!selectedEnv && !envId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <Server size={36} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Environment Selected</h2>
        <p className="text-gray-500 text-sm">
          Create an environment from the sidebar to get started.
        </p>
      </div>
    );
  }

  const env = selectedEnv;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>{env?.icon}</span> {env?.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {vms.length} room{vms.length !== 1 ? 's' : ''} &middot;{' '}
            {vms.filter((v) => v.status === 'online').length} calibrated
          </p>
        </div>
        <button
          onClick={() => setShowAddVM(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus size={16} /> Add Room
        </button>
      </div>

      {/* VM Grid */}
      {vms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center mb-4 relative">
            <Server size={48} className="text-primary-300" />
            <div className="absolute top-4 right-4 w-6 h-6 bg-orange-200 rounded" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            No rooms in {env?.name}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Add rooms to map and calibrate each space
          </p>
          <button
            onClick={() => setShowAddVM(true)}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
          >
            Add Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vms.map((vm) => (
            <div
              key={vm.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition cursor-pointer group"
              onClick={() => navigate(`/environment/${activeEnvId}/vm/${vm.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-gray-400" />
                  <h3 className="font-semibold text-gray-800">{vm.name}</h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    vm.status === 'online'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {vm.status === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {vm.status}
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <div>IP: <span className="font-mono">{vm.publicIP || 'Not assigned'}</span></div>
                <div>Sessions: <span className="font-medium">{vm.activeSessions || 0}/10</span></div>
                <div>Provider: <span className="font-medium">{vm.provider || 'Oracle Cloud'}</span></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                  <ExternalLink size={12} /> Manage Sessions
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this VM?')) deleteVM(vm.id);
                  }}
                  className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddVM && (
        <AddVMModal
          onClose={() => setShowAddVM(false)}
          onAdd={async (data) => {
            await addVM(data);
            setShowAddVM(false);
          }}
        />
      )}
    </div>
  );
}
