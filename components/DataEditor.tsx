import React from 'react';
import { ExtractedData, Field, Table } from '../types';
import { Trash2, Plus, GripVertical } from 'lucide-react';

interface DataEditorProps {
  data: ExtractedData;
  onChange: (newData: ExtractedData) => void;
}

const DataEditor: React.FC<DataEditorProps> = ({ data, onChange }) => {
  const hasFields = data.fields && data.fields.length > 0;
  const hasTables = data.tables && data.tables.length > 0;

  if (!hasFields && !hasTables) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <p>No data extracted yet.</p>
        <p className="text-sm mt-2">Upload an image to start magic extraction.</p>
      </div>
    );
  }

  // --- Field Handlers ---

  const handleFieldChange = (index: number, key: 'label' | 'value', newVal: string) => {
    const newFields = [...data.fields];
    newFields[index] = { ...newFields[index], [key]: newVal };
    onChange({ ...data, fields: newFields });
  };

  const deleteField = (index: number) => {
    const newFields = data.fields.filter((_, i) => i !== index);
    onChange({ ...data, fields: newFields });
  };

  const addField = () => {
    onChange({
      ...data,
      fields: [...data.fields, { label: "NEW FIELD", value: "" }]
    });
  };

  // --- Table Handlers ---

  const handleTableCellChange = (tableIndex: number, rowIndex: number, cellIndex: number, val: string) => {
    const newTables = [...data.tables];
    const newRows = [...newTables[tableIndex].rows];
    const newValues = [...newRows[rowIndex].values];
    
    newValues[cellIndex] = val;
    newRows[rowIndex] = { ...newRows[rowIndex], values: newValues };
    newTables[tableIndex] = { ...newTables[tableIndex], rows: newRows };
    
    onChange({ ...data, tables: newTables });
  };

  const handleHeaderChange = (tableIndex: number, headerIndex: number, val: string) => {
    const newTables = [...data.tables];
    const newHeaders = [...newTables[tableIndex].headers];
    newHeaders[headerIndex] = val;
    newTables[tableIndex] = { ...newTables[tableIndex], headers: newHeaders };
    onChange({ ...data, tables: newTables });
  };

  const deleteTableRow = (tableIndex: number, rowIndex: number) => {
    const newTables = [...data.tables];
    newTables[tableIndex].rows = newTables[tableIndex].rows.filter((_, i) => i !== rowIndex);
    onChange({ ...data, tables: newTables });
  };

  const addTableRow = (tableIndex: number) => {
    const newTables = [...data.tables];
    const emptyRow = new Array(newTables[tableIndex].headers.length).fill("");
    newTables[tableIndex].rows.push({ values: emptyRow });
    onChange({ ...data, tables: newTables });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)]">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-semibold text-slate-800">Extracted Data</h3>
        <div className="flex gap-2">
          {hasFields && <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{data.fields.length} Fields</span>}
          {hasTables && <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{data.tables.length} Tables</span>}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* GLOBAL FIELDS SECTION */}
        {hasFields && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Document Details</h4>
            {data.fields.map((field, i) => (
              <div key={i} className="group flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldChange(i, 'label', e.target.value)}
                    className="col-span-1 text-xs font-bold text-slate-500 uppercase tracking-wide bg-transparent border-b border-transparent focus:border-brand-500 focus:outline-none py-1"
                    placeholder="LABEL"
                  />
                  <input
                    type="text"
                    value={String(field.value)}
                    onChange={(e) => handleFieldChange(i, 'value', e.target.value)}
                    className="col-span-1 sm:col-span-2 text-sm text-slate-800 bg-slate-100/50 focus:bg-white border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-all"
                    placeholder="Value..."
                  />
                </div>
                <button onClick={() => deleteField(i)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={addField} className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium mt-2 px-2">
              <Plus size={14} /> Add Field
            </button>
          </div>
        )}

        {/* TABLES SECTION */}
        {hasTables && data.tables.map((table, tIdx) => (
          <div key={tIdx} className="space-y-3 pt-4 border-t border-slate-100">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider">{table.name || `Table ${tIdx + 1}`}</h4>
             </div>
             
             <div className="overflow-x-auto border border-slate-200 rounded-lg">
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="px-3 py-2 w-8">#</th>
                     {table.headers.map((header, hIdx) => (
                       <th key={hIdx} className="px-1 py-1 min-w-[120px]">
                         <input 
                           value={header} 
                           onChange={(e) => handleHeaderChange(tIdx, hIdx, e.target.value)}
                           className="w-full bg-transparent p-2 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200 rounded" 
                         />
                       </th>
                     ))}
                     <th className="px-2 py-2 w-8"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {table.rows.map((row, rIdx) => (
                     <tr key={rIdx} className="group hover:bg-slate-50">
                       <td className="px-3 py-2 text-xs text-slate-400 font-mono">{rIdx + 1}</td>
                       {row.values.map((cell, cIdx) => (
                         <td key={cIdx} className="px-1 py-1">
                           <input
                             type="text"
                             value={cell}
                             onChange={(e) => handleTableCellChange(tIdx, rIdx, cIdx, e.target.value)}
                             className="w-full bg-transparent p-2 text-slate-700 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 transition-all"
                           />
                         </td>
                       ))}
                       <td className="px-2 py-2 text-right">
                         <button onClick={() => deleteTableRow(tIdx, rIdx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                           <Trash2 size={14} />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               
               <button 
                onClick={() => addTableRow(tIdx)}
                className="w-full py-2 bg-slate-50 text-slate-500 text-xs font-medium hover:bg-slate-100 transition-colors border-t border-slate-200"
               >
                 + Add Row
               </button>
             </div>
          </div>
        ))}

        {!hasFields && !hasTables && (
          <div className="text-center py-10">
            <button onClick={addField} className="text-brand-600 font-medium hover:underline">Start adding fields manually</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataEditor;