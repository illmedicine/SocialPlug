import { Save, Play, Power, PowerOff, Loader2 } from 'lucide-react';

/**
 * Workflow Canvas Settings bar — top-right panel with status, save, run/test, and disable controls.
 */
export default function WorkflowSettingsBar({
  workflow,
  isSaving,
  onSave,
  onRunTest,
  onToggleStatus,
}) {
  const isActive = workflow?.status === 'active';

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      {/* Left — Title & account */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-bold text-gray-800 truncate">
          {workflow?.name || 'Untitled Workflow'}
        </h1>
        {workflow?.accountHandle && (
          <span className="text-xs text-gray-400 shrink-0">
            @{workflow.accountHandle}
          </span>
        )}
      </div>

      {/* Right — Status + Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
            {isActive ? 'Active' : workflow?.status === 'testing' ? 'Testing' : 'Inactive'}
          </span>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Saving...' : 'Update Workflow'}
        </button>

        {/* Run Test */}
        <button
          onClick={onRunTest}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition"
        >
          <Play size={14} />
          Run Test
        </button>

        {/* Toggle */}
        <button
          onClick={onToggleStatus}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
            isActive
              ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
              : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'
          }`}
        >
          {isActive ? <PowerOff size={14} /> : <Power size={14} />}
          {isActive ? 'Disable Workflow' : 'Enable Workflow'}
        </button>
      </div>
    </div>
  );
}
