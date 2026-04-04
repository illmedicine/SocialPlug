import { useState } from 'react';
import { GripVertical, X, Check, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { getBlockDefinition } from './WorkflowBlocks';

/**
 * A single node rendered on the workflow canvas.
 * Displays icon, label, configuration status, and inline config editor.
 */
export default function WorkflowNode({
  node,
  platformKey,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  connectMode,
  onStartConnect,
  onCompleteConnect,
}) {
  const [expanded, setExpanded] = useState(false);
  const blockDef = getBlockDefinition(platformKey, node.type);

  if (!blockDef) return null;

  const Icon = blockDef.icon;
  const isConfigured = node.config && Object.keys(node.config).some((k) => node.config[k]);
  const hasDetailedConfig = node.config && Object.keys(node.config).filter((k) => node.config[k]).length >= 2;

  const handleFieldChange = (key, value) => {
    onUpdate(node.id, {
      ...node,
      config: { ...node.config, [key]: value },
    });
  };

  return (
    <div
      className={`absolute select-none ${isSelected ? 'z-20' : 'z-10'}`}
      style={{ left: node.x, top: node.y }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
    >
      <div
        className={`bg-white rounded-xl border-2 shadow-lg transition-all min-w-[180px] max-w-[280px] ${
          isSelected ? 'border-primary-500 shadow-primary-100 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
        } ${connectMode ? 'cursor-crosshair' : ''}`}
        onMouseDown={(e) => {
          if (connectMode) {
            e.stopPropagation();
            onCompleteConnect(node.id);
            return;
          }
          if (e.target.closest('[data-no-drag]')) return;
          onDragStart(e, node.id);
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
          style={{ backgroundColor: blockDef.color + '10' }}
        >
          <GripVertical size={12} className="text-gray-300 cursor-grab shrink-0" />
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: blockDef.color }}
          >
            <Icon size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-800 truncate">
              {node.label || blockDef.label}
            </div>
            <div className="text-[9px] text-gray-400">
              {isConfigured
                ? hasDetailedConfig ? '(Detailed Configuration)' : '(Configured)'
                : '(Not Configured)'}
            </div>
          </div>
          {isConfigured && (
            <Check size={14} className="text-green-500 shrink-0" />
          )}
          {!blockDef.isRoot && !blockDef.isTerminal && (
            <button
              data-no-drag
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="text-gray-300 hover:text-red-500 transition shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Inline Config Preview (collapsed) */}
        {isConfigured && !expanded && blockDef.fields.length > 0 && (
          <div className="px-3 py-1.5 border-t border-gray-100">
            {blockDef.fields.slice(0, 2).map((field) => {
              const val = node.config?.[field.key];
              if (!val) return null;
              return (
                <div key={field.key} className="text-[10px] text-gray-500 truncate">
                  <span className="font-medium text-gray-600">{field.label}: </span>
                  {typeof val === 'string' ? val : String(val)}
                </div>
              );
            })}
          </div>
        )}

        {/* Expand/Collapse toggle */}
        {blockDef.fields.length > 0 && (
          <button
            data-no-drag
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-gray-400 hover:text-gray-600 transition border-t border-gray-100"
          >
            <Settings size={10} />
            {expanded ? 'Collapse' : 'Configure'}
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}

        {/* Expanded Config Editor */}
        {expanded && (
          <div className="px-3 py-2 border-t border-gray-100 space-y-2" data-no-drag>
            {blockDef.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                  {field.label}
                </label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={node.config?.[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={node.config?.[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                )}
                {field.type === 'textarea' && (
                  <textarea
                    value={node.config?.[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={node.config?.[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
                  >
                    <option value="">— Select —</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'datetime' && (
                  <input
                    type="datetime-local"
                    value={node.config?.[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                )}
                {field.type === 'toggle' && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange(field.key, !node.config?.[field.key])}
                    className={`relative w-10 h-5 rounded-full transition ${
                      node.config?.[field.key] ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      node.config?.[field.key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                )}
                {field.type === 'media' && (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">+</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Drag or click to upload</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Connection Points */}
        {!blockDef.isRoot && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition z-30"
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              if (connectMode) onCompleteConnect(node.id);
            }}
            title="Input connector"
          />
        )}
        {!blockDef.isTerminal && (
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition z-30"
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(node.id);
            }}
            title="Click to connect"
          />
        )}

        {/* Branch connectors for condition nodes */}
        {blockDef.hasBranches && (
          <>
            <div className="absolute -bottom-2 left-[30%] -translate-x-1/2 text-[8px] font-bold text-green-600 mt-3" style={{ top: '100%' }}>
              True
            </div>
            <div className="absolute -bottom-2 left-[70%] -translate-x-1/2 text-[8px] font-bold text-red-500 mt-3" style={{ top: '100%' }}>
              False
            </div>
          </>
        )}
      </div>
    </div>
  );
}
