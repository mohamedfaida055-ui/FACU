import React, { useState } from 'react';
import { 
  Copy, 
  FileSpreadsheet, 
  Settings, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  LogIn
} from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import DataEditor from './components/DataEditor';
import ResultTabs from './components/ResultTabs';
import { ExtractedData, AppStatus, SheetConfig, ProcessedResult } from './types';
import { extractDataFromImage } from './services/geminiService';
import { exportToGoogleSheet } from './services/googleSheetsService';

const App: React.FC = () => {
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>({
    spreadsheetId: '',
    clientId: ''
  });
  
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Find the currently active result from the results array
  const activeResult = results.find(r => r.id === activeResultId);

  // Helper to update a specific result in the state
  const updateResult = (id: string, updates: Partial<ProcessedResult>) => {
    setResults(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleImageSelect = async (base64: string) => {
    const newResultId = `result-${Date.now()}`;
    const newResult: ProcessedResult = {
      id: newResultId,
      name: `Result ${results.length + 1}`,
      image: base64,
      data: { fields: [], tables: [] },
      status: AppStatus.ANALYZING,
      errorMessage: null,
    };

    setResults(prev => [...prev, newResult]);
    setActiveResultId(newResultId);

    try {
      const extractedData = await extractDataFromImage(base64);
      updateResult(newResultId, { data: extractedData, status: AppStatus.SUCCESS });
    } catch (error: any) { 
      console.error(error);
      updateResult(newResultId, {
        status: AppStatus.ERROR,
        errorMessage: error.message || "Failed to extract data.",
      });
    }
  };

  const copyToClipboard = () => {
    if (!activeResult?.data) return;

    let text = "--- DETAILS ---\n";
    activeResult.data.fields.forEach(f => {
      text += `${f.label}: ${f.value}\n`;
    });

    if (activeResult.data.tables.length > 0) {
      text += "\n--- TABLES ---\n";
      activeResult.data.tables.forEach(t => {
        text += `[${t.name}]\n`;
        text += t.headers.join('\t') + '\n';
        t.rows.forEach(row => {
          text += row.values.join('\t') + '\n';
        });
        text += '\n';
      });
    }

    navigator.clipboard.writeText(text);
    alert("Data for active tab copied to clipboard!");
  };

  const handleCloseTab = (id: string) => {
    const remainingResults = results.filter(r => r.id !== id);

    if (activeResultId === id) {
      if (remainingResults.length > 0) {
        setActiveResultId(remainingResults[remainingResults.length - 1].id);
      } else {
        setActiveResultId(null);
      }
    }

    setResults(remainingResults);
  };

  const handleRenameTab = (id: string, newName: string) => {
    updateResult(id, { name: newName });
  };

  const handleGoogleLogin = () => {
    if (!sheetConfig.clientId) {
      alert("Please enter your Google Client ID in settings first.");
      setShowSettings(true);
      return;
    }

    if (!window.google) {
      alert("Google Identity Services script not loaded.");
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: sheetConfig.clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          setGoogleAccessToken(tokenResponse.access_token);
          alert("Connected to Google successfully! You can now export.");
        }
      },
    });

    tokenClient.requestAccessToken();
  };

  const handleExportToSheets = async () => {
    if (!sheetConfig.spreadsheetId) {
      setShowSettings(true);
      alert("Please enter the Spreadsheet ID.");
      return;
    }

    if (!googleAccessToken) {
      const confirmLogin = window.confirm("You need to connect to Google Sheets first. Connect now?");
      if (confirmLogin) {
        handleGoogleLogin();
      }
      return;
    }

    if (!activeResult) {
      alert("No active document to export.");
      return;
    }

    updateResult(activeResult.id, { status: AppStatus.EXPORTING });
    try {
      const sheetName = activeResult.name;
      await exportToGoogleSheet(sheetConfig.spreadsheetId, googleAccessToken, activeResult.data, sheetName);
      alert(`Success! Data exported to sheet: ${sheetName}`);
      updateResult(activeResult.id, { status: AppStatus.SUCCESS });
    } catch (error: any) {
      console.error(error);
      alert(`Export Failed: ${error.message}`);
      updateResult(activeResult.id, { status: AppStatus.SUCCESS });
      
      if (error.message.includes("401") || error.message.includes("unauthorized")) {
        setGoogleAccessToken(null);
        alert("Session expired. Please connect again.");
      }
    }
  };

  const downloadCSV = () => {
    if (!activeResult?.data) return;

    const resultData = activeResult.data;
    let headers: string[] = resultData.fields.map(f => f.label);
    let rows: string[][] = [resultData.fields.map(f => String(f.value))];

    if (resultData.tables.length > 0) {
      const mainTable = resultData.tables[0];
      headers = [...headers, ...mainTable.headers];
      rows = [];
      
      const globalVals = resultData.fields.map(f => String(f.value));
      mainTable.rows.forEach(r => {
        rows.push([...globalVals, ...r.values]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.map(h => `"${h}"`).join(",") + "\n" 
      + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `extracted_data_${results.findIndex(r => r.id === activeResultId) + 1}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasData = (activeResult?.data?.fields?.length ?? 0) > 0 || (activeResult?.data?.tables?.length ?? 0) > 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 font-sans">
      
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="text-green-600" />
                Google Sheets Setup
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">Close</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Spreadsheet ID</label>
                <input 
                  type="text" 
                  value={sheetConfig.spreadsheetId}
                  onChange={(e) => setSheetConfig(prev => ({...prev, spreadsheetId: e.target.value}))}
                  placeholder="e.g. 1BxiMVs0XRA5nFMd..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Found in your Google Sheet URL.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">OAuth Client ID</label>
                <input 
                  type="text" 
                  value={sheetConfig.clientId}
                  onChange={(e) => setSheetConfig(prev => ({...prev, clientId: e.target.value}))}
                  placeholder="e.g. 123456...apps.googleusercontent.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <p>To enable "Sign in with Google":</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to Google Cloud Console {'>'} APIs & Services.</li>
                    <li>Create Credentials {'>'} OAuth Client ID (Web App).</li>
                    <li>Add your Netlify URL to <strong>Authorized JavaScript origins</strong>.</li>
                    <li>Copy Client ID here.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 gap-6">
        
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="bg-brand-600 text-white p-2 rounded-lg">
                <Sparkles size={24} />
              </span>
              LensLogic
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              AI-Powered Vision Extractor & Sheet Sync
            </p>
          </div>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors flex items-center gap-2"
            title="Settings"
          >
            {googleAccessToken ? (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Connected
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">Not Connected</span>
            )}
            <Settings size={24} />
          </button>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          
          <section className="flex flex-col gap-4">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
               <ImageUploader 
                 onImageSelected={handleImageSelect} 
                 isLoading={results.some(r => r.status === AppStatus.ANALYZING)} 
               />
            </div>

            {activeResult && (
              <div className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
                <img 
                  src={activeResult.image} 
                  alt="Preview" 
                  className="max-w-full max-h-[500px] object-contain opacity-90"
                />
                
                {activeResult.status === AppStatus.ANALYZING && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                    <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-4" />
                    <p className="text-white font-medium text-lg animate-pulse">Analyzing document...</p>
                    <p className="text-slate-300 text-sm mt-2">Extracting fields and tables.</p>
                  </div>
                )}
                
                {activeResult.status === AppStatus.ERROR && (
                   <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10 p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-white font-bold text-lg">Extraction Failed</p>
                    <p className="text-red-200 text-sm mt-2">{activeResult.errorMessage}</p>
                    <button 
                      onClick={() => updateResult(activeResult.id, { status: AppStatus.IDLE })} 
                      className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 min-h-[400px]">
            <ResultTabs 
              results={results}
              activeResultId={activeResultId}
              onSelectTab={setActiveResultId}
              onCloseTab={handleCloseTab}
              onRenameTab={handleRenameTab}
            />
            <DataEditor 
              key={activeResultId}
              data={activeResult?.data ?? { fields: [], tables: [] }}
              onChange={(newData) => {
                if (activeResultId) {
                  updateResult(activeResultId, { data: newData });
                }
              }}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               <button 
                 onClick={copyToClipboard}
                 disabled={!hasData}
                 className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
               >
                 <Copy size={18} />
                 <span>Copy Text</span>
               </button>

               <button 
                 onClick={downloadCSV}
                 disabled={!hasData}
                 className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
               >
                 <Download size={18} />
                 <span>CSV</span>
               </button>

               {!googleAccessToken ? (
                 <button 
                   onClick={handleGoogleLogin}
                   className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                 >
                   <LogIn size={18} />
                   <span>Connect Google</span>
                 </button>
               ) : (
                 <button 
                   onClick={handleExportToSheets}
                   disabled={!hasData || activeResult?.status === AppStatus.EXPORTING}
                   className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {activeResult?.status === AppStatus.EXPORTING ? (
                     <Loader2 size={18} className="animate-spin" />
                   ) : (
                     <FileSpreadsheet size={18} />
                   )}
                   <span>Export Sheet</span>
                 </button>
               )}
            </div>
            
            {activeResult?.status === AppStatus.SUCCESS && hasData && (
              <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-500">
                <CheckCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">Ready! Data & Tables extracted successfully.</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default App;