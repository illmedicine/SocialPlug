import { useState } from 'react';
import { X } from 'lucide-react';

const ICONS = ['🏢', '🏠', '🚀', '🏭', '🏗️', '🌐', '🖥️', '☁️', '🔬', '📡'];

export default function AddEnvironmentModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏢');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onAdd(name.trim(), icon);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">New Environment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
          <div className="flex gap-2 mb-4 flex-wrap">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition ${
                  icon === i
                    ? 'bg-primary-100 ring-2 ring-primary-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {i}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Environment Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Buffalo HQ"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
            autoFocus
          />

          <div className="flex justify-end gap-2">
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
              Create Environment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
