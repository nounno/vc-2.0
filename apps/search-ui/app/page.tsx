'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Mic, MicOff, X, ChevronRight, Building2, Package, TrendingUp } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{
    id: number;
    brand: string;
    model: string;
    category: string;
    price: number | null;
    updated_at: string;
    confidence: number | null;
    quality_tier: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showWechatQR, setShowWechatQR] = useState(false);
  const recognitionRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search handler — calls real API
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, handleSearch]);

  // Voice search
  const toggleVoiceSearch = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音搜索');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.08), transparent 50%), #070b12',
      }}
    >
      {/* Header */}
      <header className="border-b border-[#263246] bg-[#070b12]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#070b12] font-bold text-lg"
              style={{ background: '#38bdf8' }}
            >
              V
            </div>
            <span className="font-bold text-lg tracking-tight">ValueCube 搜索</span>
          </div>
          <button
            onClick={() => setShowWechatQR(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 hover:border-[#38bdf8] text-sm"
            style={{ background: '#101826', borderColor: '#263246' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
            </svg>
            企微客服
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#070b12] font-bold text-3xl"
              style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)' }}
            >
              V
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">家电产品智能搜索</h1>
          <p className="text-[#64748b]">支持文字、语音多维度搜索，实时获取最优报价</p>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-2xl mb-12">
          <div
            className="relative flex items-center rounded-2xl border transition-all duration-200"
            style={{
              background: '#101826',
              borderColor: results.length > 0 ? '#38bdf8' : '#263246',
              boxShadow: results.length > 0 ? '0 0 30px rgba(56, 189, 248, 0.15)' : 'none',
            }}
          >
            <Search className="absolute left-5 w-5 h-5 text-[#64748b]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索品牌、型号、品类或供应商..."
              className="flex-1 h-14 pl-14 pr-14 bg-transparent text-[#f8fafc] placeholder-[#64748b] outline-none text-base"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-20 p-1 rounded-full hover:bg-[#263246] transition-colors"
              >
                <X className="w-4 h-4 text-[#64748b]" />
              </button>
            )}
            <button
              onClick={toggleVoiceSearch}
              className={`absolute right-4 p-2.5 rounded-xl transition-all duration-200 ${
                isListening
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-[#263246] text-[#64748b]'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          {isListening && (
            <p className="text-center text-[#38bdf8] text-sm mt-3 animate-pulse">
              正在聆听，请说话...
            </p>
          )}
        </div>

        {/* Results */}
        {isSearching ? (
          <div className="w-full max-w-2xl space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl animate-pulse"
                style={{ background: '#101826' }}
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="w-full max-w-2xl space-y-4">
            {results.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border p-5 transition-all duration-200 hover:border-[#38bdf8] cursor-pointer group"
                style={{ background: '#101826', borderColor: '#263246' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{item.brand}</span>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#162238', color: '#38bdf8' }}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[#cbd5e1] text-sm">{item.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl" style={{ color: '#38bdf8' }}>
                      {item.price != null ? `¥${Number(item.price).toLocaleString()}` : '面议'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {item.updated_at && (
                      <div className="flex items-center gap-1.5 text-[#64748b] text-sm">
                        <TrendingUp className="w-4 h-4" />
                        {item.updated_at.slice(0, 10)}
                      </div>
                    )}
                    {item.confidence && (
                      <span className="text-xs text-[#64748b]">
                        置信度 {Number(item.confidence).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs ml-2 transition-colors group-hover:text-[#38bdf8]"
                      style={{ background: '#162238', color: '#64748b' }}
                    >
                      查看详情
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto mb-4 text-[#64748b]" />
            <p className="text-[#64748b]">未找到相关产品，请尝试其他关键词</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#64748b] mb-6">热门搜索</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['美的空调', '海尔冰箱', '格力变频', '小天鹅洗衣机', '海信电视'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    handleSearch(tag);
                  }}
                  className="px-4 py-2 rounded-full text-sm border transition-all hover:border-[#38bdf8] hover:text-[#38bdf8]"
                  style={{ background: '#101826', borderColor: '#263246' }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#263246] py-6 text-center">
        <p className="text-[#64748b] text-sm">© 2026 ValueCube. 保留所有权利。</p>
      </footer>

      {/* WeChat QR Modal */}
      {showWechatQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(7, 11, 18, 0.9)' }}
          onClick={() => setShowWechatQR(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border p-8 text-center"
            style={{ background: '#101826', borderColor: '#263246' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowWechatQR(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-[#263246] transition-colors"
            >
              <X className="w-5 h-5 text-[#64748b]" />
            </button>
            <div className="w-48 h-48 mx-auto mb-6 rounded-xl flex items-center justify-center" style={{ background: '#162238' }}>
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ background: '#263246' }}>
                  <svg className="w-12 h-12 text-[#64748b]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/>
                  </svg>
                </div>
                <p className="text-xs text-[#64748b]">企微客服二维码</p>
              </div>
            </div>
            <h3 className="font-bold text-lg mb-2">联系企微客服</h3>
            <p className="text-[#64748b] text-sm">扫描二维码添加客服，获取更多帮助</p>
          </div>
        </div>
      )}
    </div>
  );
}
