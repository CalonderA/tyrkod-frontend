const AUTH_KEY = 'MDE5YTgxNjItMjljNy03YzJhLTljZjktYzAwZDU2NTdkYTAyOjQ1ZWVmNzBlLTc5OGUtNDk4NC04ZGJhLTBkY2FiMTMyOTJlOA=='.trim();

let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }
  const rqUid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  try {
    const response = await fetch('/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUid,
        'Authorization': `Basic ${AUTH_KEY}`
      },
      body: new URLSearchParams({ 'scope': 'GIGACHAT_API_PERS' })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Нет текста ошибки');
      console.error('Auth Error Response:', errorText);
      throw new Error(`Сервер авторизации ответил ошибкой ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiresAt = data.expires_at;
    return accessToken;
  } catch (e) {
    throw new Error(`Ошибка авторизации: ${e.message}`);
  }
}

export async function generateRoute(messages) {
  try {
    const token = await getAccessToken();
    const systemPrompt = `Ты — экспертный travel-гид ТурКод. ОТВЕЧАЙ ТОЛЬКО JSON.
ПРАВИЛО УТОЧНЕНИЯ: Если пользователь НЕ указал:
1. Конкретный город назначения (куда именно едем)
2. Город отправления (откуда едем)
3. Даты поездки
4. Бюджет (эконом, средний, премиум)
5. Интересы (что именно он хочет увидеть)
Ты ОБЯЗАН сначала вежливо спросить эти данные в "chatResponse", прежде чем строить маршрут. 

ЛОГИКА МАРШРУТА: 
- Если пользователь пишет название города (например "Вязьма") без уточнений, считай это городом назначения.
- Если ты спросил "откуда выезжаем?" и пользователь ответил названием города (например "Смоленск"), запомни это как город отправления. Не спрашивай "откуда в Смоленск?", если ты уже знаешь, что цель — Вязьма.
- Всегда строй маршрут ИЗ города отправления В город назначения.

ФОРМАТ ОТВЕТА (JSON):
{
  "chatResponse": "текст (описание маршрута ИЛИ уточняющий вопрос)",
  "routeItems": [{
    "day": "день",
    "hotel": { "title": "отель", "address": "адрес", "rating": "4.5", "price": "5000", "image": "/image 4.png", "coords": [lat, lon], "website": "https://travel.yandex.ru" },
    "items": [{ "number": 1, "title": "место", "address": "адрес", "category": "кафе", "rating": "4.8", "hours": "10-22", "image": "/image 3.png", "coords": [lat, lon] }]
  }] ИЛИ null
}
Координаты [lat, lon] - только ЧИСЛА.`;

    const requestBody = {
      model: 'GigaChat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.1
    };

    console.log('API Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const textError = await response.text().catch(() => 'Нет текста ошибки');
        console.error('API Error Text:', textError);
        errorData = { message: textError };
      }
      console.error('API Error Response:', errorData);
      throw new Error(`Ошибка API (${response.status}): ${errorData.message || 'Неизвестная ошибка'}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    console.log('AI Raw Content:', content);

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      // If it's not JSON, maybe it's just a text response
      return {
        chatResponse: content,
        routeItems: null
      };
    }
    
    let jsonString = content.substring(firstBrace, lastBrace + 1);
    
    // Clean up common JSON breaking characters
    jsonString = jsonString
      .replace(/[\n\r\t]/g, ' ')
      .replace(/\\n/g, ' ')
      .replace(/ {2,}/g, ' ');

    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'String:', jsonString);
      // Fallback: try to return the text if JSON is broken
      return {
        chatResponse: content.split('{')[0].trim() || "Извините, я не смог правильно сформировать данные. Попробуйте еще раз.",
        routeItems: null
      };
    }
  } catch (e) {
    console.error('GenerateRoute Error:', e);
    throw new Error(e.message || 'Ошибка связи с ИИ. Попробуйте еще раз.');
  }
}
