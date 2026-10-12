export interface CartesiaLanguage {
  code: string;
  baseCode: string;
  name: string;
  nativeName: string;
  flag: string;
  region: 'India & Indic' | 'North America' | 'Europe' | 'Asia & Pacific' | 'Latin America' | 'Middle East & Africa';
  sampleGreeting?: string;
}

export const CARTESIA_SUPPORTED_LANGUAGES: CartesiaLanguage[] = [
  // ==============================
  // 🇮🇳 INDIA & INDIC LANGUAGES
  // ==============================
  { 
    code: 'en-IN', 
    baseCode: 'en', 
    name: 'English (India / Indian Accent)', 
    nativeName: 'English (India)', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'Hello! I am your AI assistant for India. How may I help you today?'
  },
  { 
    code: 'hi-IN', 
    baseCode: 'hi', 
    name: 'Hindi (India)', 
    nativeName: 'हिन्दी', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'नमस्ते! मैं आपका एआई वॉयस कर्मचारी हूँ। मैं आज आपकी क्या सहायता कर सकता हूँ?'
  },
  { 
    code: 'ta-IN', 
    baseCode: 'ta', 
    name: 'Tamil (India / Sri Lanka)', 
    nativeName: 'தமிழ்', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'வணக்கம்! நான் உங்கள் AI குரல் உதவியாளர். உங்களுக்கு இன்று எவ்வாறு உதவ முடியும்?'
  },
  { 
    code: 'te-IN', 
    baseCode: 'te', 
    name: 'Telugu (India)', 
    nativeName: 'తెలుగు', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'నమస్కారం! నేను మీ AI వాయిస్ అసిస్టెంట్‌ని. ఈ రోజు మీకు ఏ విధంగా సహాయం చేయగలను?'
  },
  { 
    code: 'mr-IN', 
    baseCode: 'mr', 
    name: 'Marathi (India)', 
    nativeName: 'मराठी', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'नमस्कार! मी तुमचा AI व्हॉईस असिस्टंट आहे. आज मी तुम्हाला कशी मदत करू शकतो?'
  },
  { 
    code: 'gu-IN', 
    baseCode: 'gu', 
    name: 'Gujarati (India)', 
    nativeName: 'ગુજરાતી', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'નમસ્તે! હું તમારો AI વૉઇસ આસિસ્ટન્ટ છું. આજે હું તમારી શું મદદ કરી શકું?'
  },
  { 
    code: 'kn-IN', 
    baseCode: 'kn', 
    name: 'Kannada (India)', 
    nativeName: 'ಕನ್ನಡ', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ವಾಯ್ಸ್ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?'
  },
  { 
    code: 'ml-IN', 
    baseCode: 'ml', 
    name: 'Malayalam (India)', 
    nativeName: 'മലയാളം', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI വോയ്‌സ് അസിസ്റ്റന്റാണ്. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?'
  },
  { 
    code: 'pa-IN', 
    baseCode: 'pa', 
    name: 'Punjabi (India / Pakistan)', 
    nativeName: 'ਪੰਜਾਬੀ', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ AI ਵੌਇਸ ਅਸਿਸਟੈਂਟ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?'
  },
  { 
    code: 'bn-IN', 
    baseCode: 'bn', 
    name: 'Bengali (India / Bangladesh)', 
    nativeName: 'বাংলা', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'নমস্কার! আমি আপনার AI ভয়েস সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?'
  },
  { 
    code: 'or-IN', 
    baseCode: 'or', 
    name: 'Odia (India)', 
    nativeName: 'ଓଡ଼ିଆ', 
    flag: '🇮🇳', 
    region: 'India & Indic',
    sampleGreeting: 'ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର AI ଭଏସ୍ ସହାୟକ | ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?'
  },
  { 
    code: 'ur-PK', 
    baseCode: 'ur', 
    name: 'Urdu (Pakistan / India)', 
    nativeName: 'اردو', 
    flag: '🇵🇰', 
    region: 'India & Indic',
    sampleGreeting: 'السلام علیکم! میں آپ کا AI وائس اسسٹنٹ ہوں۔ میں آج آپ کی کیا مدد کر سکتا ہوں؟'
  },

  // ==============================
  // 🇺🇸 NORTH AMERICA
  // ==============================
  { 
    code: 'en-US', 
    baseCode: 'en', 
    name: 'English (United States)', 
    nativeName: 'English (US)', 
    flag: '🇺🇸', 
    region: 'North America',
    sampleGreeting: 'Hello! I am your AI voice employee. How can I assist your business today?'
  },
  { 
    code: 'en-CA', 
    baseCode: 'en', 
    name: 'English (Canada)', 
    nativeName: 'English (CA)', 
    flag: '🇨🇦', 
    region: 'North America',
    sampleGreeting: 'Hello! I am your AI assistant from Canada. How can I help you today?'
  },
  { 
    code: 'fr-CA', 
    baseCode: 'fr', 
    name: 'French (Canada / Québec)', 
    nativeName: 'Français (Canada)', 
    flag: '🇨🇦', 
    region: 'North America',
    sampleGreeting: 'Bonjour! Je suis votre assistant vocal IA. Comment puis-je vous aider aujourd’hui?'
  },
  { 
    code: 'es-US', 
    baseCode: 'es', 
    name: 'Spanish (United States)', 
    nativeName: 'Español (EE. UU.)', 
    flag: '🇺🇸', 
    region: 'North America',
    sampleGreeting: '¡Hola! Soy tu asistente de voz con inteligencia artificial. ¿Cómo puedo ayudarte hoy?'
  },

  // ==============================
  // 🇪🇺 EUROPE
  // ==============================
  { 
    code: 'en-GB', 
    baseCode: 'en', 
    name: 'English (United Kingdom)', 
    nativeName: 'English (UK)', 
    flag: '🇬🇧', 
    region: 'Europe',
    sampleGreeting: 'Hello! I am your UK-based voice assistant. How may I be of assistance today?'
  },
  { 
    code: 'en-IE', 
    baseCode: 'en', 
    name: 'English (Ireland)', 
    nativeName: 'English (Ireland)', 
    flag: '🇮🇪', 
    region: 'Europe',
    sampleGreeting: 'Hello there! I am your Irish AI assistant. How can I help you today?'
  },
  { 
    code: 'es-ES', 
    baseCode: 'es', 
    name: 'Spanish (Spain)', 
    nativeName: 'Español (España)', 
    flag: '🇪🇸', 
    region: 'Europe',
    sampleGreeting: '¡Hola! Soy tu asistente de voz IA en España. ¿En qué puedo ayudarte hoy?'
  },
  { 
    code: 'fr-FR', 
    baseCode: 'fr', 
    name: 'French (France)', 
    nativeName: 'Français (France)', 
    flag: '🇫🇷', 
    region: 'Europe',
    sampleGreeting: 'Bonjour! Je suis votre employé vocal IA. Comment puis-je vous aider aujourd’hui?'
  },
  { 
    code: 'de-DE', 
    baseCode: 'de', 
    name: 'German (Germany / Austria / Switzerland)', 
    nativeName: 'Deutsch', 
    flag: '🇩🇪', 
    region: 'Europe',
    sampleGreeting: 'Hallo! Ich bin Ihr KI-Sprachassistent. Wie kann ich Ihnen heute helfen?'
  },
  { 
    code: 'it-IT', 
    baseCode: 'it', 
    name: 'Italian (Italy)', 
    nativeName: 'Italiano', 
    flag: '🇮🇹', 
    region: 'Europe',
    sampleGreeting: 'Ciao! Sono il tuo assistente vocale IA. Come posso aiutarti oggi?'
  },
  { 
    code: 'pt-PT', 
    baseCode: 'pt', 
    name: 'Portuguese (Portugal)', 
    nativeName: 'Português (Portugal)', 
    flag: '🇵🇹', 
    region: 'Europe',
    sampleGreeting: 'Olá! Sou o seu assistente de voz com IA. Como posso ajudar hoje?'
  },
  { 
    code: 'nl-NL', 
    baseCode: 'nl', 
    name: 'Dutch (Netherlands / Belgium)', 
    nativeName: 'Nederlands', 
    flag: '🇳🇱', 
    region: 'Europe',
    sampleGreeting: 'Hallo! Ik ben uw AI-spraakassistent. Hoe kan ik u vandaag helpen?'
  },
  { 
    code: 'pl-PL', 
    baseCode: 'pl', 
    name: 'Polish (Poland)', 
    nativeName: 'Polski', 
    flag: '🇵🇱', 
    region: 'Europe',
    sampleGreeting: 'Dzień dobry! Jestem Twoim asystentem głosowym AI. W czym mogę dzisiaj pomóc?'
  },
  { 
    code: 'ru-RU', 
    baseCode: 'ru', 
    name: 'Russian (Russia)', 
    nativeName: 'Русский', 
    flag: '🇷🇺', 
    region: 'Europe',
    sampleGreeting: 'Здравствуйте! Я ваш голосовой ИИ-помощник. Чем могу помочь вам сегодня?'
  },
  { 
    code: 'sv-SE', 
    baseCode: 'sv', 
    name: 'Swedish (Sweden)', 
    nativeName: 'Svenska', 
    flag: '🇸🇪', 
    region: 'Europe',
    sampleGreeting: 'Hej! Jag är din AI-röstassistent. Hur kan jag hjälpa dig idag?'
  },
  { 
    code: 'no-NO', 
    baseCode: 'no', 
    name: 'Norwegian (Norway)', 
    nativeName: 'Norsk', 
    flag: '🇳🇴', 
    region: 'Europe',
    sampleGreeting: 'Hei! Jeg er din AI-stemmeassistent. Hvordan kan jeg hjelpe deg i dag?'
  },
  { 
    code: 'da-DK', 
    baseCode: 'da', 
    name: 'Danish (Denmark)', 
    nativeName: 'Dansk', 
    flag: '🇩🇰', 
    region: 'Europe',
    sampleGreeting: 'Hej! Jeg er din AI-stemmeassistent. Hvordan kan jeg hjælpe dig i dag?'
  },
  { 
    code: 'fi-FI', 
    baseCode: 'fi', 
    name: 'Finnish (Finland)', 
    nativeName: 'Suomi', 
    flag: '🇫🇮', 
    region: 'Europe',
    sampleGreeting: 'Hei! Olen tekoälyääniassistenttisi. Miten voin auttaa sinua tänään?'
  },
  { 
    code: 'el-GR', 
    baseCode: 'el', 
    name: 'Greek (Greece)', 
    nativeName: 'Ελληνικά', 
    flag: '🇬🇷', 
    region: 'Europe',
    sampleGreeting: 'Γεια σας! Είμαι ο φωνητικός βοηθός AI σας. Πώς μπορώ να σας βοηθήσω σήμερα;'
  },
  { 
    code: 'cs-CZ', 
    baseCode: 'cs', 
    name: 'Czech (Czech Republic)', 
    nativeName: 'Čeština', 
    flag: '🇨🇿', 
    region: 'Europe',
    sampleGreeting: 'Dobrý den! Jsem váš hlasový asistent AI. Jak vám mohu dnes pomoci?'
  },
  { 
    code: 'sk-SK', 
    baseCode: 'sk', 
    name: 'Slovak (Slovakia)', 
    nativeName: 'Slovenčina', 
    flag: '🇸🇰', 
    region: 'Europe',
    sampleGreeting: 'Dobrý deň! Som váš hlasový asistent AI. Ako vám môžem dnes pomôcť?'
  },
  { 
    code: 'hu-HU', 
    baseCode: 'hu', 
    name: 'Hungarian (Hungary)', 
    nativeName: 'Magyar', 
    flag: '🇭🇺', 
    region: 'Europe',
    sampleGreeting: 'Üdvözlöm! Én vagyok az Ön AI hangasszisztense. Miben segíthetek ma?'
  },
  { 
    code: 'ro-RO', 
    baseCode: 'ro', 
    name: 'Romanian (Romania)', 
    nativeName: 'Română', 
    flag: '🇷🇴', 
    region: 'Europe',
    sampleGreeting: 'Bună ziua! Sunt asistentul dumneavoastră vocal AI. Cu ce vă pot ajuta astăzi?'
  },
  { 
    code: 'bg-BG', 
    baseCode: 'bg', 
    name: 'Bulgarian (Bulgaria)', 
    nativeName: 'Български', 
    flag: '🇧🇬', 
    region: 'Europe',
    sampleGreeting: 'Здравейте! Аз съм вашият гласов асистент с изкуствен интелект. С какво мога да ви помогна днес?'
  },
  { 
    code: 'hr-HR', 
    baseCode: 'hr', 
    name: 'Croatian (Croatia)', 
    nativeName: 'Hrvatski', 
    flag: '🇭🇷', 
    region: 'Europe',
    sampleGreeting: 'Pozdrav! Ja sam vaš AI glasovni asistent. Kako vam mogu pomoći danas?'
  },
  { 
    code: 'uk-UA', 
    baseCode: 'uk', 
    name: 'Ukrainian (Ukraine)', 
    nativeName: 'Українська', 
    flag: '🇺🇦', 
    region: 'Europe',
    sampleGreeting: 'Вітаю! Я ваш голосовий ШІ-асистент. Чим я можу вам допомогти сьогодні?'
  },

  // ==============================
  // 🌎 LATIN AMERICA
  // ==============================
  { 
    code: 'es-MX', 
    baseCode: 'es', 
    name: 'Spanish (Mexico / Latin America)', 
    nativeName: 'Español (México)', 
    flag: '🇲🇽', 
    region: 'Latin America',
    sampleGreeting: '¡Hola! Soy tu asistente de voz en español para México y Latinoamérica. ¿Cómo te puedo ayudar?'
  },
  { 
    code: 'es-AR', 
    baseCode: 'es', 
    name: 'Spanish (Argentina)', 
    nativeName: 'Español (Argentina)', 
    flag: '🇦🇷', 
    region: 'Latin America',
    sampleGreeting: '¡Hola! ¿Cómo andás? Soy tu asistente de voz con IA. ¿En qué te puedo ayudar hoy?'
  },
  { 
    code: 'es-CO', 
    baseCode: 'es', 
    name: 'Spanish (Colombia)', 
    nativeName: 'Español (Colombia)', 
    flag: '🇨🇴', 
    region: 'Latin America',
    sampleGreeting: '¡Hola! Con mucho gusto te asisto. Soy tu asistente de inteligencia artificial.'
  },
  { 
    code: 'es-CL', 
    baseCode: 'es', 
    name: 'Spanish (Chile)', 
    nativeName: 'Español (Chile)', 
    flag: '🇨🇱', 
    region: 'Latin America',
    sampleGreeting: '¡Hola! Soy tu asistente de voz IA. ¿En qué te puedo colaborar hoy?'
  },
  { 
    code: 'pt-BR', 
    baseCode: 'pt', 
    name: 'Portuguese (Brazil)', 
    nativeName: 'Português (Brasil)', 
    flag: '🇧🇷', 
    region: 'Latin America',
    sampleGreeting: 'Olá! Sou o seu assistente de voz com IA para o Brasil. Como posso te ajudar hoje?'
  },

  // ==============================
  // 🌏 ASIA & PACIFIC
  // ==============================
  { 
    code: 'ja-JP', 
    baseCode: 'ja', 
    name: 'Japanese (Japan)', 
    nativeName: '日本語', 
    flag: '🇯🇵', 
    region: 'Asia & Pacific',
    sampleGreeting: 'こんにちは！AI音声アシスタントです。本日はどのようなご用件でしょうか？'
  },
  { 
    code: 'zh-CN', 
    baseCode: 'zh', 
    name: 'Chinese (Simplified Mandarin)', 
    nativeName: '简体中文 (普通话)', 
    flag: '🇨🇳', 
    region: 'Asia & Pacific',
    sampleGreeting: '您好！我是您的智能语音助理。请问今天有什么可以帮您的？'
  },
  { 
    code: 'zh-TW', 
    baseCode: 'zh', 
    name: 'Chinese (Traditional Mandarin)', 
    nativeName: '繁體中文 (國語)', 
    flag: '🇹🇼', 
    region: 'Asia & Pacific',
    sampleGreeting: '您好！我是您的 AI 語音助理。請問今天有什麼我可以為您服務的？'
  },
  { 
    code: 'zh-HK', 
    baseCode: 'zh', 
    name: 'Chinese (Cantonese / Hong Kong)', 
    nativeName: '粵語 / 廣東話', 
    flag: '🇭🇰', 
    region: 'Asia & Pacific',
    sampleGreeting: '你好！我係你嘅 AI 語音助理。請問有咩可以幫到你？'
  },
  { 
    code: 'ko-KR', 
    baseCode: 'ko', 
    name: 'Korean (South Korea)', 
    nativeName: '한국어', 
    flag: '🇰🇷', 
    region: 'Asia & Pacific',
    sampleGreeting: '안녕하세요! 인공지능 음성 비서입니다. 오늘 어떤 도움이 필요하신가요?'
  },
  { 
    code: 'vi-VN', 
    baseCode: 'vi', 
    name: 'Vietnamese (Vietnam)', 
    nativeName: 'Tiếng Việt', 
    flag: '🇻🇳', 
    region: 'Asia & Pacific',
    sampleGreeting: 'Xin chào! Tôi là trợ lý giọng nói AI của bạn. Tôi có thể giúp gì cho bạn hôm nay?'
  },
  { 
    code: 'th-TH', 
    baseCode: 'th', 
    name: 'Thai (Thailand)', 
    nativeName: 'ไทย', 
    flag: '🇹🇭', 
    region: 'Asia & Pacific',
    sampleGreeting: 'สวัสดีครับ/ค่ะ! ฉันคือผู้ช่วยเสียง AI วันนี้มีอะไรให้ฉันช่วยเหลือไหมคะ?'
  },
  { 
    code: 'id-ID', 
    baseCode: 'id', 
    name: 'Indonesian (Indonesia)', 
    nativeName: 'Bahasa Indonesia', 
    flag: '🇮🇩', 
    region: 'Asia & Pacific',
    sampleGreeting: 'Halo! Saya asisten suara AI Anda. Ada yang bisa saya bantu hari ini?'
  },
  { 
    code: 'ms-MY', 
    baseCode: 'ms', 
    name: 'Malay (Malaysia)', 
    nativeName: 'Bahasa Melayu', 
    flag: '🇲🇾', 
    region: 'Asia & Pacific',
    sampleGreeting: 'Hai! Saya pembantu suara AI anda. Bagaimana saya boleh bantu anda hari ini?'
  },
  { 
    code: 'tl-PH', 
    baseCode: 'tl', 
    name: 'Tagalog / Filipino (Philippines)', 
    nativeName: 'Filipino', 
    flag: '🇵🇭', 
    region: 'Asia & Pacific',
    sampleGreeting: 'Kumusta! Ako ang iyong AI voice assistant. Paano kita matutulungan ngayon?'
  },
  { 
    code: 'en-AU', 
    baseCode: 'en', 
    name: 'English (Australia)', 
    nativeName: 'English (AU)', 
    flag: '🇦🇺', 
    region: 'Asia & Pacific',
    sampleGreeting: "G'day! I'm your Australian AI voice assistant. How can I help you today?"
  },
  { 
    code: 'en-NZ', 
    baseCode: 'en', 
    name: 'English (New Zealand)', 
    nativeName: 'English (NZ)', 
    flag: '🇳🇿', 
    region: 'Asia & Pacific',
    sampleGreeting: 'Kia ora! I am your AI assistant in New Zealand. How can I assist you today?'
  },

  // ==============================
  // 🌍 MIDDLE EAST & AFRICA
  // ==============================
  { 
    code: 'ar-SA', 
    baseCode: 'ar', 
    name: 'Arabic (Gulf / Saudi Arabia)', 
    nativeName: 'العربية (الخليج)', 
    flag: '🇸🇦', 
    region: 'Middle East & Africa',
    sampleGreeting: 'أهلاً وسهلاً! أنا مساعدك الصوتی الذكي. كيف يمكنني خدمتك اليوم؟'
  },
  { 
    code: 'ar-EG', 
    baseCode: 'ar', 
    name: 'Arabic (Egypt)', 
    nativeName: 'العربية (مصر)', 
    flag: '🇪🇬', 
    region: 'Middle East & Africa',
    sampleGreeting: 'أهلاً بك! أنا المساعد الصوتي بالذكاء الاصطناعي. أقدر أساعدك إزاي النهاردة؟'
  },
  { 
    code: 'ar-AE', 
    baseCode: 'ar', 
    name: 'Arabic (UAE / Emirates)', 
    nativeName: 'العربية (الإمارات)', 
    flag: '🇦🇪', 
    region: 'Middle East & Africa',
    sampleGreeting: 'مرحباً بك! أنا مساعدك الصوتي الذكي في دولة الإمارات. كيف أقدر أساعدك اليوم؟'
  },
  { 
    code: 'tr-TR', 
    baseCode: 'tr', 
    name: 'Turkish (Turkey)', 
    nativeName: 'Türkçe', 
    flag: '🇹🇷', 
    region: 'Middle East & Africa',
    sampleGreeting: 'Merhaba! Ben sizin yapay zeka sesli asistanınızım. Bugün size nasıl yardımcı olabilirim?'
  },
  { 
    code: 'he-IL', 
    baseCode: 'he', 
    name: 'Hebrew (Israel)', 
    nativeName: 'עברית', 
    flag: '🇮🇱', 
    region: 'Middle East & Africa',
    sampleGreeting: 'שלום! אני העוזר הקולי מבוסס הבינה המלאכותית שלך. איך אוכל לעזור לך היום?'
  },
  { 
    code: 'ka-GE', 
    baseCode: 'ka', 
    name: 'Georgian (Georgia)', 
    nativeName: 'ქართული', 
    flag: '🇬🇪', 
    region: 'Middle East & Africa',
    sampleGreeting: 'გამარჯობა! მე ვარ თქვენი ხელოვნური ინტელექტის ხმოვანი ასისტენტი. რით შემიძლია დაგეხმაროთ?'
  },
  { 
    code: 'sw-KE', 
    baseCode: 'sw', 
    name: 'Swahili (Kenya / Tanzania)', 
    nativeName: 'Kiswahili', 
    flag: '🇰🇪', 
    region: 'Middle East & Africa',
    sampleGreeting: 'Hujambo! Mimi ni msaidizi wako wa sauti wa AI. Ninawezaje kukusaidia leo?'
  }
];

export const CARTESIA_REGIONAL_GROUPS = [
  'India & Indic',
  'North America',
  'Europe',
  'Latin America',
  'Asia & Pacific',
  'Middle East & Africa'
] as const;

export function getCartesiaLanguageByCode(code: string): CartesiaLanguage | undefined {
  if (!code) return undefined;
  const normalized = code.toLowerCase().trim();
  return (
    CARTESIA_SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === normalized) ||
    CARTESIA_SUPPORTED_LANGUAGES.find(l => l.baseCode.toLowerCase() === normalized) ||
    CARTESIA_SUPPORTED_LANGUAGES.find(l => normalized.startsWith(l.baseCode.toLowerCase()))
  );
}

export function getCartesiaLanguageLabel(code: string): string {
  const lang = getCartesiaLanguageByCode(code);
  if (lang) {
    return `${lang.flag} ${lang.nativeName} (${lang.name})`;
  }
  return code;
}

export function getLanguagesGroupedByRegion(): Record<string, CartesiaLanguage[]> {
  const grouped: Record<string, CartesiaLanguage[]> = {};
  for (const region of CARTESIA_REGIONAL_GROUPS) {
    grouped[region] = CARTESIA_SUPPORTED_LANGUAGES.filter(l => l.region === region);
  }
  return grouped;
}
