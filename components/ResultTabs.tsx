import React, { useState } from 'react';
import { ProcessedResult, AppStatus } from '../types';
import { Loader2, X, FileText } from 'lucide-react';

interface ResultTabsProps {
  results: ProcessedResult[];
  activeResultId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newName: string) => void;
}

const ResultTabs: React.FC<ResultTabsProps> = ({ results, activeResultId, onSelectTab, onCloseTab, onRenameTab }) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEditing = (result: ProcessedResult) => {
    setEditingTabId(result.id);
    setEditingName(result.name);
  };

  const handleFinishEditing = () => {
    if (editingTabId && editingName.trim()) {
      onRenameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingName('');
    }
  };

  if (results.length === 0) {
    return null; // Don't render anything if there are no results
  }

  return (
    <div className="flex items-center border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2">
      <div className="flex space-x-1">
        {results.map((result) => (
          <div
            key={result.id}
            onDoubleClick={() => handleStartEditing(result)}
            onClick={() => onSelectTab(result.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 rounded-t-md transition-colors cursor-pointer ${
              activeResultId === result.id
                ? 'border-brand-600 text-brand-700 bg-brand-50'
                : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {result.status === AppStatus.ANALYZING ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}

            {editingTabId === result.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-transparent outline-none w-24"
              />
            ) : (
              <span>{result.name}</span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(result.id);
              }}
              className="p-0.5 rounded-full hover:bg-slate-400/20"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultTabs;