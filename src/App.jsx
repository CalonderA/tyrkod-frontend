import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Maximize2, CheckCircle2, ChevronLeft, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRoute } from './services/gigaChat';

// Assets
import {
  archIcon,
  gastroIcon,
  museumsOffIcon,
  activeIcon,
  homeIcon,
  profileIcon,
  heartIcon,
  settingsIcon,
  chatIcon,
  logoBg,
  logoMain,
  arrowRightBold,
  tutorialIcon,
  arrowRight,
  logoSidebar,
  chatHeaderLogo
} from './assets';

// Components
import { TwoGisContainer, TwoGisMarker, TwoGisRoute } from './components/Map/TwoGisMap';
import { ThemeToggle, SidebarItem, Tag } from './components/UI/UIComponents';
import { ChatMessage, IOSDatePicker } from './components/Chat/ChatComponents';
import { HotelCard, RouteItem } from './components/Route/RouteComponents';

// Utils
import { translations } from './utils/translations';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('landing'); // 'landing', 'list' or 'map'
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState('RU');
  const chatContainerRef = useRef(null);

  const t = (key) => translations[lang][key] || key;

  // Filters State
  const [selectedBudget, setSelectedBudget] = useState('middle');
  const [selectedInterests, setSelectedInterests] = useState(['arch']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const budgetOptions = [
    { label: 'economy', icon: '💰' },
    { label: 'middle', icon: '💰💰' },
    { label: 'premium', icon: '💎' }
  ];

  const interestOptions = [
    { label: 'arch', icon: archIcon },
    { label: 'gastro', icon: gastroIcon },
    { label: 'nature', icon: museumsOffIcon },
    { label: 'museums', icon: archIcon },
    { label: 'active', icon: activeIcon }
  ];

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const [messages, setMessages] = useState([
    {
      text: "Привет. Я могу спланировать идеальное путешествие по городам России, учитывая ваши предпочтения, бюджет и реальное время на локации",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    }
  ]);

  const [routeItems, setRouteItems] = useState([]);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [lastAIResponse, setLastAIResponse] = useState(null);
  const [isChatBudgetOpen, setIsChatBudgetOpen] = useState(false);
  const [isChatInterestsOpen, setIsChatInterestsOpen] = useState(false);
  const datePickerRef = useRef();
  const handleSendMessageRef = useRef();

  const allCoords = useMemo(() => {
    return routeItems.flatMap(day => [
      ...(day.hotel ? [day.hotel.coords] : []),
      ...day.items.map(item => item.coords)
    ]).filter(Boolean);
  }, [routeItems]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleViewMode = () => setViewMode(viewMode === 'list' ? 'map' : 'list');

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (forcedPrompt = null) => {
    const userText = (typeof forcedPrompt === 'string') ? forcedPrompt : inputValue;
    if (!userText || !userText.trim() || isLoading) return;

    if (typeof forcedPrompt !== 'string') {
      setInputValue('');
      setLastUserPrompt(userText);
    }
    setIsLoading(true);

    const handleAction = (type) => {
      if (type === 'yes') {
        setMessages(prev => [...prev, {
          text: "Отлично! Ваш идеальный маршрут зафиксирован. Все бронирования и детали сохранены в вашем профиле. Приятного путешествия! ✈️",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: false
        }]);
      } else if (type === 'change') {
        setMessages(prev => [...prev, {
          text: "Понял вас! Давайте доведем маршрут до идеала. Что именно мы изменим?\n\n• Есть ли места, которые стоит исключить?\n• Хотите сменить отель или район проживания?\n• Нужно ли скорректировать бюджет?\n• Добавить больше свободного времени или активности?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: false,
          actions: [
            { label: "🏨 Другой отель", onClick: () => setInputValue("Хочу другой отель, более...") },
            { label: "🏛️ Меньше музеев", onClick: () => setInputValue("Давай меньше музеев, больше прогулок") },
            { label: "💰 Изменить бюджет", onClick: () => setInputValue("Нужно пересчитать под другой бюджет") }
          ]
        }]);
      }
    };

    if (typeof forcedPrompt !== 'string') {
      const newUserMsg = {
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: true
      };
      setMessages(prev => [...prev, newUserMsg]);
    }

    try {
      const contextInfo = `
Контекст (фильтры):
- Даты: ${startDate && endDate ? `с ${startDate} по ${endDate}` : 'не указаны'}
- Бюджет: ${selectedBudget || 'не выбран'}
- Интересы: ${selectedInterests.length > 0 ? selectedInterests.join(', ') : 'не указаны'}

Запрос пользователя: ${userText}
(Используй историю сообщений выше, чтобы понять, какой город откуда и куда)`;
      
      const history = messages.slice(-5).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text
      }));

      history.push({ role: 'user', content: contextInfo });

      const data = await generateRoute(history);
      
      const aiMsg = {
        text: data.chatResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: false,
        isClarification: !data.routeItems || data.routeItems.length === 0
      };

      if (aiMsg.isClarification) {
        setLastAIResponse(aiMsg);
      } else {
        setLastAIResponse(null);
      }

      if (data.routeItems && data.routeItems.length > 0) {
        aiMsg.text += "\n\nВсе ли верно в этом маршруте или хотите что-то изменить?";
        aiMsg.actions = [
          { label: "✅ Все идеально!", primary: true, onClick: () => handleAction('yes') },
          { label: "🔄 Нужно поправить", primary: false, onClick: () => handleAction('change') }
        ];
        setRouteItems(data.routeItems);
        setLastAIResponse(null);
        setIsChatFullscreen(false);
      } else {
        aiMsg.actions = [];
      }

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        text: `Извини, произошла ошибка: ${error.message}. Попробуй еще раз.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 overflow-hidden ${darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-900'}`}>
      <AnimatePresence mode="wait">
        {viewMode === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[1000] flex flex-col overflow-y-auto scroll-smooth ${darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-900'}`}
          >
            <div className="min-h-screen flex flex-col items-center justify-center relative shrink-0 py-20">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute -top-10 -right-10 w-[200px] h-[200px] md:w-[400px] md:h-[400px] pointer-events-none"
              >
                <img src={logoBg} alt="" className="w-full h-full object-contain text-[#3B4EF5]" style={{ filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' }} />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute -bottom-10 -left-10 w-[200px] h-[200px] md:w-[400px] md:h-[400px] pointer-events-none"
              >
                <img src={logoBg} alt="" className="w-full h-full object-contain text-[#3B4EF5]" style={{ filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' }} />
              </motion.div>

              <div className="flex items-center justify-center mb-10 md:mb-16 select-none w-full px-6 md:px-10 shrink-0">
                <img src={logoMain} alt="ТурКод" className="w-full max-w-[280px] sm:max-w-[500px] md:max-w-[800px] lg:max-w-[1164px] h-auto object-contain" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full max-w-[280px] sm:max-w-none px-6 justify-center items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('list')}
                  className="flex items-center px-6 sm:px-8 py-3.5 sm:py-4 bg-[#4255ff] text-white rounded-[14px] sm:rounded-[18px] shadow-[0_15px_35px_rgba(66,85,255,0.25)] hover:bg-[#3b4ce6] transition-all w-full sm:w-auto sm:min-w-[200px] justify-center"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      <img src={arrowRightBold} alt="" className="w-full h-full object-contain brightness-0 invert" />
                    </div>
                    <span className="text-[16px] sm:text-[22px] font-bold">{t('letsGo')}</span>
                  </div>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center px-6 sm:px-8 py-3.5 sm:py-4 bg-[#4255ff] text-white rounded-[14px] sm:rounded-[18px] shadow-[0_15px_35px_rgba(66,85,255,0.25)] hover:bg-[#3b4ce6] transition-all w-full sm:w-auto sm:min-w-[200px] justify-center"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      <img src={tutorialIcon} alt="" className="w-full h-full object-contain brightness-0 invert" />
                    </div>
                    <span className="text-[16px] sm:text-[22px] font-bold">{t('tutorial')}</span>
                  </div>
                </motion.button>
              </div>

              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center gap-2 opacity-30">
                <span className="text-[12px] font-bold uppercase tracking-widest text-center w-full">{t('scrollDown')}</span>
                <ChevronLeft size={24} className="-rotate-90" />
              </motion.div>
            </div>

            <div id="how-it-works" className="min-h-screen relative flex flex-col items-center justify-start bg-white py-12 sm:py-20 px-4 sm:px-6">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[1000px] sm:h-[1000px] opacity-[0.03] pointer-events-none">
                <img src={logoBg} alt="" className="w-full h-full object-contain" style={{ filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' }} />
              </div>

              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-around py-4 opacity-[0.03] sm:opacity-[0.05]" style={{ zIndex: 0 }}>
                {Array.from({ length: 22 }).map((_, i) => (
                  <div key={i} className="flex whitespace-nowrap justify-center gap-4 sm:gap-8 font-oswald text-[24px] sm:text-[48px] uppercase tracking-tighter" style={{ color: '#3B4EF5', transform: i % 2 === 0 ? 'translateX(0)' : 'translateX(-30px)' }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <span key={j}>{t('howItWorks')}</span>
                    ))}
                  </div>
                ))}
              </div>

              <div className="relative z-10 w-full max-w-[1500px] flex flex-col items-center">
                <h2 className="text-[32px] sm:text-[40px] md:text-[80px] font-black mb-12 sm:mb-20 md:mb-32 text-center tracking-tighter text-[#3B4EF5] font-oswald uppercase">
                  {t('howItWorks')}
                </h2>

                <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 w-full mb-12 sm:mb-20 md:mb-32">
                  {[1, 2, 3].map((step) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center w-full max-w-[450px]">
                        <div className="relative overflow-hidden group w-full h-[200px] sm:h-[240px]" style={{ borderRadius: '32px' }}>
                          <div className="bg-[#3B4EF5] shadow-[0_20px_60px_rgba(59,78,245,0.15)] flex flex-col items-start text-left w-full h-full transition-all duration-500 group-hover:scale-[1.02] p-[30px] relative">
                            <div className="absolute -right-4 -bottom-6 sm:-right-6 sm:-bottom-10 opacity-[0.12] text-white pointer-events-none font-oswald font-black text-[180px] sm:text-[280px] leading-none select-none">
                              {step}
                            </div>
                            <div className="relative z-10">
                              <h3 className="text-white text-[24px] sm:text-[32px] font-bold mb-2 sm:mb-4 leading-tight">{t(`step${step}Title`)}</h3>
                              <p className="text-white/80 text-[15px] sm:text-[18px] leading-relaxed max-w-[280px] sm:max-w-[340px]">{t(`step${step}Desc`)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {step < 3 && (
                        <div className="hidden lg:block shrink-0">
                          <img src={arrowRight} alt="" className="object-contain w-[80px] h-[80px] opacity-20 invert" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setViewMode('list')} className="flex items-center px-8 sm:px-12 py-4 sm:py-5 bg-[#3B4EF5] text-white rounded-[20px] sm:rounded-[24px] shadow-[0_20px_50px_rgba(59,78,245,0.3)] hover:bg-[#2e3ed9] transition-all justify-center group mb-10">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <span className="text-[18px] sm:text-[24px] font-black uppercase tracking-tight">{t('letsGo')}</span>
                    <div className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center transition-transform group-hover:translate-x-2">
                      <img src={arrowRightBold} alt="" className="w-full h-full object-contain brightness-0 invert" />
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {viewMode !== 'landing' && (
        <>
          <div className={`hidden lg:flex w-[280px] flex-col p-8 shrink-0 relative transition-colors duration-300 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-[#3B4EF5]'}`}>
            <div className="absolute flex items-center justify-center select-none w-full top-[40px] left-0">
              <img src={logoSidebar} alt="ТурКод" style={{ width: '100px', height: 'auto' }} className="object-contain brightness-0 invert" />
            </div>
            <div className="h-[96px] mb-10"></div>
            <nav className="flex flex-col gap-4 items-center">
              <SidebarItem icon={homeIcon} label={t('home')} active={viewMode === 'landing'} darkMode={darkMode} onClick={() => setViewMode('landing')} />
              <SidebarItem icon={profileIcon} label={t('profile')} darkMode={darkMode} />
              <SidebarItem icon={heartIcon} label={t('favorites')} darkMode={darkMode} />
              <SidebarItem icon={settingsIcon} label={t('settings')} darkMode={darkMode} />
            </nav>
            <div className="mt-auto flex items-center justify-end w-full px-4 mb-4 gap-7">
              <ThemeToggle darkMode={darkMode} toggle={toggleDarkMode} />
              <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} className="text-[20px] font-bold text-white opacity-90 hover:opacity-100 transition-opacity w-8">{lang}</button>
            </div>
          </div>

          <div className={`flex-1 flex flex-col p-4 md:p-6 lg:p-12 gap-4 md:gap-8 max-w-[1440px] mx-auto w-full transition-colors duration-300 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-white'} h-screen overflow-hidden`}>
            <AnimatePresence mode="wait">
              {viewMode === 'list' ? (
                <motion.div key="chat-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col lg:flex-row gap-8 lg:gap-12 w-full overflow-y-auto lg:overflow-hidden pb-[80px] md:pb-0">
                  <div className={`${isChatFullscreen ? 'flex-1 max-w-[1200px] mx-auto' : 'flex-none lg:flex-1'} flex flex-col w-full min-h-0 transition-all duration-500`}>
                    <div className="flex items-center justify-between mb-4 md:mb-10 shrink-0">
                      <div className="flex flex-col gap-1">
                        <div className="mb-1"><img src={chatHeaderLogo} alt="ТурКод" className="h-[35px] md:h-[45px] w-auto object-contain" /></div>
                        <div className="flex items-center gap-2 text-[12px] md:text-[14px] text-[#4BB37E] font-medium"><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#4BB37E] rounded-full"></span>{t('online')}</div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:hidden">
                          <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} className={`text-[16px] font-bold ${darkMode ? 'text-white' : 'text-[#3B4EF5]'}`}>{lang}</button>
                          <ThemeToggle darkMode={darkMode} toggle={toggleDarkMode} />
                        </div>
                        <img src={chatIcon} alt="chat" style={{ width: '20px', height: '18px' }} className={`cursor-pointer opacity-70 hover:opacity-100 transition-opacity object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                        <button onClick={() => setIsChatFullscreen(!isChatFullscreen)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                          <Maximize2 className={`w-5 h-5 md:w-6 md:h-6 cursor-pointer opacity-70 hover:opacity-100 transition-all ${darkMode ? 'text-white' : 'text-gray-900'} ${isChatFullscreen ? 'rotate-180 scale-110' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-2 relative scrollbar-hide min-h-0">
                      {messages.map((msg, i) => <ChatMessage key={i} {...msg} darkMode={darkMode} />)}
                      {lastAIResponse && !isLoading && (
                        <div className="flex flex-col gap-3 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                          <div className="flex flex-wrap gap-2.5 justify-start px-4">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { document.querySelector('.trip-dates-section')?.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => datePickerRef.current?.open(), 300); }} className={`relative group px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-500 shadow-lg overflow-hidden ${startDate && endDate ? 'bg-[#4BB37E] text-white' : darkMode ? 'bg-white/10 text-white' : 'bg-[#F0F2F5] text-gray-700'}`}>
                              <div className="flex items-center gap-2 relative z-10">
                                <Calendar size={13} className={startDate && endDate ? 'text-white' : 'text-[#3B4EF5]'} />
                                <span>{startDate && endDate ? `${new Date(startDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})} — ${new Date(endDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})}` : 'Даты поездки'}</span>
                              </div>
                            </motion.button>
                            
                            <div className="relative">
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsChatBudgetOpen(!isChatBudgetOpen)} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-500 shadow-xl ${selectedBudget ? 'bg-[#3B4EF5] text-white' : darkMode ? 'bg-white/10 text-white' : 'bg-[#F0F2F5] text-gray-700'}`}>
                                <span className="tracking-tight">💰 {selectedBudget ? t(selectedBudget) : 'Бюджет'}</span>
                              </motion.button>
                              <AnimatePresence>
                                {isChatBudgetOpen && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute bottom-full mb-3 left-0 z-[210] p-1 rounded-[24px] shadow-2xl border backdrop-blur-2xl flex gap-1 ${darkMode ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-100'}`}>
                                    {budgetOptions.map((opt) => (
                                      <button key={opt.label} onClick={() => { setSelectedBudget(opt.label); setIsChatBudgetOpen(false); }} className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap ${selectedBudget === opt.label ? 'bg-[#3B4EF5] text-white' : darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                                        {opt.icon} {t(opt.label)}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="relative">
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsChatInterestsOpen(!isChatInterestsOpen)} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-500 shadow-xl ${selectedInterests.length > 0 ? 'bg-[#3B4EF5] text-white' : darkMode ? 'bg-white/10 text-white' : 'bg-[#F0F2F5] text-gray-700'}`}>
                                <span className="tracking-tight">🎯 {selectedInterests.length > 0 ? `${selectedInterests.length} интереса` : 'Интересы'}</span>
                              </motion.button>
                              <AnimatePresence>
                                {isChatInterestsOpen && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute bottom-full mb-3 left-0 z-[210] p-4 rounded-[28px] shadow-2xl border backdrop-blur-2xl flex flex-col gap-1.5 min-w-[240px] ${darkMode ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-100'}`}>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Что интересно?</h4>
                                    <div className="grid grid-cols-1 gap-1">
                                      {interestOptions.map((opt) => (
                                        <button key={opt.label} onClick={() => toggleInterest(opt.label)} className={`flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${selectedInterests.includes(opt.label) ? 'bg-[#3B4EF5] text-white' : darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                                          <div className="flex items-center gap-2">
                                            {opt.icon && <img src={opt.icon} alt="" className={`w-4 h-4 object-contain ${selectedInterests.includes(opt.label) ? 'brightness-0 invert' : 'opacity-70'}`} />}
                                            <span>{t(opt.label)}</span>
                                          </div>
                                          {selectedInterests.includes(opt.label) && <CheckCircle2 size={14} strokeWidth={3} />}
                                        </button>
                                      ))}
                                    </div>
                                    <button onClick={() => setIsChatInterestsOpen(false)} className="mt-2 w-full py-2.5 bg-[#3B4EF5] text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Сохранить</button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setIsChatBudgetOpen(false); setIsChatInterestsOpen(false); handleSendMessageRef.current(lastUserPrompt); }} className="relative group px-6 py-1.5 rounded-full text-[13px] font-black bg-[#3B4EF5] text-white shadow-2xl shadow-blue-500/40 overflow-hidden">
                              <span className="relative z-10 uppercase tracking-tighter">🚀 Поехали</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-[#3B4EF5] via-[#6374ff] to-[#3B4EF5] bg-[length:200%_100%] animate-gradient"></div>
                            </motion.button>
                          </div>
                        </div>
                      )}
                      {isLoading && (
                        <div className="flex justify-start mb-4">
                          <div className={`py-3 px-5 rounded-[20px] rounded-tl-none ${darkMode ? 'bg-[#262626] text-white/70' : 'bg-gray-50 text-gray-500 shadow-sm border border-[#F0F2F5]'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[14px] font-medium italic">{t('planning')}</span>
                              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>.</motion.span>
                              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}>.</motion.span>
                              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}>.</motion.span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:gap-3 mb-2 shrink-0 relative z-[200]">
                      <div className="flex flex-col gap-1 budget-section">
                        <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-wider opacity-60 ${darkMode ? 'text-white' : 'text-gray-600'}`}>{t('budget')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {budgetOptions.map((opt) => (
                            <button key={opt.label} onClick={() => setSelectedBudget(opt.label)} className={`flex items-center gap-1.5 px-2.5 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border transition-all duration-300 ${selectedBudget === opt.label ? 'bg-[#3B4EF5] border-[#3B4EF5] text-white shadow-lg' : darkMode ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                              <span className="text-[11px] md:text-[13px]">{opt.icon} {t(opt.label)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-wider opacity-60 ${darkMode ? 'text-white' : 'text-gray-600'}`}>{t('interests')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {interestOptions.map((opt) => <Tag key={opt.label} label={t(opt.label)} icon={opt.icon} active={selectedInterests.includes(opt.label)} darkMode={darkMode} onClick={() => toggleInterest(opt.label)} />)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 trip-dates-section">
                        <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-gray-600'}`}>{t('tripDates')}</span>
                        <IOSDatePicker ref={datePickerRef} startDate={startDate} endDate={endDate} onChange={(start, end) => { setStartDate(start); setEndDate(end); }} darkMode={darkMode} />
                      </div>

                      <div className="relative">
                        <input type="text" placeholder={t('whereToGo')} className={`w-full py-2.5 md:py-4 px-4 md:px-6 rounded-[12px] md:rounded-[18px] border focus:outline-none focus:ring-2 text-[13px] md:text-[16px] shadow-sm ${darkMode ? 'bg-[#262626] border-white/10 text-white placeholder:text-gray-500' : 'bg-white border-[#3B4EF5]/30 text-gray-900 placeholder:text-blue-300'}`} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} disabled={isLoading} />
                        <button onClick={() => handleSendMessage()} disabled={isLoading} className={`absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all hover:opacity-80 ${isLoading ? 'opacity-50' : ''}`} style={{ width: '24px', height: '24px', border: '2px solid #3B4EF5', borderRadius: '12px', padding: '4px' }}>
                          {isLoading ? <Loader2 className="w-full h-full animate-spin text-[#3B4EF5]" /> : <Send className="w-full h-full text-[#3B4EF5]" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`${isChatFullscreen ? 'hidden' : 'w-full flex-none lg:flex-1 lg:max-w-[600px]'} p-4 md:p-6 lg:overflow-y-auto transition-all duration-500 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-white'} border-t lg:border-t-0 ${darkMode ? 'border-white/10' : 'border-gray-100'} mt-10 lg:mt-0`}>
                    <h2 className={`text-[28px] md:text-[40px] font-bold mb-6 md:mb-10 flex items-baseline gap-3 font-oswald uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('yourRoute')}</h2>
                    <div className="flex flex-col">
                      {routeItems.map((dayGroup, groupIdx) => (
                        <div key={groupIdx} className={groupIdx === routeItems.length - 1 ? "" : "mb-6"}>
                          <h3 className={`text-[18px] md:text-[20px] font-bold mb-4 md:mb-6 ml-10 md:ml-[72px] italic ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dayGroup.day}</h3>
                          {dayGroup.hotel && <div className="ml-10 md:ml-[72px]"><HotelCard {...dayGroup.hotel} darkMode={darkMode} translations={translations} lang={lang} /></div>}
                          <div className="flex flex-col">
                            {dayGroup.items.map((item, i) => <RouteItem key={i} {...item} isLast={groupIdx === routeItems.length - 1 && i === dayGroup.items.length - 1} darkMode={darkMode} isPast={false} />)}
                          </div>
                        </div>
                      ))}
                      <div className="relative flex gap-6 mt-4 mb-20 ml-0">
                        <div className="absolute left-[20px] md:left-[24px] top-[-40px] h-[40px] w-[2px]" style={{ backgroundColor: '#3B4EF5', opacity: 0.2 }}></div>
                        <motion.button onClick={toggleViewMode} className={`w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${darkMode ? 'bg-[#262626] text-[#3B4EF5]' : 'bg-white text-[#3B4EF5] border border-[#3B4EF5]/10 shadow-md'}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ChevronLeft size={20} className="rotate-[270deg]" /></motion.button>
                        <span className={`text-[14px] md:text-[16px] font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('watchOnMap')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="map-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 w-full h-full lg:h-[calc(100vh-100px)]">
                  <div className={`w-full lg:w-[600px] p-4 md:p-8 overflow-y-auto rounded-[24px] md:rounded-[32px] shadow-sm ${darkMode ? 'bg-[#262626]' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-6 md:mb-8"><button onClick={toggleViewMode} className="flex items-center gap-2 text-[#3B4EF5] font-bold hover:opacity-80 transition-opacity text-[14px] md:text-[16px]"><ChevronLeft size={20} />{t('backToChat')}</button></div>
                    <h2 className={`text-[28px] md:text-[36px] font-bold mb-6 md:mb-8 font-oswald uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('yourRoute')}</h2>
                    <div className="flex flex-col">
                      {routeItems.map((dayGroup, groupIdx) => (
                        <div key={groupIdx} className={groupIdx === routeItems.length - 1 ? "" : "mb-6 md:mb-8"}>
                          <h3 className={`text-[18px] md:text-[20px] font-bold mb-4 md:mb-6 ml-10 md:ml-[72px] italic ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dayGroup.day}</h3>
                          {dayGroup.hotel && <div className="ml-10 md:ml-[72px]"><HotelCard {...dayGroup.hotel} darkMode={darkMode} translations={translations} lang={lang} /></div>}
                          <div className="flex flex-col">
                            {dayGroup.items.map((item, i) => <RouteItem key={i} {...item} isLast={groupIdx === routeItems.length - 1 && i === dayGroup.items.length - 1} darkMode={darkMode} isPast={false} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="flex-1 min-h-[400px] lg:min-h-0 rounded-[24px] md:rounded-[32px] overflow-hidden border-2 border-[#3B4EF5]/20 shadow-2xl relative z-10">
                    <TwoGisContainer darkMode={darkMode} coords={allCoords}>
                      <TwoGisRoute coords={allCoords} />
                      {routeItems.map(day => day.hotel).filter(Boolean).map((hotel, idx) => <TwoGisMarker key={`hotel-${idx}`} position={hotel.coords} isHotel={true} title={hotel.title} address={hotel.address} />)}
                      {routeItems.flatMap(day => day.items).map((item, idx) => <TwoGisMarker key={`item-${idx}`} position={item.coords} title={item.title} address={item.address} />)}
                    </TwoGisContainer>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] px-4 pb-4">
              <div className={`flex items-center justify-between p-2 rounded-[24px] shadow-lg backdrop-blur-xl border ${darkMode ? 'bg-[#1A1A1A]/80 border-white/10' : 'bg-white/80 border-gray-100'}`}>
                <button onClick={() => setViewMode('landing')} className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all ${viewMode === 'landing' ? 'bg-[#3B4EF5] text-white' : 'text-gray-400'}`}>
                  <div className="w-6 h-6 flex items-center justify-center mx-auto"><img src={homeIcon} alt="" className={`w-6 h-6 object-contain ${viewMode === 'landing' ? 'brightness-0 invert' : 'opacity-50'}`} /></div>
                  <span className="text-[10px] font-bold text-center w-full leading-none">{t('home')}</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all ${viewMode === 'list' || viewMode === 'map' ? 'bg-[#3B4EF5] text-white' : 'text-gray-400'}`}>
                  <div className="w-6 h-6 flex items-center justify-center mx-auto"><img src={chatIcon} alt="" className={`w-6 h-6 object-contain ${viewMode === 'list' || viewMode === 'map' ? 'brightness-0 invert' : 'opacity-50'}`} /></div>
                  <span className="text-[10px] font-bold text-center w-full leading-none">Чат</span>
                </button>
                <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 text-gray-400">
                  <div className="w-6 h-6 flex items-center justify-center mx-auto"><img src={heartIcon} alt="" className="w-6 h-6 object-contain opacity-50" /></div>
                  <span className="text-[10px] font-bold text-center w-full leading-none">{t('favorites')}</span>
                </button>
                <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 text-gray-400">
                  <div className="w-6 h-6 flex items-center justify-center mx-auto"><img src={profileIcon} alt="" className="w-6 h-6 object-contain opacity-50" /></div>
                  <span className="text-[10px] font-bold text-center w-full leading-none">{t('profile')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
