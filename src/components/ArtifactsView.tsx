import React, { useState } from 'react';
import { 
  FolderArchive, 
  FileText, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  X,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';
import { Artifact } from '../types.ts';

interface ArtifactsViewProps {
  artifacts: Artifact[];
  selectedArtifactId?: string;
  onSelectArtifact: (id: string) => void;
}

export const ArtifactsView: React.FC<ArtifactsViewProps> = ({
  artifacts,
  selectedArtifactId,
  onSelectArtifact,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeModalArtifact, setActiveModalArtifact] = useState<Artifact | null>(
    artifacts.find(a => a.id === selectedArtifactId) || null
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="artifacts-view" className="flex-1 flex flex-col h-full bg-[#08090d] text-slate-100 overflow-y-auto p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#181d29] pb-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-indigo-400" />
            <span>Durable Artifacts & Evidence</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audited deliverables, variance ledgers, cryptographic receipts, and customer export packages.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#101420] text-slate-400 border border-[#1e2538]">
          {artifacts.length} Deliverables Stored
        </span>
      </div>

      {/* Artifacts Grid or Empty State */}
      {artifacts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0e121d] border border-[#1b2234] flex items-center justify-center text-slate-500">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Artifacts Generated Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When persistent bots complete reconciliation tasks, financial closes, or research audits, versioned artifacts with SHA-256 receipts will be archived here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {artifacts.map(art => (
            <div
              key={art.id}
              className="bg-[#0e121d] border border-[#1c2336] rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                      {art.type === 'ledger' ? (
                        <FileSpreadsheet className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 leading-tight">{art.name}</h3>
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5 font-mono">
                        <span>v{art.version}.0</span>
                        <span>•</span>
                        <span>{art.size}</span>
                        <span>•</span>
                        <span>Author: {art.authorAgentId}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    art.acceptanceState === 'ACCEPTED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {art.acceptanceState}
                  </span>
                </div>

                {/* Source References */}
                <div className="bg-[#080a10] p-2.5 rounded-xl border border-[#161c2b] text-[11px] space-y-1 mb-3">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider font-mono">
                    Traceable Sources ({art.sourceRefs.length})
                  </span>
                  {art.sourceRefs.map((ref, idx) => (
                    <p key={idx} className="text-slate-300 truncate font-mono text-[10.5px]">
                      ↳ {ref}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#181f2f]">
                <button
                  onClick={() => setActiveModalArtifact(art)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Deliverable</span>
                </button>
                <button
                  onClick={() => handleDownload(art)}
                  className="p-1.5 rounded-xl bg-[#141926] hover:bg-[#1d2538] text-slate-300 border border-[#232c3f] transition-colors"
                  title="Download Artifact"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Content Inspection Modal */}
      {activeModalArtifact && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121d] border border-[#1c2336] rounded-2xl max-w-3xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden text-slate-200 font-sans">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1c2336] flex items-center justify-between bg-[#0a0d15]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-bold text-white">{activeModalArtifact.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Hash: {activeModalArtifact.checksum} • {activeModalArtifact.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeModalArtifact.content)}
                  className="p-1.5 rounded-lg bg-[#141926] hover:bg-[#1d2538] text-slate-300 transition-colors"
                  title="Copy content"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDownload(activeModalArtifact)}
                  className="p-1.5 rounded-lg bg-[#141926] hover:bg-[#1d2538] text-slate-300 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveModalArtifact(null)}
                  className="p-1.5 rounded-lg hover:bg-[#141926] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs bg-[#06070a] text-slate-300 leading-relaxed whitespace-pre-wrap">
              {activeModalArtifact.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
