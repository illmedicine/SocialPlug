import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import BlockPalette from '../components/workflow/BlockPalette';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import WorkflowSettingsBar from '../components/workflow/WorkflowSettingsBar';
import { useWorkflows } from '../hooks/useWorkflows';
import { PLATFORMS } from '../components/PlatformLogos';

export default function WorkflowDesignerPage() {
  const { platformKey, workflowId } = useParams();
  const navigate = useNavigate();
  const { workflows, createWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows(platformKey);

  const platform = PLATFORMS.find((p) => p.key === platformKey);

  // Workflow state
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHandle, setNewHandle] = useState('');

  // Load workflow by ID
  useEffect(() => {
    if (workflowId && workflowId !== 'new' && workflows.length > 0) {
      const wf = workflows.find((w) => w.id === workflowId);
      if (wf) {
        setCurrentWorkflow(wf);
        setNodes(wf.nodes || []);
        setConnections(wf.connections || []);
      }
    } else if (workflowId === 'new') {
      setShowNewDialog(true);
    }
  }, [workflowId, workflows]);

  const handleCreateNew = async () => {
    if (!newName.trim()) return;
    const id = await createWorkflow(newName.trim(), newHandle.trim());
    if (id) {
      setShowNewDialog(false);
      setNewName('');
      setNewHandle('');
      navigate(`/platform/${platformKey}/workflow/${id}`, { replace: true });
    }
  };

  const handleSave = async () => {
    if (!currentWorkflow) return;
    setIsSaving(true);
    await updateWorkflow(currentWorkflow.id, { nodes, connections });
    setIsSaving(false);
  };

  const handleRunTest = () => {
    if (!currentWorkflow) return;
    updateWorkflow(currentWorkflow.id, { status: 'testing', nodes, connections });
  };

  const handleToggleStatus = () => {
    if (!currentWorkflow) return;
    const newStatus = currentWorkflow.status === 'active' ? 'inactive' : 'active';
    updateWorkflow(currentWorkflow.id, { status: newStatus, nodes, connections });
    setCurrentWorkflow({ ...currentWorkflow, status: newStatus });
  };

  const handleDeleteWorkflow = async (wfId) => {
    await deleteWorkflow(wfId);
    if (currentWorkflow?.id === wfId) {
      setCurrentWorkflow(null);
      setNodes([]);
      setConnections([]);
      navigate(`/platform/${platformKey}/workflow`, { replace: true });
    }
  };

  const Logo = platform?.Logo;

  // List view (no workflow selected)
  if (!currentWorkflow && workflowId !== 'new') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/platform/${platformKey}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <ArrowLeft size={16} />
          Back to {platform?.label || 'Platform'}
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {Logo && (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: platform.color + '15' }}>
                <Logo className="w-6 h-6" style={{ color: platform.color }} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {platform?.label} Automation Workflows
              </h1>
              <p className="text-sm text-gray-400">Create and manage your automation pipelines</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={16} />
            New Workflow
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4 opacity-20">⚡</div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No workflows yet</h3>
            <p className="text-sm text-gray-400 mb-6">Create your first automation workflow to get started</p>
            <button
              onClick={() => setShowNewDialog(true)}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
            >
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-primary-200 transition cursor-pointer p-4 flex items-center justify-between group"
                onClick={() => navigate(`/platform/${platformKey}/workflow/${wf.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    wf.status === 'active' ? 'bg-green-500 animate-pulse' :
                    wf.status === 'testing' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{wf.name}</h3>
                    <p className="text-xs text-gray-400">
                      {wf.accountHandle && `@${wf.accountHandle} · `}
                      {(wf.nodes?.length || 0)} blocks · {wf.status}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); }}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New Workflow Dialog */}
        {showNewDialog && (
          <NewWorkflowDialog
            platformLabel={platform?.label}
            newName={newName}
            setNewName={setNewName}
            newHandle={newHandle}
            setNewHandle={setNewHandle}
            onClose={() => { setShowNewDialog(false); setNewName(''); setNewHandle(''); }}
            onCreate={handleCreateNew}
          />
        )}
      </div>
    );
  }

  // Designer view
  return (
    <div className="flex flex-col h-full overflow-hidden -m-6">
      {/* Settings Bar */}
      <WorkflowSettingsBar
        workflow={currentWorkflow}
        isSaving={isSaving}
        onSave={handleSave}
        onRunTest={handleRunTest}
        onToggleStatus={handleToggleStatus}
      />

      {/* Main area: Palette + Canvas */}
      <div className="flex flex-1 overflow-hidden">
        <BlockPalette platformKey={platformKey} />
        <WorkflowCanvas
          nodes={nodes}
          connections={connections}
          platformKey={platformKey}
          onNodesChange={setNodes}
          onConnectionsChange={setConnections}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* New Workflow Dialog */}
      {showNewDialog && (
        <NewWorkflowDialog
          platformLabel={platform?.label}
          newName={newName}
          setNewName={setNewName}
          newHandle={newHandle}
          setNewHandle={setNewHandle}
          onClose={() => { setShowNewDialog(false); setNewName(''); setNewHandle(''); navigate(`/platform/${platformKey}/workflow`); }}
          onCreate={handleCreateNew}
        />
      )}
    </div>
  );
}

function NewWorkflowDialog({ platformLabel, newName, setNewName, newHandle, setNewHandle, onClose, onCreate }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-1">New {platformLabel} Workflow</h2>
        <p className="text-xs text-gray-400 mb-5">Create a new automation workflow pipeline</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Workflow Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Morning Post Automation"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Handle</label>
            <input
              type="text"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              placeholder="@youraccount"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newName.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-40"
          >
            Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
