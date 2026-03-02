import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Send, 
  RefreshCw, 
  Ghost, 
  Sparkles, 
  MessageCircle, 
  Volume2, 
  VolumeX,
  Loader2,
  Trophy,
  Zap,
  Search,
  Lightbulb,
  Compass,
  X,
  Award,
  HelpCircle,
  Eye,
  AlertTriangle,
  ExternalLink,
  Dices
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { STORIES, ACHIEVEMENTS, type Story, type Achievement } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AchievementIcon = ({ icon, className }: { icon: string, className?: string }) => {
  switch (icon) {
    case 'Zap': return <Zap className={className} />;
    case 'Search': return <Search className={className} />;
    case 'Lightbulb': return <Lightbulb className={className} />;
    case 'Compass': return <Compass className={className} />;
    case 'Trophy': return <Trophy className={className} />;
    case 'Mic': return <Mic className={className} />;
    default: return <Award className={className} />;
  }
};

interface Message {
  id: string;
  role: 'user' | 'host';
  content: string;
}

export default function App() {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [solvedStoryIds, setSolvedStoryIds] = useState<number[]>([]);
  
  // Stats for current game
  const [stats, setStats] = useState({
    questionCount: 0,
    voiceCount: 0,
    answerHistory: [] as string[], // 'yes', 'no', 'irrelevant'
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load achievements from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('turtle_soup_achievements');
    if (saved) setUnlockedAchievements(JSON.parse(saved));
    
    const savedSolved = localStorage.getItem('turtle_soup_solved_stories');
    if (savedSolved) setSolvedStoryIds(JSON.parse(savedSolved));
  }, []);

  // Save achievements to localStorage
  useEffect(() => {
    localStorage.setItem('turtle_soup_achievements', JSON.stringify(unlockedAchievements));
  }, [unlockedAchievements]);

  useEffect(() => {
    localStorage.setItem('turtle_soup_solved_stories', JSON.stringify(solvedStoryIds));
  }, [solvedStoryIds]);

  const unlockAchievement = useCallback((id: string) => {
    if (unlockedAchievements.includes(id)) return;
    
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) {
      setUnlockedAchievements(prev => [...prev, id]);
      setNewAchievement(achievement);
      setTimeout(() => setNewAchievement(null), 5000);
    }
  }, [unlockedAchievements]);

  const getApiKey = () => {
    return (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  };

  // Initialize game
  const startNewGame = useCallback(async (mode: 'random' | 'dynamic' = 'random') => {
    const apiKey = getApiKey();
    
    if (mode === 'dynamic' && !apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setMessages([]);
    setIsSolved(false);
    setInput('');
    setStats({
      questionCount: 0,
      voiceCount: 0,
      answerHistory: [],
    });

    if (mode === 'dynamic' && apiKey) {
      setIsGeneratingStory(true);
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: "生成一个全新的、高质量的中文海龟汤故事。包含谜面（悬疑感强）和汤底（逻辑严密且出人意料）。" }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                riddle: { type: Type.STRING, description: "故事的谜面" },
                truth: { type: Type.STRING, description: "故事的真相（汤底）" }
              },
              required: ["riddle", "truth"]
            }
          }
        });
        
        const generated = JSON.parse(response.text || '{}');
        if (generated.riddle && generated.truth) {
          setCurrentStory({ id: Date.now(), ...generated });
          setIsGeneratingStory(false);
          return;
        }
      } catch (error) {
        console.error('Dynamic Generation Error:', error);
      }
      setIsGeneratingStory(false);
    }

    // Fallback to local stories
    const randomStory = STORIES[Math.floor(Math.random() * STORIES.length)];
    setCurrentStory(randomStory);
  }, []);

  useEffect(() => {
    startNewGame('random');
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别。');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      setStats(prev => ({ ...prev, voiceCount: prev.voiceCount + 1 }));
    }
  };

  const checkAchievements = useCallback((reply: string, solved: boolean) => {
    const newStats = { ...stats };
    
    // Update answer history
    let type = 'irrelevant';
    if (reply.includes('是。')) type = 'yes';
    else if (reply.includes('不是。')) type = 'no';
    
    const newHistory = [...stats.answerHistory, type];
    
    // 1. Intuition (3 Yes in a row)
    if (newHistory.slice(-3).every(t => t === 'yes') && newHistory.length >= 3) {
      unlockAchievement('intuition');
    }
    
    // 2. Offtrack (5 No or Irrelevant in a row)
    if (newHistory.slice(-5).every(t => t === 'no' || t === 'irrelevant') && newHistory.length >= 5) {
      unlockAchievement('offtrack');
    }
    
    // 3. Voice Detective
    if (stats.voiceCount >= 5) {
      unlockAchievement('voice_detective');
    }

    if (solved && currentStory) {
      // 4. Speedrun
      if (stats.questionCount + 1 <= 5) {
        unlockAchievement('speedrun');
      }
      
      // 5. Persistent
      if (stats.questionCount + 1 > 20) {
        unlockAchievement('persistent');
      }
      
      // 6. Collector
      const newSolvedIds = Array.from(new Set([...solvedStoryIds, currentStory.id]));
      setSolvedStoryIds(newSolvedIds);
      if (newSolvedIds.length === STORIES.length) {
        unlockAchievement('collector');
      }
    }
    
    setStats(prev => ({
      ...prev,
      questionCount: prev.questionCount + 1,
      answerHistory: newHistory
    }));
  }, [stats, currentStory, solvedStoryIds, unlockAchievement]);

  const handleGetHint = async () => {
    if (isLoading || isHintLoading || isSolved || !currentStory) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsHintLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const chatHistory = messages.map(m => `${m.role === 'user' ? '玩家' : '主持人'}: ${m.content}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              你是一个海龟汤游戏的主持人。
              
              当前故事谜面：${currentStory.riddle}
              当前故事真相（汤底）：${currentStory.truth}
              
              对话记录：
              ${chatHistory}
              
              任务：
              玩家现在请求提示。请根据对话记录和真相，给出一个非常隐晦、带有启发性但绝不直接泄露核心真相的提示。
              提示必须简短（30字以内），且语气要符合神秘主持人的身份。
              直接输出提示内容，不要带任何前缀。
            ` }]
          }
        ],
        config: {
          temperature: 0.7,
        }
      });

      const hint = response.text?.trim() || "真相就藏在细节之中...";
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'host',
        content: `[提示] ${hint}`
      }]);
    } catch (error) {
      console.error('Hint Error:', error);
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleRevealTruth = () => {
    if (!currentStory || isSolved) return;
    
    const truthMessage: Message = {
      id: Date.now().toString(),
      role: 'host',
      content: `既然你无法看透迷雾，那就由我来揭晓吧。真相是：${currentStory.truth}`
    };
    setMessages(prev => [...prev, truthMessage]);
    setIsSolved(true);
    setShowRevealConfirm(false);
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading || isSolved || !currentStory) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              你是一个海龟汤游戏的主持人。
              
              当前故事谜面：${currentStory.riddle}
              当前故事真相（汤底）：${currentStory.truth}
              
              规则：
              1. 玩家会向你提问，试图还原真相。
              2. 你只能根据玩家的提问，从以下四个回复中选择一个：
                 - "是。" (如果玩家的猜测符合真相)
                 - "不是。" (如果玩家的猜测与真相矛盾)
                 - "无关。" (如果玩家的猜测对还原真相没有帮助)
                 - "恭喜你，汤底已揭开！真相是：[公布完整汤底]。" (如果玩家已经猜出了核心诡计或完整真相)
              3. 严禁说出这四种格式以外的任何话。
              4. 严禁直接给出提示。
              
              玩家提问：${text}
            ` }]
          }
        ],
        config: {
          temperature: 0.1, // Keep it consistent
        }
      });

      const hostReply = response.text?.trim() || "无关。";
      
      const hostMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'host',
        content: hostReply
      };

      setMessages(prev => [...prev, hostMessage]);

      const solved = hostReply.includes('恭喜你') || hostReply.includes('真相是');
      if (solved) {
        setIsSolved(true);
      }
      
      checkAchievements(hostReply, solved);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'host',
        content: '主持人似乎陷入了沉思，请稍后再试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 glow-bg pointer-events-none" />
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full animate-pulse-slow" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full animate-pulse-slow" />

      {/* Achievement Toast */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-50 bg-gradient-to-r from-yellow-500 to-amber-600 p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-yellow-400/50"
          >
            <div className="bg-white/20 p-2 rounded-xl">
              <AchievementIcon icon={newAchievement.icon} className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-yellow-100 font-bold">达成成就！</p>
              <p className="text-white font-bold">{newAchievement.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Modal */}
      <AnimatePresence>
        {showAchievements && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAchievements(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-panel p-8 max-h-[80vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowAchievements(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-8">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h2 className="text-2xl font-bold text-white">成就馆</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {ACHIEVEMENTS.map((achievement) => {
                  const isUnlocked = unlockedAchievements.includes(achievement.id);
                  return (
                    <div 
                      key={achievement.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                        isUnlocked 
                          ? "bg-white/10 border-white/20" 
                          : "bg-black/20 border-white/5 opacity-40 grayscale"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        isUnlocked ? "bg-yellow-500/20 text-yellow-500" : "bg-white/5 text-gray-500"
                      )}>
                        <AchievementIcon icon={achievement.icon} className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{achievement.title}</h3>
                        <p className="text-xs text-gray-400">{achievement.description}</p>
                      </div>
                      {isUnlocked && (
                        <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-tighter">已解锁</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reveal Truth Confirmation Modal */}
      <AnimatePresence>
        {showRevealConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRevealConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-panel p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">还原真相？</h2>
              <p className="text-gray-400 text-sm mb-6">确定要直接揭开真相吗？这将直接结束本局游戏，您将无法继续推理。</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRevealConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleRevealTruth}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
                >
                  确定揭晓
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApiKeyModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel p-8 border-yellow-500/30"
            >
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">未配置 API 密钥</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                为了使用 AI 对话和动态出题功能，您需要在环境变量中配置 <code className="text-yellow-500 px-1 bg-white/5 rounded">VITE_GEMINI_API_KEY</code>。
              </p>
              
              <div className="space-y-4 text-left mb-8">
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] mt-0.5">1</div>
                  <p className="text-xs text-gray-300">前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline inline-flex items-center gap-1">Google AI Studio <ExternalLink className="w-3 h-3" /></a> 获取免费密钥。</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] mt-0.5">2</div>
                  <p className="text-xs text-gray-300">在 Vercel 项目设置的 <b>Environment Variables</b> 中添加 <code className="text-yellow-500">VITE_GEMINI_API_KEY</code>。</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] mt-0.5">3</div>
                  <p className="text-xs text-gray-300">重新部署项目即可生效。</p>
                </div>
              </div>

              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold transition-colors"
              >
                我知道了
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl z-10 flex flex-col gap-6"
      >
        {/* Header / Host Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
            >
              <Ghost className="w-12 h-12 text-purple-400 animate-float" />
            </motion.div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0a0a0f]" />
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white drop-shadow-lg">海龟汤推理馆</h1>
          <p className="text-gray-400 text-sm italic">“真相，往往藏在最深处。”</p>
        </div>

        {/* Riddle Area */}
        <section className="glass-panel p-6 relative overflow-hidden min-h-[120px] flex items-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50" />
          {isGeneratingStory ? (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <p className="text-sm text-purple-300 animate-pulse">正在为您构思全新的海龟汤...</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 w-full"
            >
              <Sparkles className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-widest mb-2">当前谜面</h2>
                <p className="text-lg leading-relaxed text-gray-100">
                  {currentStory?.riddle || "加载中..."}
                </p>
              </div>
            </motion.div>
          )}
        </section>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="glass-panel h-[400px] overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 opacity-50">
              <MessageCircle className="w-8 h-8" />
              <p>请开始您的提问...</p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-purple-600/80 text-white rounded-tr-none" 
                    : "bg-white/10 text-gray-200 rounded-tl-none border border-white/5"
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 px-1">
                  {msg.role === 'user' ? '您' : '主持人'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading || isHintLoading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="self-start flex items-center gap-2 text-purple-400 text-xs italic"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              {isHintLoading ? "主持人正在构思提示..." : "主持人正在审视您的提问..."}
            </motion.div>
          ) : null}
        </div>

        {/* Input Area */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isSolved ? "汤底已揭开" : "输入您的问题..."}
                disabled={isSolved || isLoading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
              />
              <button
                onClick={toggleRecording}
                disabled={isSolved || isLoading || isHintLoading}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors",
                  isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "text-gray-400 hover:text-white"
                )}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleGetHint}
              disabled={isSolved || isLoading || isHintLoading}
              title="获取提示"
              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-3 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isHintLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <HelpCircle className="w-5 h-5" />}
              <span className="text-sm font-bold whitespace-nowrap">提示</span>
            </button>
            <button
              onClick={() => handleSend()}
              disabled={isSolved || isLoading || isHintLoading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white px-4 py-3 rounded-xl transition-all flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setShowAchievements(true)}
                className="text-gray-500 hover:text-yellow-500 transition-colors flex items-center gap-1 text-xs"
              >
                <Trophy className="w-4 h-4" />
                成就 ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
              </button>
              {!isSolved && (
                <button 
                  onClick={() => setShowRevealConfirm(true)}
                  className="text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
                >
                  <Eye className="w-4 h-4" />
                  还原真相
                </button>
              )}
            </div>
            
            {isSolved ? (
              <div className="flex gap-2">
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startNewGame('random')}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  再喝一碗
                </motion.button>
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startNewGame('dynamic')}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-purple-500/20"
                >
                  <Dices className="w-4 h-4" />
                  AI 动态出题
                </motion.button>
              </div>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={() => startNewGame('dynamic')}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-xs transition-colors"
                  title="让 AI 为您生成一个全新的故事"
                >
                  <Dices className="w-3 h-3" />
                  AI 出题
                </button>
                <button 
                  onClick={() => startNewGame('random')}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  换一题
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="mt-12 text-gray-600 text-[10px] tracking-widest uppercase z-10">
        Turtle Soup Mystery Mansion &copy; 2024
      </footer>
    </div>
  );
}
