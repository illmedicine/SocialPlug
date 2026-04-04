import { useState } from 'react';
import { X } from 'lucide-react';

export default function AddVMModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [publicIP, setPublicIP] = useState('');
  const [provider, setProvider] = useState('oracle');
  const [sshHost, setSshHost] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({
        name: name.trim(),
        publicIP: publicIP.trim(),
        provider,
        sshHost: sshHost.trim(),
        activeSessions: 0,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Virtual Machine</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VM Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VM-1 (Oracle ARM)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cloud Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="oracle">Oracle Cloud (Always Free)</option>
              <option value="gcp">Google Cloud (Free Tier)</option>
              <option value="aws">AWS (Free Tier)</option>
              <option value="azure">Azure (Free Tier)</option>
              <option value="custom">Custom / Self-hosted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public IP Address
            </label>
            <input
              type="text"
              value={publicIP}
              onChange={(e) => setPublicIP(e.target.value)}
              placeholder="e.g. 129.153.x.x"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Each VM gets a unique public IP from your cloud provider
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SSH / Agent Endpoint
            </label>
            <input
              type="text"
              value={sshHost}
              onChange={(e) => setSshHost(e.target.value)}
              placeholder="e.g. user@129.153.x.x"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
            >
              Add VM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
