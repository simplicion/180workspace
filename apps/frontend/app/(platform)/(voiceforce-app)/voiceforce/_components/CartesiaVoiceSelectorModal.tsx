"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  X, Search, Play, Pause, Sparkles, Wand2, Mic, 
  Volume2, Check, RefreshCw, Filter, Globe, User, Radio
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { 
  CARTESIA_SUPPORTED_LANGUAGES, 
  CARTESIA_REGIONAL_GROUPS, 
  getCartesiaLanguageByCode 
} from '@/lib/cartesia-languages';

export interface CartesiaVoiceItem {
  id: string;
  name: string;
  description?: string;
  language: string;
  gender: 'female' | 'male' | 'neutral';
  isPublic: boolean;
  isCloned: boolean;
  createdAt?: string;
  tags?: string[];
}

interface CartesiaVoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceId: string;
  onSelectVoice: (voice: CartesiaVoiceItem) => void;
  onOpenCloning: () => void;
}

export function CartesiaVoiceSelectorModal({
  isOpen,
  onClose,
  selectedVoiceId,
  onSelectVoice,
  onOpenCloning
}: CartesiaVoiceSelectorModalProps) {
  const [voices, setVoices] = useState<CartesiaVoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'cloned' | 'indic' | 'europe' | 'asia' | 'latam' | 'mideast' | 'support' | 'sales'
  >('all');

  // Audio preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/voiceforce/voices');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setVoices(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load voice library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVoices();
    } else {
      stopAudio();
    }
  }, [isOpen]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
    setGeneratingAudioId(null);
  };

  const handlePlaySample = async (voice: CartesiaVoiceItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingVoiceId === voice.id) {
      stopAudio();
      return;
    }

    try {
      stopAudio();
      setGeneratingAudioId(voice.id);

      const matchedLang = getCartesiaLanguageByCode(voice.language);
      const sampleText = matchedLang?.sampleGreeting ||
        `Hello! I am ${voice.name.split('-')[0].trim()}. I can assist your customers with fast, intelligent voice responses.`;

      const res = await api.post('/api/v1/voiceforce/voices/preview', {
        voiceId: voice.id,
        text: sampleText,
        modelId: 'sonic-3.6'
      });

      if (res.data?.data?.audioBase64) {
        const audio = new Audio(res.data.data.audioBase64);
        audioRef.current = audio;
        setPlayingVoiceId(voice.id);
        setGeneratingAudioId(null);

        audio.onended = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
          toast.error('Failed to play audio sample');
        };

        await audio.play();
      }
    } catch (err: any) {
      setGeneratingAudioId(null);
      setPlayingVoiceId(null);
      toast.error(err.response?.data?.error || 'Preview playback failed');
    }
  };

  // Filtered Voices
  const filteredVoices = voices.filter((v) => {
    const vLang = (v.language || '').toLowerCase().trim();
    const vBase = vLang.split('-')[0];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchDesc = v.description?.toLowerCase().includes(q);
      const matchTag = v.tags?.some(t => t.toLowerCase().includes(q));
      const matchLang = v.language.toLowerCase().includes(q);
      const matchedMeta = getCartesiaLanguageByCode(v.language);
      const matchNative = matchedMeta?.nativeName.toLowerCase().includes(q);
      const matchFullName = matchedMeta?.name.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchTag && !matchLang && !matchNative && !matchFullName) return false;
    }

    // Language filter
    if (selectedLanguage !== 'all') {
      const targetLang = selectedLanguage.toLowerCase().trim();
      const targetBase = targetLang.split('-')[0];
      const matches = vLang === targetLang || vBase === targetLang || vBase === targetBase || vLang.startsWith(targetBase);
      if (!matches) return false;
    }

    // Gender filter
    if (selectedGender !== 'all' && v.gender !== selectedGender) {
      return false;
    }

    // Category / Regional Quick Filter
    if (selectedCategory === 'cloned') {
      if (!v.isCloned) return false;
    } else if (selectedCategory === 'indic') {
      const indicBases = ['hi', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'bn', 'or', 'ur'];
      const isIndic = indicBases.includes(vBase) || v.tags?.some(t => t.toLowerCase().includes('indic') || t.toLowerCase().includes('hindi'));
      if (!isIndic) return false;
    } else if (selectedCategory === 'europe') {
      const euroBases = ['es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'sv', 'no', 'da', 'fi', 'el', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'uk'];
      if (!euroBases.includes(vBase) && vLang !== 'en-gb' && vLang !== 'en-ie') return false;
    } else if (selectedCategory === 'asia') {
      const asiaBases = ['ja', 'zh', 'ko', 'vi', 'th', 'id', 'ms', 'tl'];
      if (!asiaBases.includes(vBase) && vLang !== 'en-au' && vLang !== 'en-nz') return false;
    } else if (selectedCategory === 'latam') {
      const isLatam = vLang.includes('mx') || vLang.includes('br') || vLang.includes('ar') || vLang.includes('co') || vLang.includes('cl') || vLang.includes('pe') || vLang.includes('es-us');
      if (!isLatam && vBase !== 'es' && vBase !== 'pt') return false;
    } else if (selectedCategory === 'mideast') {
      const mideastBases = ['ar', 'tr', 'he', 'ka', 'sw'];
      if (!mideastBases.includes(vBase)) return false;
    } else if (selectedCategory === 'support') {
      if (!v.tags?.includes('Customer Support')) return false;
    } else if (selectedCategory === 'sales') {
      if (!v.tags?.includes('Sales & Pitch')) return false;
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Cartesia Neural Voice Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Sub-90ms Latency
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Explore {voices.length || 900}+ studio-grade voices across 50+ languages, accents, and custom company clones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onClose();
                onOpenCloning();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Clone Voice</span>
            </button>

            <button
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 sm:px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by voice name, dialect, accent, or native language..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Comprehensive 50+ Languages Selector */}
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer outline-none max-w-[220px]"
              >
                <option value="all">🌍 All Languages ({CARTESIA_SUPPORTED_LANGUAGES.length}+)</option>
                {CARTESIA_REGIONAL_GROUPS.map((region) => {
                  const regionalLangs = CARTESIA_SUPPORTED_LANGUAGES.filter(l => l.region === region);
                  if (regionalLangs.length === 0) return null;
                  return (
                    <optgroup key={region} label={`── ${region} ──`}>
                      {regionalLangs.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>

              {/* Gender Selector */}
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer outline-none"
              >
                <option value="all">👥 All Genders</option>
                <option value="female">👩 Female</option>
                <option value="male">👨 Male</option>
                <option value="neutral">🧑 Neutral</option>
              </select>
            </div>
          </div>

          {/* Quick Category & Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'all', label: `All Voices (${voices.length})` },
              { id: 'cloned', label: `✨ Custom Clones (${voices.filter(v => v.isCloned).length})` },
              { id: 'indic', label: '🇮🇳 Hindi & Indic' },
              { id: 'europe', label: '🇪🇺 European' },
              { id: 'asia', label: '🌏 Asia & Pacific' },
              { id: 'latam', label: '🌎 Latin America' },
              { id: 'mideast', label: '🌍 Middle East & Africa' },
              { id: 'support', label: '🎧 Customer Support' },
              { id: 'sales', label: '💼 Sales & Pitch' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  selectedCategory === cat.id
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Grid Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
              <p className="text-xs font-semibold text-gray-500">Connecting to Cartesia Neural API...</p>
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2">
              <Volume2 className="w-10 h-10 text-gray-300 dark:text-gray-700" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No voices match your filters</h4>
              <p className="text-xs text-gray-500">Try selecting "All Languages" or changing your category tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPlaying = playingVoiceId === voice.id;
                const isGenerating = generatingAudioId === voice.id;
                const matchedLang = getCartesiaLanguageByCode(voice.language);

                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      stopAudio();
                      onSelectVoice(voice);
                      onClose();
                    }}
                    className={clsx(
                      "p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-3",
                      isSelected
                        ? "bg-purple-50/50 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20"
                        : "bg-white dark:bg-gray-850 border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={clsx(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0",
                            voice.isCloned
                              ? "bg-gradient-to-tr from-amber-500 to-orange-400 text-white"
                              : voice.gender === 'female'
                                ? "bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400"
                                : "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                          )}>
                            {voice.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                                {voice.name}
                              </h4>
                              {voice.isCloned && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  CUSTOM CLONE
                                </span>
                              )}
                              {isSelected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> ACTIVE
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                              {voice.description || 'Natural conversational persona'}
                            </p>
                          </div>
                        </div>

                        {/* Audio Play/Pause Button */}
                        <button
                          type="button"
                          onClick={(e) => handlePlaySample(voice, e)}
                          disabled={isGenerating}
                          className={clsx(
                            "p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                            isPlaying
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/60"
                          )}
                          title={isPlaying ? "Pause audio sample" : "Listen to live sample"}
                        >
                          {isGenerating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                          ) : isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Badges & Meta */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60 text-[10px] text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-medium text-[10px] flex items-center gap-1 border border-purple-200/50 dark:border-purple-800/50">
                          {matchedLang ? `${matchedLang.flag} ${matchedLang.nativeName}` : voice.language.toUpperCase()}
                        </span>
                        <span className="capitalize font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                          {voice.gender}
                        </span>
                        {voice.tags?.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {t}
                          </span>
                        ))}
                      </div>

                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 group-hover:underline">
                        {isSelected ? 'Selected' : 'Select Voice →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing <span className="font-bold text-gray-800 dark:text-gray-200">{filteredVoices.length}</span> of {voices.length} voices
          </p>

          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
