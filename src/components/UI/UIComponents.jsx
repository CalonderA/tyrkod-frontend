import React from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ darkMode, toggle }) => (
  <button 
    onClick={toggle}
    className={`p-2 rounded-full transition-all duration-300 ${
      darkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {darkMode ? <Sun size={24} /> : <Moon size={24} />}
  </button>
);

export const SidebarItem = ({ icon, label, active, darkMode, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-[210px] flex items-center gap-4 px-6 py-3 rounded-[14px] transition-all duration-300 group ${
    active 
      ? 'bg-white shadow-[0_4px_20px_rgba(255,255,255,0.1)] scale-[1.02]' 
      : 'bg-white/10 hover:bg-white/20 hover:scale-[1.01]'
  }`}>
    <div className="w-6 h-6 flex items-center justify-center shrink-0">
      <img 
        src={icon} 
        alt="" 
        className={`w-full h-full object-contain transition-transform group-hover:rotate-3 ${
          active 
            ? '' 
            : 'brightness-0 invert'
        }`} 
        style={active ? { 
          filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' 
        } : {}} 
      />
    </div>
    <span className={`text-[15px] font-bold tracking-tight ${
      active 
        ? 'text-[#3B4EF5]' 
        : 'text-white'
    }`}>{label}</span>
  </button>
);

export const Tag = ({ label, icon, active, darkMode, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-[12px] border transition-all duration-300 ${
    active 
      ? 'bg-[#3B4EF5] border-[#3B4EF5] text-white shadow-lg shadow-blue-500/20 scale-105' 
      : darkMode
        ? 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
        : 'bg-white border-gray-200 text-gray-700 hover:border-[#3B4EF5]/50'
  }`}>
    {icon && <img src={icon} alt="" className={`w-5 h-5 object-contain shrink-0 ${!active && darkMode ? 'brightness-0 invert' : ''}`} />}
    <span className="text-[14px] font-bold whitespace-nowrap">{label}</span>
  </button>
);
