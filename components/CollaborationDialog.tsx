import React, { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Radio, Copy, Check, Share2, Plug } from 'lucide-react';

interface CollaborationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  myPeerId: string | null;
  isConnected: boolean;
  connectionCount: number;
  onConnect: (peerId: string) => void;
}

export const CollaborationDialog: React.FC<CollaborationDialogProps> = ({
  isOpen,
  onClose,
  myPeerId,
  isConnected,
  connectionCount,
  onConnect,
}) => {
  const [targetPeerId, setTargetPeerId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (myPeerId) {
      navigator.clipboard.writeText(myPeerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPeerId.trim()) {
      onConnect(targetPeerId.trim());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="同時編集（P2P）"
      icon={
        <div className={`p-1.5 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-blue-100'}`}>
          <Share2 className={isConnected ? 'text-green-600' : 'text-blue-600'} size={20} />
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
          <p>
            サーバを介さず、ブラウザ同士で直接通信してタスクを同期します。<br/>
            あなたのIDを相手に教えるか、相手のIDを入力して接続してください。
          </p>
        </div>

        {/* Status Section */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-600">ステータス</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className={`text-sm font-bold ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
              {isConnected ? `接続中 (${connectionCount}人)` : '未接続'}
            </span>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* My ID Section */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            あなたのID (これを相手に共有)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 truncate select-all">
              {myPeerId || 'ID生成中...'}
            </div>
            <Button 
              variant="secondary" 
              onClick={handleCopyId}
              disabled={!myPeerId}
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
            >
              {copied ? 'コピー完了' : 'コピー'}
            </Button>
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">または</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Connect Section */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            相手のIDを入力して接続
          </label>
          <form onSubmit={handleConnect} className="flex gap-2">
            <input
              type="text"
              value={targetPeerId}
              onChange={(e) => setTargetPeerId(e.target.value)}
              placeholder="相手のIDを入力..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono"
            />
            <Button type="submit" disabled={!targetPeerId.trim() || isConnected} icon={<Plug size={16} />}>
              接続
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};