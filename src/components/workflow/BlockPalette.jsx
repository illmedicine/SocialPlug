import { getBlocksForPlatform } from './WorkflowBlocks';

/**
 * Draggable block palette — sits on the left side of the workflow designer.
 */
export default function BlockPalette({ platformKey }) {
  const blocks = getBlocksForPlatform(platformKey);

  const categories = [
    { key: 'control', label: 'Control Flow' },
    { key: 'logic', label: 'Logic' },
    { key: 'action', label: 'Actions' },
  ];

  return (
    <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Workflow Blocks</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">Drag blocks to the canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-4">
        {categories.map((cat) => {
          const catBlocks = blocks.filter((b) => b.category === cat.key);
          if (catBlocks.length === 0) return null;
          return (
            <div key={cat.key}>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{cat.label}</h4>
              <div className="space-y-1">
                {catBlocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('blockType', block.type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200 cursor-grab active:cursor-grabbing transition group"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: block.color + '18' }}
                      >
                        <Icon size={14} style={{ color: block.color }} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-700 block truncate">{block.label}</span>
                        {block.isRoot && <span className="text-[9px] text-primary-500">Required</span>}
                        {block.isTerminal && <span className="text-[9px] text-red-400">Terminal</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
