  import React, { useState, useRef, useEffect, useMemo } from 'react';
  import { Send, Maximize2, MessageSquare, CheckCircle2, Sun, Moon, Map as MapIcon, List, ChevronLeft, Loader2, Calendar, Zap, BookOpen, X } from 'lucide-react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { generateRoute } from './services/gigaChat';

  // 2GIS Maps Components
  const MapContext = React.createContext(null);

  const TwoGisContainer = ({ children, darkMode, coords }) => {
    const mapRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapError, setMapError] = useState(null);

    // Style IDs from 2GIS Dashboard
    // These IDs might be invalid or restricted to specific domains
    const lightStyle = '48677f98-c918-422f-87d2-747f3743513b';
    const darkStyle = 'c08060c5-3897-4fd0-8053-ca3d1cfdb982';

    useEffect(() => {
      let map = null;
      let isDestroyed = false;

      const initMap = () => {
        if (typeof mapgl === 'undefined') {
          setMapError('2GIS SDK not loaded');
          return;
        }
        if (!mapRef.current || isDestroyed) return;
        
        try {
          const initialCenter = (coords && coords.length > 0) 
            ? [coords[0][1], coords[0][0]] 
            : [37.6176, 55.7558];

          const mapOptions = {
            center: initialCenter,
            zoom: 13,
            key: '2af33102-26a4-4ede-8ba0-d93500a6ea06',
            lang: 'ru',
            zoomControl: false, // We'll add custom ones or use standard with better position
            rotationControl: true,
            pitch: 45, // 3D perspective
            styleOptions: {
              fontsPath: 'https://mapgl.2gis.com/api/js/v1/fonts'
            }
          };

          // Try to use custom style, but fallback if it fails
          mapOptions.style = darkMode ? darkStyle : lightStyle;

          try {
            map = new mapgl.Map(mapRef.current, mapOptions);
          } catch (e) {
            console.warn('Map creation with style failed, retrying without style', e);
            delete mapOptions.style;
            map = new mapgl.Map(mapRef.current, mapOptions);
          }

          // Add standard controls but in a better way
          new mapgl.ZoomControl(map, { position: 'topRight' });

          // Wait for both load and styleload to be safe
          map.on('load', () => {
            if (!isDestroyed) {
              setMapInstance(map);
              setIsMapReady(true);
              console.log('2GIS Map loaded via load event');
              
              // Immediate fitBounds on load if we have coords
              if (coords && coords.length > 0) {
                setTimeout(() => {
                  const lons = coords.map(p => p[1]);
                  const lats = coords.map(p => p[0]);
                  map.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], {
                    padding: { top: 80, right: 80, bottom: 80, left: 80 },
                    duration: 0 // Immediate on first load
                  });
                }, 100);
              }
            }
          });

          map.on('styleload', () => {
            if (!isDestroyed) {
              setMapInstance(map);
              setIsMapReady(true);
              console.log('2GIS Map loaded via styleload event');
            }
          });

          map.on('error', (e) => {
            console.error('2GIS Map Error:', e);
            
            // CRITICAL: If style fails, we still want to show the map!
            if (e.type === 'styleloaderror' || (e.error && e.error.message && e.error.message.includes('style'))) {
              console.warn('Style load error detected, forcing map to ready state');
              if (!isDestroyed) {
                setMapInstance(map);
                setIsMapReady(true);
              }
            }

            if (e.error && e.error.status === 403) {
              setMapError('Invalid 2GIS API Key or domain restriction');
            }
          });

        } catch (err) {
          console.error('Failed to create 2GIS Map instance:', err);
          // If the constructor failed because of the style, try again without the style
          if (err.message.includes('style')) {
            try {
              console.log('Retrying map initialization without custom style...');
              map = new mapgl.Map(mapRef.current, {
                center: (coords && coords.length > 0) ? [coords[0][1], coords[0][0]] : [37.6176, 55.7558],
                zoom: 13,
                key: '2af33102-26a4-4ede-8ba0-d93500a6ea06'
              });
              setMapInstance(map);
              setIsMapReady(true);
            } catch (retryErr) {
              setMapError(retryErr.message);
            }
          } else {
            setMapError(err.message);
          }
        }
      };

      const checkDimensions = setInterval(() => {
        if (mapRef.current && mapRef.current.clientWidth > 0 && typeof mapgl !== 'undefined') {
          clearInterval(checkDimensions);
          initMap();
        }
      }, 100);

      // Timeout to stop spinner if something goes wrong
      const timeout = setTimeout(() => {
        if (!isMapReady && !mapError && !isDestroyed) {
          console.warn('Map loading timeout - forcing ready state');
          if (map) {
            setMapInstance(map);
            setIsMapReady(true);
          } else {
            // If map didn't even start, show error
            setMapError('Map loading timeout. Please check your connection.');
          }
        }
      }, 5000); // Reduced to 5 seconds for better UX

      return () => {
        isDestroyed = true;
        clearInterval(checkDimensions);
        clearTimeout(timeout);
        if (map) {
          map.destroy();
        }
      };
    }, []);

    // Handle theme changes without re-initializing
    useEffect(() => {
      if (mapInstance && isMapReady) {
        try {
          // Use a promise-based catch if setStyleById returns a promise or emits error
          mapInstance.setStyleById(darkMode ? darkStyle : lightStyle).catch(err => {
            console.warn('Failed to update map style via setStyleById:', err);
          });
        } catch (err) {
          console.warn('Failed to update map style:', err);
        }
      }
    }, [darkMode, mapInstance, isMapReady]);

    // Handle location updates
    useEffect(() => {
      if (mapInstance && isMapReady && coords && coords.length > 0) {
        try {
          // Filter out invalid coordinates
          const validPoints = coords.filter(p => 
            p && typeof p[0] === 'number' && typeof p[1] === 'number' &&
            !isNaN(p[0]) && !isNaN(p[1])
          );

          if (validPoints.length === 0) return;

          if (validPoints.length > 1) {
            const lons = validPoints.map(p => p[1]);
            const lats = validPoints.map(p => p[0]);
            
            const minLon = Math.min(...lons);
            const minLat = Math.min(...lats);
            const maxLon = Math.max(...lons);
            const maxLat = Math.max(...lats);

            // Animate smoothly to the new route
            mapInstance.fitBounds([minLon, minLat, maxLon, maxLat], {
              padding: {
                top: 100,
                right: 100,
                bottom: 100,
                left: 100
              },
              duration: 1000, // Smooth 1s animation
              easing: 'ease-in-out'
            });

            // Set pitch and rotation for a cool 3D effect when viewing a route
            mapInstance.setPitch(45, { duration: 1000 });
          } else {
            mapInstance.setCenter([validPoints[0][1], validPoints[0][0]], { duration: 1000 });
            mapInstance.setZoom(15, { duration: 1000 });
            mapInstance.setPitch(45, { duration: 1000 });
          }
        } catch (err) {
          console.error('Failed to update map view:', err);
        }
      }
    }, [coords, mapInstance, isMapReady]);

    return (
      <MapContext.Provider value={{ mapInstance, isMapReady }}>
        <div 
          ref={mapRef} 
          className="w-full h-full relative"
          style={{ 
            minHeight: '400px', 
            height: '100%',
            background: darkMode ? '#1A1A1A' : '#F5F5F5',
            borderRadius: '32px',
            overflow: 'hidden'
          }}
        >
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 text-red-500 p-4 text-center z-50">
              Error: {mapError}
            </div>
          )}
          {!isMapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/10 z-50">
              <Loader2 className="w-8 h-8 animate-spin text-[#3B4EF5]" />
            </div>
          )}
          {isMapReady && children}
        </div>
      </MapContext.Provider>
    );
  };

  const TwoGisMarker = ({ position, isHotel, title, address }) => {
    const { mapInstance, isMapReady } = React.useContext(MapContext);

    useEffect(() => {
      if (!mapInstance || !isMapReady || !position || position.length !== 2) return;
      
      let marker = null;
      try {
        const el = document.createElement('div');
        el.className = 'custom-map-marker';
        el.innerHTML = `
          <div class="marker-container" style="position: relative;">
            ${isHotel ? '<div class="pulse-effect" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(59, 78, 245, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>' : ''}
            <div style="
              width: ${isHotel ? '44px' : '36px'};
              height: ${isHotel ? '44px' : '36px'};
              background: ${isHotel ? '#3B4EF5' : '#FFFFFF'};
              border: 3px solid #3B4EF5;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(59, 78, 245, 0.4);
              cursor: pointer;
              transition: transform 0.2s;
              position: relative;
              z-index: 2;
            ">
              <span style="font-size: ${isHotel ? '20px' : '16px'};">${isHotel ? '🏨' : '📍'}</span>
              <div class="marker-tooltip" style="
                position: absolute;
                bottom: 120%;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 8px 12px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                white-space: nowrap;
                font-family: sans-serif;
                font-weight: bold;
                font-size: 13px;
                color: #1A1A1A;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s, transform 0.2s;
              ">
                ${title}
              </div>
            </div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
          </style>
        `;

        // Add hover effect via CSS injection once or style attribute
        el.onmouseenter = () => {
          el.querySelector('.marker-tooltip').style.opacity = '1';
          el.querySelector('.marker-tooltip').style.transform = 'translateX(-50%) translateY(-5px)';
        };
        el.onmouseleave = () => {
          el.querySelector('.marker-tooltip').style.opacity = '0';
          el.querySelector('.marker-tooltip').style.transform = 'translateX(-50%) translateY(0)';
        };

        marker = new mapgl.HtmlMarker(mapInstance, {
          coordinates: [position[1], position[0]],
          html: el.innerHTML
        });
      } catch (err) {
        console.error('Error adding 2GIS marker:', err);
      }

      return () => {
        if (marker) {
          marker.destroy();
        }
      };
    }, [mapInstance, isMapReady, position]);

    return null;
  };

  const TwoGisRoute = ({ coords }) => {
    const { mapInstance, isMapReady } = React.useContext(MapContext);

    useEffect(() => {
      if (!mapInstance || !isMapReady || !coords || coords.length < 2) return;

      const validCoords = coords
        .filter(p => p && p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]))
        .map(p => [p[1], p[0]]); // Swap to [lon, lat]

      if (validCoords.length < 2) return;

      let polyline = null;
      let polylineShadow = null;
      
      try {
        // Main line with glow/smooth effect
        polyline = new mapgl.Polyline(mapInstance, {
          coordinates: validCoords,
          width: 6,
          color: '#3B4EF5',
          opacity: 1,
          style: 'solid' 
        });

        // Add arrows or direction indicator if possible via style or custom markers
        // mapgl Polyline doesn't support arrows natively in all versions, 
        // so we use a smooth solid line for a professional "navigator" look.
      } catch (err) {
        console.error('Error adding 2GIS route:', err);
      }

      return () => {
        if (polyline) polyline.destroy();
        if (polylineShadow) polylineShadow.destroy();
      };
    }, [mapInstance, isMapReady, coords]);

    return null;
  };

  const translations = {
    RU: {
      letsGo: "Поехали",
      tutorial: "Обучение",
      scrollDown: "Листайте вниз",
      howItWorks: "КАК ЭТО РАБОТАЕТ?",
          step1Title: "Опиши поездку",
      step1Desc: "Расскажи, куда хотите поехать и что любите",
      step2Title: "ИИ анализирует запрос",
      step2Desc: "Анализирует ваши предпочтения, бюджет и интересы",
      step3Title: "Получите готовый маршрут",
      step3Desc: "Маршрут по дням, местам, рекомендации и карта",
      home: "Главная",
      profile: "Профиль",
      favorites: "Избранное",
      settings: "Настройки",
      budget: "Бюджет",
      interests: "Что интересно",
      tripDates: "Даты поездки",
      whereToGo: "Куда поедем?",
      yourRoute: "ВАШ МАРШРУТ",
      backToChat: "Вернуться в чат",
      planning: "Планирую ваш маршрут...",
      online: "Онлайн",
      economy: "Эконом",
      middle: "Средний",
      premium: "Премиум",
      arch: "Архитектура",
      gastro: "Гастротур",
      nature: "Природа",
      museums: "Музеи",
      active: "Активный отдых",
      from: "С",
      to: "ПО",
      recommendedHotel: "Рекомендуемый отель",
      watchOnMap: "Смотреть на карте"
    },
    EN: {
      letsGo: "Let's Go",
      tutorial: "Tutorial",
      scrollDown: "Scroll down",
      howItWorks: "HOW IT WORKS?",
      step1Title: "Describe trip",
      step1Desc: "Tell us where you want to go and what you love",
      step2Title: "AI analyzes request",
      step2Desc: "Analyzes your preferences, budget and interests",
      step3Title: "Get ready route",
      step3Desc: "Route by days, places, recommendations and map",
      home: "Home",
      profile: "Profile",
      favorites: "Favorites",
      settings: "Settings",
      budget: "Budget",
      interests: "Interests",
      tripDates: "Trip Dates",
      whereToGo: "Where are we going?",
      yourRoute: "YOUR ROUTE",
      backToChat: "Back to chat",
      planning: "Planning your route...",
      online: "Online",
      economy: "Economy",
      middle: "Middle",
      premium: "Premium",
      arch: "Architecture",
      gastro: "Gastro-tour",
      nature: "Nature",
      museums: "Museums",
      active: "Active rest",
      from: "From",
      to: "To",
      recommendedHotel: "Recommended Hotel",
      watchOnMap: "Watch on Map"
    }
  };

  const ThemeToggle = ({ darkMode, toggle }) => (
    <button 
      onClick={toggle}
      className={`p-2 rounded-full transition-all duration-300 ${
        darkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {darkMode ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );

  const SidebarItem = ({ icon, label, active, darkMode, onClick }) => (
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

  const IOSDatePicker = React.forwardRef(({ startDate, endDate, onChange, darkMode }, ref) => {
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
      return day === 0 ? 6 : day - 1; // Adjust for Monday start
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
        // Start new range
        onChange(dateStr, null);
      } else {
        // Set end date
        if (dateStr < startDate) {
          // If selected date is before start date, make it the new start date
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

      // Empty slots for start of month
      for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
      }

      // Days of the month
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

  const ChatMessage = ({ text, time, isUser, darkMode, actions }) => (
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

  const Tag = ({ label, icon, active, darkMode, onClick }) => (
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

  const HotelCard = ({ title, address, rating, price, image, website, darkMode, lang }) => (
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

  const RouteItem = ({ number, title, address, category, rating, hours, image, isLast, darkMode, isPast }) => (
    <div className={`flex gap-4 md:gap-6 mb-10 group relative transition-all duration-500 ${isPast ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Vertical Line */}
      {!isLast && (
        <div 
          className="absolute left-[20px] md:left-[24px] top-[40px] md:top-[48px] bottom-[-40px] w-[2px]"
          style={{ backgroundColor: isPast ? '#D1D5DB' : '#3B4EF5', opacity: 0.2 }}
        ></div>
      )}

      {/* Number Circle */}
      <div className={`w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center text-white text-[16px] md:text-[20px] font-black shrink-0 z-10 transition-all ${
        isPast ? 'bg-gray-200 text-gray-400' : 'bg-[#3B4EF5] shadow-lg shadow-blue-500/30'
      }`}>
        {isPast ? (
          <X size={20} strokeWidth={3} />
        ) : (
          number
        )}
      </div>

      {/* Card */}
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
      { label: 'arch', icon: '/arch_icon.png' },
      { label: 'gastro', icon: '/gastro_icon.png' },
      { label: 'nature', icon: '/Без музеев.png' },
      { label: 'museums', icon: '/arch_icon.png' },
      { label: 'active', icon: '/4 дня.png' }
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

    // Log coordinates for debugging
    useEffect(() => {
      console.log('Route updated, total points:', allCoords.length);
      if (allCoords.length > 0) {
        console.log('First point:', allCoords[0]);
      }
    }, [allCoords]);

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

      // Add user message
      if (typeof forcedPrompt !== 'string') {
        const newUserMsg = {
          text: userText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isUser: true
        };
        setMessages(prev => [...prev, newUserMsg]);
      }

      try {
        const missingInfo = [];
        if (!startDate || !endDate) missingInfo.push('даты поездки');
        if (!selectedBudget) missingInfo.push('бюджет');
        if (selectedInterests.length === 0) missingInfo.push('интересы');

        const contextInfo = `
Контекст (фильтры):
- Даты: ${startDate && endDate ? `с ${startDate} по ${endDate}` : 'не указаны'}
- Бюджет: ${selectedBudget || 'не выбран'}
- Интересы: ${selectedInterests.length > 0 ? selectedInterests.join(', ') : 'не указаны'}

Запрос пользователя: ${userText}
(Используй историю сообщений выше, чтобы понять, какой город откуда и куда)`;
        
        // Prepare message history for GigaChat (last 6 messages for context)
        const history = messages.slice(-5).map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

        // Add the current request with context
        history.push({ role: 'user', content: contextInfo });

        const data = await generateRoute(history);
        
        // Add AI message
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

        // If we have a route, add confirmation actions
        if (data.routeItems && data.routeItems.length > 0) {
          aiMsg.text += "\n\nВсе ли верно в этом маршруте или хотите что-то изменить?";
          aiMsg.actions = [
            { label: "✅ Все идеально!", primary: true, onClick: () => handleAction('yes') },
            { label: "🔄 Нужно поправить", primary: false, onClick: () => handleAction('change') }
          ];
          setRouteItems(data.routeItems);
          setLastAIResponse(null); // Clear clarification buttons if we got a route
          setIsChatFullscreen(false); // Auto-exit fullscreen to show the route
        } else {
          // Actions for clarification are now handled by lastAIResponse UI
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
            {/* Hero Section */}
            <div className="min-h-screen flex flex-col items-center justify-center relative shrink-0 py-20">
              {/* Background Decorative Compasses */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute -top-10 -right-10 w-[200px] h-[200px] md:w-[400px] md:h-[400px] pointer-events-none"
              >
                <img src="/sidebar/logo_new.png" alt="" className="w-full h-full object-contain text-[#3B4EF5]" style={{ filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' }} />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute -bottom-10 -left-10 w-[200px] h-[200px] md:w-[400px] md:h-[400px] pointer-events-none"
              >
                <img src="/sidebar/logo_new.png" alt="" className="w-full h-full object-contain text-[#3B4EF5]" style={{ filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' }} />
              </motion.div>

              {/* Logo Image */}
              <div className="flex items-center justify-center mb-10 md:mb-16 select-none w-full px-6 md:px-10 shrink-0">
                <img 
                  src="/тур_код_1.png" 
                  alt="ТурКод" 
                  className="w-full max-w-[280px] sm:max-w-[500px] md:max-w-[800px] lg:max-w-[1164px] h-auto object-contain"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full max-w-[280px] sm:max-w-none px-6 justify-center items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('list')}
                  className="flex items-center px-6 sm:px-8 py-3.5 sm:py-4 bg-[#4255ff] text-white rounded-[14px] sm:rounded-[18px] shadow-[0_15px_35px_rgba(66,85,255,0.25)] hover:bg-[#3b4ce6] transition-all w-full sm:w-auto sm:min-w-[200px] justify-center"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      <img src="/основа/Vector 2.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
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
                      <img src="/основа/book_spread_outline_28.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
                    </div>
                    <span className="text-[16px] sm:text-[22px] font-bold">{t('tutorial')}</span>
                  </div>
                </motion.button>
              </div>

              {/* Scroll Down Hint */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center gap-2 opacity-30"
              >
                <span className="text-[12px] font-bold uppercase tracking-widest text-center w-full">{t('scrollDown')}</span>
                <ChevronLeft size={24} className="-rotate-90" />
              </motion.div>
            </div>

            {/* How It Works Section */}
            <div id="how-it-works" className="min-h-screen relative flex flex-col items-center justify-start bg-white py-12 sm:py-20 px-4 sm:px-6">
              {/* Background Decorative Compass for Section */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[1000px] sm:h-[1000px] opacity-[0.03] pointer-events-none">
                <img src="/sidebar/logo_new.png" alt="" className="w-full h-full object-contain" style={{ filter: 'invert(24%) sepia(89%) saturate(6312%) hue-rotate(233deg) brightness(96%) contrast(104%)' }} />
              </div>

              {/* Background Pattern - BLUE TEXT ON WHITE BG */}
              <div 
                className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-around py-4 opacity-[0.03] sm:opacity-[0.05]"
                style={{ zIndex: 0 }}
              >
                {Array.from({ length: 22 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="flex whitespace-nowrap justify-center gap-4 sm:gap-8 font-oswald text-[24px] sm:text-[48px] uppercase tracking-tighter"
                    style={{ 
                      color: '#3B4EF5',
                      transform: i % 2 === 0 ? 'translateX(0)' : 'translateX(-30px)'
                    }}
                  >
                    {Array.from({ length: 10 }).map((_, j) => (
                      <span key={j}>{t('howItWorks')}</span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className="relative z-10 w-full max-w-[1500px] flex flex-col items-center">
                <h2 className="text-[32px] sm:text-[40px] md:text-[80px] font-black mb-12 sm:mb-20 md:mb-32 text-center tracking-tighter text-[#3B4EF5] font-oswald uppercase">
                  {t('howItWorks')}
                </h2>

                <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 w-full mb-12 sm:mb-20 md:mb-32">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center w-full max-w-[450px]">
                    <div className="relative overflow-hidden group w-full h-[200px] sm:h-[240px]" style={{ borderRadius: '32px' }}>
                      <div 
                        className="bg-[#3B4EF5] shadow-[0_20px_60px_rgba(59,78,245,0.15)] flex flex-col items-start text-left w-full h-full transition-all duration-500 group-hover:scale-[1.02]"
                        style={{ 
                          paddingTop: '30px',
                          paddingRight: '30px',
                          paddingBottom: '25px',
                          paddingLeft: '30px',
                          position: 'relative'
                        }}
                      >
                        {/* Large Background Number */}
                        <div className="absolute -right-4 -bottom-6 sm:-right-6 sm:-bottom-10 opacity-[0.12] text-white pointer-events-none font-oswald font-black text-[180px] sm:text-[280px] leading-none select-none">
                          1
                        </div>
                        
                        <div className="relative z-10">
                          <h3 className="text-white text-[24px] sm:text-[32px] font-bold mb-2 sm:mb-4 leading-tight">{t('step1Title')}</h3>
                          <p className="text-white/80 text-[15px] sm:text-[18px] leading-relaxed max-w-[280px] sm:max-w-[340px]">{t('step1Desc')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow 1 */}
                  <div className="hidden lg:block shrink-0">
                    <img 
                      src="/arrow_right_outline_28.png" 
                      alt="" 
                      className="object-contain" 
                      style={{ width: '80px', height: '80px', filter: 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%)', opacity: 0.2 }} 
                    />
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center w-full max-w-[450px]">
                    <div className="relative overflow-hidden group w-full h-[200px] sm:h-[240px]" style={{ borderRadius: '32px' }}>
                      <div 
                        className="bg-[#3B4EF5] shadow-[0_20px_60px_rgba(59,78,245,0.15)] flex flex-col items-start text-left w-full h-full transition-all duration-500 group-hover:scale-[1.02]"
                        style={{ 
                          paddingTop: '30px',
                          paddingRight: '30px',
                          paddingBottom: '25px',
                          paddingLeft: '30px',
                          position: 'relative'
                        }}
                      >
                        {/* Large Background Number */}
                        <div className="absolute -right-4 -bottom-6 sm:-right-6 sm:-bottom-10 opacity-[0.12] text-white pointer-events-none font-oswald font-black text-[180px] sm:text-[280px] leading-none select-none">
                          2
                        </div>

                        <div className="relative z-10">
                          <h3 className="text-white text-[24px] sm:text-[32px] font-bold mb-2 sm:mb-4 leading-tight">{t('step2Title')}</h3>
                          <p className="text-white/80 text-[15px] sm:text-[18px] leading-relaxed max-w-[280px] sm:max-w-[340px]">{t('step2Desc')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow 2 */}
                  <div className="hidden lg:block shrink-0">
                    <img 
                      src="/arrow_right_outline_28.png" 
                      alt="" 
                      className="object-contain" 
                      style={{ width: '80px', height: '80px', filter: 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%)', opacity: 0.2 }} 
                    />
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center w-full max-w-[450px]">
                    <div className="relative overflow-hidden group w-full h-[200px] sm:h-[240px]" style={{ borderRadius: '32px' }}>
                      <div 
                        className="bg-[#3B4EF5] shadow-[0_20px_60px_rgba(59,78,245,0.15)] flex flex-col items-start text-left w-full h-full transition-all duration-500 group-hover:scale-[1.02]"
                        style={{ 
                          paddingTop: '30px',
                          paddingRight: '30px',
                          paddingBottom: '25px',
                          paddingLeft: '30px',
                          position: 'relative'
                        }}
                      >
                        {/* Large Background Number */}
                        <div className="absolute -right-4 -bottom-6 sm:-right-6 sm:-bottom-10 opacity-[0.12] text-white pointer-events-none font-oswald font-black text-[180px] sm:text-[280px] leading-none select-none">
                          3
                        </div>

                        <div className="relative z-10">
                          <h3 className="text-white text-[24px] sm:text-[32px] font-bold mb-2 sm:mb-4 leading-tight">{t('step3Title')}</h3>
                          <p className="text-white/80 text-[15px] sm:text-[18px] leading-relaxed max-w-[280px] sm:max-w-[340px]">{t('step3Desc')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('list')}
                  className="flex items-center px-8 sm:px-12 py-4 sm:py-5 bg-[#3B4EF5] text-white rounded-[20px] sm:rounded-[24px] shadow-[0_20px_50px_rgba(59,78,245,0.3)] hover:bg-[#2e3ed9] transition-all justify-center group mb-10"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    <span className="text-[18px] sm:text-[24px] font-black uppercase tracking-tight">{t('letsGo')}</span>
                    <div className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center transition-transform group-hover:translate-x-2">
                      <img src="/основа/Vector 2.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
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
          {/* Sidebar - Desktop Only */}
          <div className={`hidden lg:flex w-[280px] flex-col p-8 shrink-0 relative transition-colors duration-300 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-[#3B4EF5]'}`}>
            {/* Logo Container */}
            <div 
              className="absolute flex items-center justify-center select-none w-full" 
              style={{ 
                top: '40px', 
                left: '0',
                opacity: 1
              }}
            >
              <img 
                src="/logo_sidebar_new.png" 
                alt="ТурКод" 
                style={{ width: '160px', height: 'auto' }}
                className="object-contain brightness-0 invert opacity-100"
              />
            </div>

            {/* Spacer for Logo */}
            <div className="h-[96px] mb-10"></div>
            
            <nav className="flex flex-col gap-4 items-center">
              <SidebarItem 
                icon="/sidebar/home.png" 
                label={t('home')} 
                active={viewMode === 'landing'} 
                darkMode={darkMode} 
                onClick={() => setViewMode('landing')}
              />
              <SidebarItem icon="/sidebar/profile_fill.png" label={t('profile')} darkMode={darkMode} />
              <SidebarItem icon="/sidebar/mdi_heart.png" label={t('favorites')} darkMode={darkMode} />
              <SidebarItem icon="/sidebar/mdi_gear.png" label={t('settings')} darkMode={darkMode} />
            </nav>
            
            <div className="mt-auto flex items-center justify-end w-full px-4 mb-4 gap-7">
              <ThemeToggle darkMode={darkMode} toggle={toggleDarkMode} />
              <button 
                onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}
                className="text-[20px] font-bold text-white opacity-90 hover:opacity-100 transition-opacity w-8"
              >
                {lang}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className={`flex-1 flex flex-col p-4 md:p-6 lg:p-12 gap-4 md:gap-8 max-w-[1440px] mx-auto w-full transition-colors duration-300 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-white'} h-screen overflow-hidden`}>
            


          <AnimatePresence mode="wait">
            {viewMode === 'list' ? (
              <motion.div 
                key="chat-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col lg:flex-row gap-8 lg:gap-12 w-full overflow-y-auto lg:overflow-hidden pb-[80px] md:pb-0"
              >
                {/* Chat Section */}
                <div className={`${isChatFullscreen ? 'flex-1 max-w-[1200px] mx-auto' : 'flex-none lg:flex-1'} flex flex-col w-full min-h-0 transition-all duration-500`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 md:mb-10 shrink-0">
                    <div className="flex flex-col gap-1">
                      <div className="mb-1">
                        <img 
                          src="/настройки/Group 11.png" 
                          alt="ТурКод" 
                          className="h-[35px] md:h-[45px] w-auto object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[12px] md:text-[14px] text-[#4BB37E] font-medium">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#4BB37E] rounded-full"></span>
                        {t('online')}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex items-center gap-4 md:hidden">
                        <button 
                          onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}
                          className={`text-[16px] font-bold transition-opacity ${darkMode ? 'text-white' : 'text-[#3B4EF5]'}`}
                        >
                          {lang}
                        </button>
                        <ThemeToggle darkMode={darkMode} toggle={toggleDarkMode} />
                      </div>
                      <img src="/Union.png" alt="chat" style={{ width: '20px', height: '18px' }} className={`cursor-pointer opacity-70 hover:opacity-100 transition-opacity object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                      <button 
                        onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Maximize2 
                          className={`w-5 h-5 md:w-6 md:h-6 cursor-pointer opacity-70 hover:opacity-100 transition-all ${darkMode ? 'text-white' : 'text-gray-900'} ${isChatFullscreen ? 'rotate-180 scale-110' : ''}`} 
                        />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto mb-4 space-y-2 relative scrollbar-hide min-h-0" 
                    id="chat-messages"
                  >
                    {messages.map((msg, i) => (
                      <ChatMessage key={i} {...msg} darkMode={darkMode} />
                    ))}
                    
                    {lastAIResponse && !isLoading && (
                      <div className="flex flex-col gap-3 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="flex flex-wrap gap-2.5 justify-start px-4">
                          {/* Date Range Button - Pill Style */}
                          <motion.button
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              document.querySelector('.trip-dates-section')?.scrollIntoView({ behavior: 'smooth' });
                              setTimeout(() => datePickerRef.current?.open(), 300);
                            }}
                            className={`relative group px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-500 shadow-lg overflow-hidden ${
                              startDate && endDate 
                                ? 'bg-[#4BB37E] text-white shadow-[#4BB37E]/20' 
                                : darkMode 
                                  ? 'bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-black/20' 
                                  : 'bg-[#F0F2F5] border border-gray-200/50 text-gray-700 shadow-blue-500/5 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 relative z-10">
                              <Calendar size={13} className={startDate && endDate ? 'text-white' : 'text-[#3B4EF5]'} />
                              <span className="tracking-tight">
                                {startDate && endDate ? `${new Date(startDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})} — ${new Date(endDate).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})}` : 'Даты поездки'}
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                          </motion.button>
                          
                          {/* Budget Button - Pill Style */}
                          <div className="relative">
                            <motion.button
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setIsChatBudgetOpen(!isChatBudgetOpen)}
                              className={`relative group px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-500 shadow-xl ${
                                selectedBudget
                                  ? 'bg-[#3B4EF5] text-white shadow-[#3B4EF5]/30'
                                  : darkMode 
                                    ? 'bg-white/10 backdrop-blur-md border border-white/20 text-white' 
                                    : 'bg-[#F0F2F5] border border-gray-200/50 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 relative z-10">
                                <span className="text-[13px]">💰</span>
                                <span className="tracking-tight">{selectedBudget ? t(selectedBudget) : 'Бюджет'}</span>
                              </div>
                            </motion.button>
                            
                            <AnimatePresence>
                              {isChatBudgetOpen && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                  className={`absolute bottom-full mb-3 left-0 z-[210] p-1 rounded-[24px] shadow-2xl border backdrop-blur-2xl flex gap-1 ${
                                    darkMode ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-100'
                                  }`}
                                >
                                  {budgetOptions.map((opt) => (
                                    <button
                                      key={opt.label}
                                      onClick={() => {
                                        setSelectedBudget(opt.label);
                                        setIsChatBudgetOpen(false);
                                      }}
                                      className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap ${
                                        selectedBudget === opt.label
                                          ? 'bg-[#3B4EF5] text-white shadow-lg shadow-blue-500/20'
                                          : darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {opt.icon} {t(opt.label)}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Interests Button - Pill Style */}
                          <div className="relative">
                            <motion.button
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setIsChatInterestsOpen(!isChatInterestsOpen)}
                              className={`relative group px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-500 shadow-xl ${
                                selectedInterests.length > 0
                                  ? 'bg-[#3B4EF5] text-white shadow-[#3B4EF5]/30'
                                  : darkMode 
                                    ? 'bg-white/10 backdrop-blur-md border border-white/20 text-white' 
                                    : 'bg-[#F0F2F5] border border-gray-200/50 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 relative z-10">
                                <span className="text-[13px]">🎯</span>
                                <span className="tracking-tight">{selectedInterests.length > 0 ? `${selectedInterests.length} интереса` : 'Интересы'}</span>
                              </div>
                            </motion.button>

                            <AnimatePresence>
                              {isChatInterestsOpen && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                  className={`absolute bottom-full mb-3 left-0 z-[210] p-4 rounded-[28px] shadow-2xl border backdrop-blur-2xl flex flex-col gap-1.5 min-w-[240px] ${
                                    darkMode ? 'bg-black/80 border-white/10' : 'bg-white/90 border-gray-100'
                                  }`}
                                >
                                  <h4 className={`text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Что интересно?</h4>
                                  <div className="grid grid-cols-1 gap-1">
                                    {interestOptions.map((opt) => (
                                      <button
                                        key={opt.label}
                                        onClick={() => toggleInterest(opt.label)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${
                                          selectedInterests.includes(opt.label)
                                            ? 'bg-[#3B4EF5] text-white shadow-md'
                                            : darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {opt.icon && <img src={opt.icon} alt="" className={`w-4 h-4 object-contain ${selectedInterests.includes(opt.label) ? 'brightness-0 invert' : 'opacity-70'}`} />}
                                          <span>{t(opt.label)}</span>
                                        </div>
                                        {selectedInterests.includes(opt.label) && <CheckCircle2 size={14} strokeWidth={3} />}
                                      </button>
                                    ))}
                                  </div>
                                  <button 
                                    onClick={() => setIsChatInterestsOpen(false)}
                                    className="mt-2 w-full py-2.5 bg-[#3B4EF5] text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                                  >
                                    Сохранить
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Go Button - Special Glow Style */}
                          <motion.button
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setIsChatBudgetOpen(false);
                              setIsChatInterestsOpen(false);
                              handleSendMessageRef.current(lastUserPrompt);
                            }}
                            className="relative group px-6 py-1.5 rounded-full text-[13px] font-black bg-[#3B4EF5] text-white shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-500 overflow-hidden"
                          >
                            <div className="flex items-center gap-2 relative z-10">
                              <span className="text-[16px] group-hover:rotate-12 transition-transform duration-500">🚀</span>
                              <span className="uppercase tracking-tighter">Поехали</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#3B4EF5] via-[#6374ff] to-[#3B4EF5] bg-[length:200%_100%] animate-gradient"></div>
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </motion.button>
                        </div>
                      </div>
                    )}
                    
    {isLoading && (
                        <div className="flex justify-start mb-4">
                          <div className={`py-3 px-5 rounded-[20px] rounded-tl-none ${darkMode ? 'bg-[#262626] text-white/70' : 'bg-gray-50 text-gray-500 shadow-sm border border-[#F0F2F5]'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[14px] font-medium italic">{t('planning')}</span>
                              <motion.span 
                                animate={{ opacity: [0, 1, 0] }} 
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >.</motion.span>
                              <motion.span 
                                animate={{ opacity: [0, 1, 0] }} 
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                              >.</motion.span>
                              <motion.span 
                                animate={{ opacity: [0, 1, 0] }} 
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                              >.</motion.span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Input Section */}
                  <div className="flex flex-col gap-2 md:gap-3 mb-2 shrink-0 relative z-[200]">
                    {/* Budget Selection */}
                    <div className="flex flex-col gap-1 budget-section">
                      <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-wider opacity-60 ${darkMode ? 'text-white' : 'text-gray-600'}`}>{t('budget')}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {budgetOptions.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => setSelectedBudget(opt.label)}
                            className={`flex items-center gap-1.5 px-2.5 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border transition-all duration-300 ${
                              selectedBudget === opt.label
                                ? 'bg-[#3B4EF5] border-[#3B4EF5] text-white shadow-lg shadow-blue-500/20 scale-105'
                                : darkMode
                                  ? 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#3B4EF5]/50'
                            }`}
                          >
                            <span className="text-[11px] md:text-[13px]">{opt.icon}</span>
                            <span className="text-[11px] md:text-[13px] font-bold">{t(opt.label)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interests Selection */}
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-wider opacity-60 ${darkMode ? 'text-white' : 'text-gray-600'}`}>{t('interests')}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {interestOptions.map((opt) => (
                          <Tag 
                            key={opt.label}
                            label={t(opt.label)} 
                            icon={opt.icon} 
                            active={selectedInterests.includes(opt.label)} 
                            darkMode={darkMode}
                            onClick={() => toggleInterest(opt.label)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Date Selection */}
                    <div className="flex flex-col gap-1.5 trip-dates-section">
                      <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-widest opacity-50 ${darkMode ? 'text-white' : 'text-gray-600'}`}>{t('tripDates')}</span>
                      <div className="w-full">
                        <IOSDatePicker 
                          ref={datePickerRef}
                          startDate={startDate} 
                          endDate={endDate} 
                          onChange={(start, end) => {
                            setStartDate(start);
                            setEndDate(end);
                          }} 
                          darkMode={darkMode} 
                        />
                      </div>
                    </div>

                    {/* Input Box */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('whereToGo')}
                        className={`w-full py-2.5 md:py-4 px-4 md:px-6 rounded-[12px] md:rounded-[18px] border focus:outline-none focus:ring-2 text-[13px] md:text-[16px] shadow-sm transition-all ${
                          darkMode 
                            ? 'bg-[#262626] border-white/10 text-white placeholder:text-gray-500 focus:ring-white/10 focus:border-white/30' 
                            : 'bg-white border-[#3B4EF5]/30 text-gray-900 placeholder:text-blue-300 focus:ring-[#3B4EF5]/20 focus:border-[#3B4EF5]'
                        }`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isLoading}
                      />
                      <button 
                        onClick={() => handleSendMessage()}
                        disabled={isLoading}
                        className={`absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all hover:opacity-80 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '2px solid #3B4EF5',
                          borderRadius: '12px',
                          padding: '4px'
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="w-full h-full animate-spin text-[#3B4EF5]" />
                        ) : (
                          <Send className="w-full h-full text-[#3B4EF5]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Route Section */}
              <div className={`${isChatFullscreen ? 'hidden' : 'w-full flex-none lg:flex-1 lg:max-w-[600px]'} p-4 md:p-6 lg:overflow-y-auto transition-all duration-500 ${darkMode ? 'bg-[#1A1A1A]' : 'bg-white'} border-t lg:border-t-0 ${darkMode ? 'border-white/10' : 'border-gray-100'} mt-10 lg:mt-0`}>
                <h2 className={`text-[28px] md:text-[40px] font-bold mb-6 md:mb-10 flex items-baseline gap-3 font-oswald uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('yourRoute')}
                </h2>

                <div className="flex flex-col">
                  {routeItems.map((dayGroup, groupIdx) => (
                    <div key={groupIdx} className={groupIdx === routeItems.length - 1 ? "" : "mb-6"}>
                      <h3 className={`text-[18px] md:text-[20px] font-bold mb-4 md:mb-6 ml-10 md:ml-[72px] italic ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dayGroup.day}</h3>
                        
                        {/* Hotel Suggestion for the Day */}
                        {dayGroup.hotel && (
                          <div className="ml-10 md:ml-[72px]">
                            <HotelCard {...dayGroup.hotel} darkMode={darkMode} lang={lang} />
                          </div>
                        )}

                        <div className="flex flex-col">
                          {dayGroup.items.map((item, i) => {
                            const isOverallLast = groupIdx === routeItems.length - 1 && i === dayGroup.items.length - 1;
                            // Убираем автоматическое зачеркивание всех предыдущих дней
                            const isPast = false; 
                            return (
                              <RouteItem 
                                key={i} 
                                {...item} 
                                isLast={isOverallLast} 
                                darkMode={darkMode}
                                isPast={isPast}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {/* Map Trigger Section */}
                    <div className="relative flex gap-6 mt-4 mb-20 ml-0">
                      {/* Line connecting from last item */}
                      <div 
                        className="absolute left-[20px] md:left-[24px] top-[-40px] h-[40px] w-[2px]"
                        style={{ backgroundColor: '#3B4EF5', opacity: 0.2 }}
                      ></div>

                      <motion.button 
                        onClick={toggleViewMode}
                        className={`w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                          darkMode 
                            ? 'bg-[#262626] text-[#3B4EF5] hover:bg-[#2d2d2d]' 
                            : 'bg-white text-[#3B4EF5] border border-[#3B4EF5]/10 hover:border-[#3B4EF5]/30 shadow-md'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ChevronLeft size={20} className="rotate-[270deg]" />
                      </motion.button>
                      <span className={`text-[14px] md:text-[16px] font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('watchOnMap')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="map-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 w-full h-full lg:h-[calc(100vh-100px)]"
              >
                {/* Left Side: Route List */}
                <div className={`w-full lg:w-[600px] p-4 md:p-8 overflow-y-auto rounded-[24px] md:rounded-[32px] transition-colors duration-300 shadow-sm ${darkMode ? 'bg-[#262626]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <button 
                      onClick={toggleViewMode}
                      className="flex items-center gap-2 text-[#3B4EF5] font-bold hover:opacity-80 transition-opacity text-[14px] md:text-[16px]"
                    >
                      <ChevronLeft size={20} />
                      {t('backToChat')}
                    </button>
                  </div>
                  
                  <h2 className={`text-[28px] md:text-[36px] font-bold mb-6 md:mb-8 font-oswald uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('yourRoute')}
                  </h2>

                  <div className="flex flex-col">
                    {routeItems.map((dayGroup, groupIdx) => (
                      <div key={groupIdx} className={groupIdx === routeItems.length - 1 ? "" : "mb-6 md:mb-8"}>
                        <h3 className={`text-[18px] md:text-[20px] font-bold mb-4 md:mb-6 ml-10 md:ml-[72px] italic ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dayGroup.day}</h3>
                        
                        {dayGroup.hotel && (
                          <div className="ml-10 md:ml-[72px]">
                            <HotelCard {...dayGroup.hotel} darkMode={darkMode} lang={lang} />
                          </div>
                        )}

                        <div className="flex flex-col">
                          {dayGroup.items.map((item, i) => {
                            const isOverallLast = groupIdx === routeItems.length - 1 && i === dayGroup.items.length - 1;
                            const isPast = false; // Убираем зачеркивание и здесь
                            return (
                              <RouteItem 
                                key={i} 
                                {...item} 
                                isLast={isOverallLast} 
                                darkMode={darkMode}
                                isPast={isPast}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Map */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1 min-h-[400px] lg:min-h-0 rounded-[24px] md:rounded-[32px] overflow-hidden border-2 border-[#3B4EF5]/20 shadow-2xl relative z-10"
                >
                  <TwoGisContainer darkMode={darkMode} coords={allCoords}>
                    <TwoGisRoute coords={allCoords} />
                    
                    {/* Hotel Markers */}
                    {routeItems.map(day => day.hotel).filter(Boolean).map((hotel, idx) => (
                      <TwoGisMarker 
                        key={`hotel-${idx}`} 
                        position={hotel.coords} 
                        isHotel={true}
                        title={hotel.title}
                        address={hotel.address}
                      />
                    ))}

                    {routeItems.flatMap(day => day.items).map((item, idx) => (
                      <TwoGisMarker 
                        key={`item-${idx}`} 
                        position={item.coords} 
                        title={item.title}
                        address={item.address}
                      />
                    ))}
                  </TwoGisContainer>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Bottom Tabbar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1000] px-4 pb-4">
            <div className={`flex items-center justify-between p-2 rounded-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl border ${
              darkMode ? 'bg-[#1A1A1A]/80 border-white/10' : 'bg-white/80 border-gray-100'
            }`}>
              <button 
                onClick={() => setViewMode('landing')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all ${
                  viewMode === 'landing' ? 'bg-[#3B4EF5] text-white' : darkMode ? 'text-gray-400' : 'text-gray-400'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center mx-auto">
                  <img src="/sidebar/home.png" alt="" className={`w-6 h-6 object-contain ${viewMode === 'landing' ? 'brightness-0 invert' : 'opacity-50'}`} />
                </div>
                <span className="text-[10px] font-bold text-center w-full leading-none">{t('home')}</span>
              </button>

              <button 
                onClick={() => setViewMode('list')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all ${
                  viewMode === 'list' || viewMode === 'map' ? 'bg-[#3B4EF5] text-white' : darkMode ? 'text-gray-400' : 'text-gray-400'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center mx-auto">
                  <img src="/Union.png" alt="" className={`w-6 h-6 object-contain ${viewMode === 'list' || viewMode === 'map' ? 'brightness-0 invert' : 'opacity-50'}`} />
                </div>
                <span className="text-[10px] font-bold text-center w-full leading-none">Чат</span>
              </button>

              <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 text-gray-400">
                <div className="w-6 h-6 flex items-center justify-center mx-auto">
                  <img src="/sidebar/mdi_heart.png" alt="" className="w-6 h-6 object-contain opacity-50" />
                </div>
                <span className="text-[10px] font-bold text-center w-full leading-none">{t('favorites')}</span>
              </button>

              <button className="flex-1 flex flex-col items-center justify-center gap-1 p-2 text-gray-400">
                <div className="w-6 h-6 flex items-center justify-center mx-auto">
                  <img src="/sidebar/profile_fill.png" alt="" className="w-6 h-6 object-contain opacity-50" />
                </div>
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
