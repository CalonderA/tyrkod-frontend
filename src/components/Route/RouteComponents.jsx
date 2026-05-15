import React from 'react';
import { BookOpen, X } from 'lucide-react';

export const HotelCard = ({ title, address, rating, price, image, website, darkMode, translations, lang }) => (
  <div 
    className={`flex flex-col mb-10 transition-all duration-500 overflow-hidden ${
      darkMode ? 'bg-[#262626]' : 'bg-white'
    }`}
    style={{
      width: '100%',
      maxWidth: '460px',
      borderRadius: '24px',
      boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(59, 78, 245, 0.04)',
      border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(59, 78, 245, 0.05)'
    }}
  >
    <div className="h-[180px] md:h-[220px] w-full relative overflow-hidden">
      <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
      <div className="absolute top-4 left-4 bg-[#3B4EF5] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
        {translations[lang || 'RU']?.recommendedHotel}
      </div>
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-[#3B4EF5] text-[14px] font-black px-3 py-1 rounded-xl shadow-lg">
        {price}
      </div>
    </div>
    <div className="p-4 md:p-5 flex flex-col">
      <div className="flex justify-between items-start mb-1">
        <h3 className={`font-bold text-[17px] md:text-[19px] leading-tight ${darkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>{title}</h3>
        <div className="flex items-center gap-1 bg-[#FFD700]/10 px-2 py-0.5 rounded-lg shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span className={`text-[12px] md:text-[13px] font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{rating}</span>
        </div>
      </div>
      <div className={`text-[12px] md:text-[13px] flex items-center gap-1.5 opacity-60 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <span className="text-[#3B4EF5] opacity-70">📍</span>
        {address}
      </div>
      
      {website && (
        <a 
          href={website} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-3 bg-[#3B4EF5]/10 text-[#3B4EF5] text-[14px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#3B4EF5] hover:text-white transition-all duration-300"
        >
          <BookOpen size={16} />
          <span>Посмотреть на сайте</span>
        </a>
      )}
    </div>
  </div>
);

export const RouteItem = ({ number, title, address, category, rating, hours, image, isLast, darkMode, isPast }) => (
  <div className={`flex gap-4 md:gap-6 mb-10 group relative transition-all duration-500 ${isPast ? 'opacity-40 pointer-events-none' : ''}`}>
    {!isLast && (
      <div 
        className="absolute left-[20px] md:left-[24px] top-[40px] md:top-[48px] bottom-[-40px] w-[2px]"
        style={{ backgroundColor: isPast ? '#D1D5DB' : '#3B4EF5', opacity: 0.2 }}
      ></div>
    )}

    <div className={`w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center text-white text-[16px] md:text-[20px] font-black shrink-0 z-10 transition-all ${
      isPast ? 'bg-gray-200 text-gray-400' : 'bg-[#3B4EF5] shadow-lg shadow-blue-500/30'
    }`}>
      {isPast ? <X size={20} strokeWidth={3} /> : number}
    </div>

    <div 
      className={`flex items-center justify-between transition-all duration-500 ${
        darkMode 
          ? isPast ? 'bg-[#222] border-transparent' : 'bg-[#262626] hover:bg-[#2d2d2d]' 
          : isPast ? 'bg-gray-50 border-gray-100' : 'bg-white hover:bg-gray-50'
      }`}
      style={{
        width: '100%',
        maxWidth: '460px',
        minHeight: '100px',
        borderRadius: '24px',
        padding: '16px 20px',
        boxShadow: isPast ? 'none' : (darkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(59, 78, 245, 0.04)'),
        border: isPast ? '1px solid rgba(0,0,0,0.05)' : (darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(59, 78, 245, 0.05)'),
      }}
    >
      <div className="flex-1 pr-4 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`text-[10px] md:text-[11px] font-black tracking-widest uppercase opacity-80 ${isPast ? 'text-gray-400' : 'text-[#3B4EF5]'}`}>{category}</div>
          {isPast && <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded-full shrink-0">Завершено</span>}
        </div>
        <h3 className={`font-bold text-[16px] md:text-[19px] mb-1.5 leading-tight truncate ${
          isPast ? 'text-gray-400 line-through' : (darkMode ? 'text-white' : 'text-[#1A1A1A]')
        }`}>{title}</h3>
        
        {address && (
          <div className={`text-[11px] md:text-[12px] mb-3 truncate flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="text-[#3B4EF5] opacity-70">📍</span>
            {address}
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 bg-[#FFD700]/10 px-2 py-0.5 rounded-lg">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFD700">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className={`text-[11px] md:text-[13px] font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{rating}</span>
          </div>

          <div className={`px-2 py-0.5 rounded-lg text-[10px] md:text-[11px] font-bold flex items-center gap-1.5 ${
            darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            <span className="opacity-50 text-[12px] md:text-[14px]">🕒</span> {hours}
          </div>
        </div>
      </div>
      <div className={`w-[80px] h-[65px] md:w-[110px] md:h-[85px] rounded-[14px] md:rounded-[18px] overflow-hidden shrink-0 transition-all duration-500 group-hover:scale-[1.05] shadow-sm`}>
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      </div>
    </div>
  </div>
);
