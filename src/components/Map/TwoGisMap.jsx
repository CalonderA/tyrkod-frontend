import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const MapContext = React.createContext(null);

export const TwoGisContainer = ({ children, darkMode, coords }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

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
          zoomControl: false,
          rotationControl: true,
          pitch: 45,
          styleOptions: {
            fontsPath: 'https://mapgl.2gis.com/api/js/v1/fonts'
          }
        };

        mapOptions.style = darkMode ? darkStyle : lightStyle;

        try {
          map = new mapgl.Map(mapRef.current, mapOptions);
        } catch (e) {
          console.warn('Map creation with style failed, retrying without style', e);
          delete mapOptions.style;
          map = new mapgl.Map(mapRef.current, mapOptions);
        }

        new mapgl.ZoomControl(map, { position: 'topRight' });

        map.on('load', () => {
          if (!isDestroyed) {
            setMapInstance(map);
            setIsMapReady(true);
            if (coords && coords.length > 0) {
              setTimeout(() => {
                const lons = coords.map(p => p[1]);
                const lats = coords.map(p => p[0]);
                map.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], {
                  padding: { top: 80, right: 80, bottom: 80, left: 80 },
                  duration: 0
                });
              }, 100);
            }
          }
        });

        map.on('styleload', () => {
          if (!isDestroyed) {
            setMapInstance(map);
            setIsMapReady(true);
          }
        });

        map.on('error', (e) => {
          if (e.type === 'styleloaderror' || (e.error && e.error.message && e.error.message.includes('style'))) {
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
        if (err.message.includes('style')) {
          try {
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

    const timeout = setTimeout(() => {
      if (!isMapReady && !mapError && !isDestroyed) {
        if (map) {
          setMapInstance(map);
          setIsMapReady(true);
        } else {
          setMapError('Map loading timeout. Please check your connection.');
        }
      }
    }, 5000);

    return () => {
      isDestroyed = true;
      clearInterval(checkDimensions);
      clearTimeout(timeout);
      if (map) {
        map.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstance && isMapReady) {
      try {
        mapInstance.setStyleById(darkMode ? darkStyle : lightStyle).catch(err => {
          console.warn('Failed to update map style via setStyleById:', err);
        });
      } catch (err) {
        console.warn('Failed to update map style:', err);
      }
    }
  }, [darkMode, mapInstance, isMapReady]);

  useEffect(() => {
    if (mapInstance && isMapReady && coords && coords.length > 0) {
      try {
        const validPoints = coords.filter(p => 
          p && typeof p[0] === 'number' && typeof p[1] === 'number' &&
          !isNaN(p[0]) && !isNaN(p[1])
        );

        if (validPoints.length === 0) return;

        if (validPoints.length > 1) {
          const lons = validPoints.map(p => p[1]);
          const lats = validPoints.map(p => p[0]);
          
          mapInstance.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], {
            padding: { top: 100, right: 100, bottom: 100, left: 100 },
            duration: 1000,
            easing: 'ease-in-out'
          });

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

export const TwoGisMarker = ({ position, isHotel, title, address }) => {
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

export const TwoGisRoute = ({ coords }) => {
  const { mapInstance, isMapReady } = React.useContext(MapContext);

  useEffect(() => {
    if (!mapInstance || !isMapReady || !coords || coords.length < 2) return;

    const validCoords = coords
      .filter(p => p && p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]))
      .map(p => [p[1], p[0]]);

    if (validCoords.length < 2) return;

    let polyline = null;
    
    try {
      polyline = new mapgl.Polyline(mapInstance, {
        coordinates: validCoords,
        width: 6,
        color: '#3B4EF5',
        opacity: 1,
        style: 'solid' 
      });
    } catch (err) {
      console.error('Error adding 2GIS route:', err);
    }

    return () => {
      if (polyline) polyline.destroy();
    };
  }, [mapInstance, isMapReady, coords]);

  return null;
};
