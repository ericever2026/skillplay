const args = process.argv[2];
let params;

try {
  params = JSON.parse(args);
} catch (e) {
  params = { input: args, context: [] };
}

const input = params.input || '';
const context = params.context || [];

function extractCity(text) {
  const cityPatterns = [
    /(.+?)的?天气/,
    /(.+?)的?气温/,
    /(.+?)的?温度/,
    /weather\s+(?:in\s+)?(.+)/i,
    /(.+?)天气/
  ];
  
  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '北京';
}

function generateWeather(city) {
  const conditions = ['晴天', '多云', '阴天', '小雨', '大雨', '雷阵雨', '雪'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 30) + 5;
  const humidity = Math.floor(Math.random() * 50) + 30;
  const wind = ['无风', '微风', '中风', '大风'][Math.floor(Math.random() * 4)];
  
  return {
    city,
    condition,
    temperature: temp,
    humidity,
    wind,
    updateTime: new Date().toLocaleString('zh-CN')
  };
}

function formatWeatherResponse(weather) {
  return `🌤️ ${weather.city}天气报告

📅 更新时间: ${weather.updateTime}

🌡️ 温度: ${weather.temperature}°C
💧 湿度: ${weather.humidity}%
💨 风力: ${weather.wind}
☁️ 天气状况: ${weather.condition}

💡 建议: ${getSuggestion(weather.condition)}`;
}

function getSuggestion(condition) {
  const suggestions = {
    '晴天': '阳光明媚，适合户外活动，注意防晒。',
    '多云': '天气舒适，适合外出散步。',
    '阴天': '天气阴沉，可能会有降雨，建议带伞。',
    '小雨': '有小雨，出门请带伞，注意防滑。',
    '大雨': '雨势较大，建议减少外出，注意安全。',
    '雷阵雨': '有雷电，请避免户外活动，远离高大建筑物。',
    '雪': '有雪，注意保暖，道路可能湿滑。'
  };
  return suggestions[condition] || '祝您今天愉快！';
}

try {
  const city = extractCity(input);
  const weather = generateWeather(city);
  const response = formatWeatherResponse(weather);
  console.log(response);
} catch (error) {
  console.log(`抱歉，获取天气信息时出现错误: ${error.message}`);
}
