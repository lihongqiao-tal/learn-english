
import React, { useState, useEffect } from 'react';
import { Home, Mic, Library, BookOpen, Search, Settings, Plus, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { Chunk, Proficiency, SpeakingSession } from './types';
import { generateTopicQuestions, optimizeAndExtract, evaluateSentence, autoCompleteChunk } from './services/geminiService';
import { TranscriptionService } from './services/audioService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'speak' | 'library' | 'review'>('home');
  const [keyword, setKeyword] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [library, setLibrary] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load Library from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('fluentflow_library');
    if (saved) setLibrary(JSON.parse(saved));
  }, []);

  const saveToLibrary = (chunks: Chunk[]) => {
    const newLibrary = [...library];
    chunks.forEach(chunk => {
      if (!newLibrary.find(c => c.original === chunk.original)) {
        newLibrary.push(chunk);
      }
    });
    setLibrary(newLibrary);
    localStorage.setItem('fluentflow_library', JSON.stringify(newLibrary));
  };

  const updateChunkProficiency = (id: string, proficiency: Proficiency) => {
    const updated = library.map(c => c.id === id ? { ...c, proficiency, lastReviewed: Date.now() } : c);
    setLibrary(updated);
    localStorage.setItem('fluentflow_library', JSON.stringify(updated));
  };

  const handleTopicSearch = async () => {
    if (!keyword) return;
    setIsLoading(true);
    const q = await generateTopicQuestions(keyword);
    setQuestions(q);
    setIsLoading(false);
  };

  const handleStartPractice = (q: string) => {
    setSelectedQuestion(q);
    setTranscription('');
    setSession(null);
    setActiveTab('speak');
  };

  const [transcriptionService] = useState(() => new TranscriptionService((text, isFinal) => {
    setTranscription(text);
    if (isFinal) {
       processSpeaking(text);
    }
  }));

  const processSpeaking = async (text: string) => {
    setIsLoading(true);
    const result = await optimizeAndExtract(text);
    setSession({
      id: Math.random().toString(),
      topic: keyword,
      question: selectedQuestion,
      userTranscription: text,
      optimizedVersion: result.optimized,
      feedback: "Analyzed your expression.",
      extractedChunks: result.chunks,
      timestamp: Date.now()
    });
    setIsLoading(false);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await transcriptionService.stop();
      setIsRecording(false);
    } else {
      setTranscription('');
      await transcriptionService.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Navigation Sidebar */}
      <nav className="w-full md:w-20 lg:w-64 bg-white border-r border-slate-200 p-4 flex md:flex-col items-center md:items-stretch gap-6 sticky top-0 z-50 order-last md:order-first">
        <div className="hidden md:flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">F</div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">FluentFlow</span>
        </div>
        
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="Home" />
        <NavButton active={activeTab === 'speak'} onClick={() => setActiveTab('speak')} icon={<Mic size={24} />} label="Practice" />
        <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Library size={24} />} label="Library" />
        <NavButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={<BookOpen size={24} />} label="Review" />
        
        <div className="mt-auto hidden md:block">
          <NavButton active={false} onClick={() => {}} icon={<Settings size={24} />} label="Settings" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full pb-24 md:pb-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header>
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Ready to practice?</h1>
              <p className="text-slate-500 text-lg">Choose a topic or start a free conversation.</p>
            </header>

            <div className="flex gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter a topic (e.g., Travel, Work, Dreams)..." 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleTopicSearch()}
                />
              </div>
              <button 
                onClick={handleTopicSearch}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : 'Go'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                onClick={() => handleStartPractice('Free Speech')}
                className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Mic size={24} />
                </div>
                <h3 className="font-bold text-xl mb-1">Free Expression</h3>
                <p className="text-slate-500 text-sm">Say whatever is on your mind today.</p>
              </button>

              {questions.map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => handleStartPractice(q)}
                  className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 transition-all text-left shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <p className="text-slate-700 font-medium mb-4 italic">"{q}"</p>
                  <div className="flex items-center text-indigo-600 font-semibold text-sm">
                    Practice Now →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'speak' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 mb-2">Current Topic</h2>
              <p className="text-2xl font-bold text-slate-800 italic">"{selectedQuestion || 'Free Speech'}"</p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 min-h-[300px] flex flex-col">
              <div className="flex-1 text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                {transcription || (isRecording ? "Listening..." : "Click the microphone to start speaking...")}
              </div>
              
              <div className="flex justify-center pt-8">
                <button 
                  onClick={toggleRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {isRecording ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Mic size={32} className="text-white" />}
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                <p className="text-slate-500 mt-2 font-medium">AI is optimizing your expression...</p>
              </div>
            )}

            {session && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                  <h3 className="text-indigo-900 font-bold mb-3 flex items-center gap-2">
                    <CheckCircle2 size={20} /> Optimized Expression
                  </h3>
                  <p className="text-indigo-800 text-lg font-medium leading-relaxed italic">
                    "{session.optimizedVersion}"
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Plus size={20} className="text-indigo-600" /> New Chunks Identified
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {session.extractedChunks.map((chunk) => (
                      <ChunkCard 
                        key={chunk.id} 
                        chunk={chunk} 
                        onCollect={() => saveToLibrary([chunk])}
                        isCollected={library.some(c => c.original === chunk.original)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button 
                    onClick={() => setSession(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                  >
                    <RotateCcw size={18} /> Practice again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Personal Chunk Library</h1>
                <p className="text-slate-500">Manage and master your collected phrases.</p>
              </div>
              <button 
                onClick={() => {
                   const original = prompt("Enter English Chunk:");
                   if (original) {
                     autoCompleteChunk({ original }).then(res => {
                        const newC: Chunk = {
                          id: Math.random().toString(),
                          original: res.original || original,
                          translation: res.translation || "",
                          exampleEn: res.exampleEn || "",
                          exampleZh: res.exampleZh || "",
                          proficiency: Proficiency.BEGINNER
                        };
                        saveToLibrary([newC]);
                     });
                   }
                }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm"
              >
                <Plus size={20} /> Add Custom Chunk
              </button>
            </header>

            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              <FilterTag active label="All" count={library.length} />
              <FilterTag active={false} label="Beginner" count={library.filter(c => c.proficiency === Proficiency.BEGINNER).length} />
              <FilterTag active={false} label="Intermediate" count={library.filter(c => c.proficiency === Proficiency.INTERMEDIATE).length} />
              <FilterTag active={false} label="Advanced" count={library.filter(c => c.proficiency === Proficiency.ADVANCED).length} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {library.length > 0 ? (
                library.map(chunk => (
                  <LibraryCard 
                    key={chunk.id} 
                    chunk={chunk} 
                    onRemove={(id) => {
                      const updated = library.filter(c => c.id !== id);
                      setLibrary(updated);
                      localStorage.setItem('fluentflow_library', JSON.stringify(updated));
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <Library size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-400">Your library is empty.</h3>
                  <p className="text-slate-400">Start practicing to collect some useful chunks!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <ReviewSession 
            library={library} 
            onUpdateProficiency={updateChunkProficiency} 
          />
        )}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 px-3 py-3 rounded-2xl transition-all ${active ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
  >
    <div className={`${active ? 'scale-110' : ''} transition-transform`}>{icon}</div>
    <span className="hidden lg:block">{label}</span>
  </button>
);

const ChunkCard: React.FC<{ chunk: Chunk; onCollect: () => void; isCollected: boolean }> = ({ chunk, onCollect, isCollected }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h4 className="font-bold text-indigo-600 text-lg">{chunk.original}</h4>
        <p className="text-slate-500 text-sm font-medium">{chunk.translation}</p>
      </div>
      <button 
        onClick={onCollect}
        disabled={isCollected}
        className={`p-2 rounded-xl transition-all ${isCollected ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
      >
        {isCollected ? <CheckCircle2 size={20} /> : <Plus size={20} />}
      </button>
    </div>
    <div className="pt-2 border-t border-slate-50 text-sm space-y-1 italic">
      <p className="text-slate-600">"{chunk.exampleEn}"</p>
      <p className="text-slate-400">{chunk.exampleZh}</p>
    </div>
  </div>
);

const LibraryCard: React.FC<{ chunk: Chunk; onRemove: (id: string) => void }> = ({ chunk, onRemove }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
    <button 
      onClick={() => onRemove(chunk.id)}
      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
    >
      <XCircle size={20} />
    </button>
    <div className="mb-4">
      <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 ${
        chunk.proficiency === Proficiency.ADVANCED ? 'bg-green-100 text-green-700' :
        chunk.proficiency === Proficiency.INTERMEDIATE ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
      }`}>
        {chunk.proficiency}
      </span>
      <h3 className="text-xl font-bold text-slate-800">{chunk.original}</h3>
      <p className="text-slate-500 font-medium">{chunk.translation}</p>
    </div>
    <div className="space-y-2 text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">
      <p>"{chunk.exampleEn}"</p>
      <p className="text-slate-400 font-normal">{chunk.exampleZh}</p>
    </div>
  </div>
);

const FilterTag: React.FC<{ active: boolean; label: string; count: number }> = ({ active, label, count }) => (
  <button className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full border transition-all ${active ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
    <span className="font-semibold">{label}</span>
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
  </button>
);

const ReviewSession: React.FC<{ library: Chunk[], onUpdateProficiency: (id: string, p: Proficiency) => void }> = ({ library, onUpdateProficiency }) => {
  const [reviewList, setReviewList] = useState<Chunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState<{ natural: boolean, feedback: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    // Pick 5 chunks to review
    const shuffled = [...library].sort(() => 0.5 - Math.random());
    setReviewList(shuffled.slice(0, 5));
  }, [library]);

  const currentChunk = reviewList[currentIndex];

  const [transcriptionService] = useState(() => new TranscriptionService((text, isFinal) => {
    setTranscription(text);
    if (isFinal) {
      handleEvaluation(text);
    }
  }));

  const handleEvaluation = async (text: string) => {
    if (!currentChunk) return;
    setIsEvaluating(true);
    const result = await evaluateSentence(currentChunk.original, text);
    setFeedback(result);
    if (result.nextProficiency) {
      onUpdateProficiency(currentChunk.id, result.nextProficiency);
    }
    setIsEvaluating(false);
  };

  const nextQuestion = () => {
    setTranscription('');
    setFeedback(null);
    setCurrentIndex(prev => prev + 1);
  };

  if (reviewList.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-3xl border border-slate-200">
        <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-800">No chunks to review.</h3>
        <p className="text-slate-500 mt-2">Go to your library and add some phrases first!</p>
      </div>
    );
  }

  if (currentIndex >= reviewList.length) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Review Completed!</h3>
        <p className="text-slate-500 mt-2 mb-8">You've mastered some new expressions today.</p>
        <button 
          onClick={() => setCurrentIndex(0)}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Start Another Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Review Chunks</h2>
        <span className="text-slate-400 font-bold">{currentIndex + 1} / {reviewList.length}</span>
      </div>

      <div className="bg-white p-10 rounded-3xl shadow-lg border border-slate-100 text-center space-y-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-indigo-600">{currentChunk.original}</h3>
          <p className="text-slate-500 text-lg font-medium">{currentChunk.translation}</p>
        </div>
        
        <p className="text-slate-400 italic">"Try using this phrase in a sentence out loud..."</p>

        <div className="min-h-[100px] flex items-center justify-center">
          {transcription ? (
            <p className="text-xl text-slate-700 font-medium italic">"{transcription}"</p>
          ) : (
             isRecording ? <p className="text-slate-400 animate-pulse">Listening...</p> : null
          )}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={async () => {
              if (isRecording) {
                await transcriptionService.stop();
                setIsRecording(false);
              } else {
                setTranscription('');
                setFeedback(null);
                await transcriptionService.start();
                setIsRecording(true);
              }
            }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600'}`}
          >
             {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <Mic className="text-white" />}
          </button>
        </div>
      </div>

      {isEvaluating && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      )}

      {feedback && (
        <div className={`p-6 rounded-2xl border ${feedback.natural ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} animate-in slide-in-from-bottom-2 duration-300`}>
          <div className="flex items-start gap-3">
            {feedback.natural ? <CheckCircle2 className="text-green-600 mt-1" /> : <RotateCcw className="text-orange-600 mt-1" />}
            <div>
              <h4 className={`font-bold ${feedback.natural ? 'text-green-900' : 'text-orange-900'}`}>
                {feedback.natural ? 'Great Job!' : 'Could be better'}
              </h4>
              <p className={feedback.natural ? 'text-green-800' : 'text-orange-800'}>{feedback.feedback}</p>
              <button 
                onClick={nextQuestion}
                className="mt-4 bg-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all"
              >
                Next Chunk →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
