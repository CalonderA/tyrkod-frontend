import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft } from 'lucide-react';

export const ChatMessage = ({ text, time, isUser, darkMode, actions }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    <div
      className={`max-w-[85%] p-4 rounded-[20px] ${
        isUser
          ? 'bg-[#3B4EF5] text-white rounded-tr-none'
          : darkMode
            ? 'bg-[#262626] border border-white/10 text-white rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
            : 'bg-white border border-[#F0F2F5] text-gray-800 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.03)]'
      }`}
    >
      <p className="text-[15px] leading-[1.5] whitespace-pre-line">{text}</p>
      
      {actions && actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                action.primary
                  ? 'bg-[#3B4EF5] text-white hover:bg-blue-600'
                  : darkMode
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className={`text-[10px] mt-2 ${isUser ? 'text-blue-100' : darkMode ? 'text-gray-500' : 'text-gray-400'} text-right font-medium`}>
        {time}
      </div>
    </div>
  </div>
);

export const IOSDatePicker = React.forwardRef(({ startDate, endDate, onChange, darkMode }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(startDate ? new Date(startDate) : new Date());
  const calendarRef = useRef(null);

  React.useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true)
  }));

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
  };

  const handleYearChange = (offset) => {
    const newDate = new Date(currentDate.getFullYear() + offset, currentDate.getMonth(), 1);
    setCurrentDate(newDate);
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${d}`;

    if (!startDate || (startDate && endDate)) {
      onChange(dateStr, null);
    } else {
      if (dateStr < startDate) {
        onChange(dateStr, null);
      } else {
        onChange(startDate, dateStr);
        setIsOpen(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderDays = () => {
    const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const startDay = startDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isStart = startDate === dateStr;
      const isEnd = endDate === dateStr;
      const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;
      const isToday = today.toDateString() === dateObj.toDateString();
      const isPast = dateObj < today;

      days.push(
        <div key={d} className="relative h-10 w-10 flex items-center justify-center">
          {isInRange && (
            <div className={`absolute inset-y-1 inset-x-0 ${darkMode ? 'bg-[#3B4EF5]/20' : 'bg-[#3B4EF5]/10'}`}></div>
          )}
          {isStart && endDate && (
            <div className={`absolute inset-y-1 right-0 left-1/2 ${darkMode ? 'bg-[#3B4EF5]/20' : 'bg-[#3B4EF5]/10'}`}></div>
          )}
          {isEnd && startDate && (
            <div className={`absolute inset-y-1 left-0 right-1/2 ${darkMode ? 'bg-[#3B4EF5]/20' : 'bg-[#3B4EF5]/10'}`}></div>
          )}
          <button
            onClick={() => !isPast && handleDateSelect(d)}
            disabled={isPast}
            className={`relative z-10 h-10 w-10 flex items-center justify-center rounded-full text-[14px] font-medium transition-all ${
              isStart || isEnd
                ? 'bg-[#3B4EF5] text-white' 
                : isPast
                  ? 'opacity-20 cursor-not-allowed'
                  : isToday
                    ? 'text-[#3B4EF5] font-bold'
                    : darkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'
            }`}
          >
            {d}
          </button>
        </div>
      );
    }
    return days;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative flex-1" ref={calendarRef}>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 rounded-2xl border text-[14px] text-left transition-all duration-300 focus:outline-none focus:ring-2 flex items-center justify-between ${
            darkMode 
              ? 'bg-white/5 border-white/10 text-white focus:ring-[#3B4EF5]/30 focus:border-[#3B4EF5]' 
              : 'bg-white border-gray-200 text-gray-700 focus:ring-[#3B4EF5]/10 focus:border-[#3B4EF5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} className={`opacity-40 ${darkMode ? 'text-white' : 'text-[#3B4EF5]'}`} />
            <span className="font-bold">
              {startDate ? (
                endDate ? `${formatDate(startDate)} — ${formatDate(endDate)}` : `С ${formatDate(startDate)}...`
              ) : 'Выбрать даты поездки'}
            </span>
          </div>
          <ChevronLeft size={16} className={`opacity-40 transition-transform ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute bottom-full mb-4 left-0 z-[100] w-[320px] p-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border backdrop-blur-xl ${
              darkMode 
                ? 'bg-[#262626]/90 border-white/10' 
                : 'bg-white/90 border-gray-100'
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <span className={`text-[17px] font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {months[currentDate.getMonth()]}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleYearChange(-1)} className={`text-[12px] opacity-50 hover:opacity-100 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentDate.getFullYear() - 1}
                    </button>
                    <span className={`text-[14px] font-bold ${darkMode ? 'text-[#3B4EF5]' : 'text-[#3B4EF5]'}`}>
                      {currentDate.getFullYear()}
                    </span>
                    <button onClick={() => handleYearChange(1)} className={`text-[12px] opacity-50 hover:opacity-100 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentDate.getFullYear() + 1}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={handlePrevMonth} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-[#3B4EF5]'}`}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={handleNextMonth} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-[#3B4EF5]'}`}>
                    <ChevronLeft size={20} className="rotate-180" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                  <div key={day} className={`h-8 flex items-center justify-center text-[13px] font-bold opacity-30 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {day}
                  </div>
                ))}
                {renderDays()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
