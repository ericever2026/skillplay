const args = process.argv[2];
let params;

try {
  params = JSON.parse(args);
} catch (e) {
  params = { input: args, context: [] };
}

const input = params.input || '';

const dictionary = {
  'zh-en': {
    '你好': 'Hello',
    '世界': 'World',
    '电脑': 'Computer',
    '手机': 'Mobile Phone',
    '人工智能': 'Artificial Intelligence',
    '机器学习': 'Machine Learning',
    '深度学习': 'Deep Learning',
    '自然语言处理': 'Natural Language Processing',
    '今天': 'Today',
    '明天': 'Tomorrow',
    '昨天': 'Yesterday',
    '早上好': 'Good Morning',
    '晚上好': 'Good Evening',
    '谢谢': 'Thank You',
    '再见': 'Goodbye',
    '是': 'Yes',
    '不是': 'No',
    '好的': 'OK',
    '请': 'Please',
    '对不起': 'Sorry',
    '我爱你': 'I Love You',
    '朋友': 'Friend',
    '家人': 'Family',
    '工作': 'Work',
    '学习': 'Study',
    '游戏': 'Game',
    '音乐': 'Music',
    '电影': 'Movie',
    '书': 'Book',
    '水': 'Water',
    '食物': 'Food'
  },
  'en-zh': {
    'hello': '你好',
    'world': '世界',
    'computer': '电脑',
    'mobile phone': '手机',
    'artificial intelligence': '人工智能',
    'machine learning': '机器学习',
    'deep learning': '深度学习',
    'natural language processing': '自然语言处理',
    'today': '今天',
    'tomorrow': '明天',
    'yesterday': '昨天',
    'good morning': '早上好',
    'good evening': '晚上好',
    'thank you': '谢谢',
    'goodbye': '再见',
    'yes': '是',
    'no': '不是',
    'ok': '好的',
    'please': '请',
    'sorry': '对不起',
    'i love you': '我爱你',
    'friend': '朋友',
    'family': '家人',
    'work': '工作',
    'study': '学习',
    'game': '游戏',
    'music': '音乐',
    'movie': '电影',
    'book': '书',
    'water': '水',
    'food': '食物'
  }
};

function detectLanguage(text) {
  const chinesePattern = /[\u4e00-\u9fa5]/;
  if (chinesePattern.test(text)) {
    return 'zh';
  }
  return 'en';
}

function extractTranslationRequest(text) {
  const patterns = [
    /把\s*(.+?)\s*翻译成?\s*(英文|中文|英语)/,
    /将\s*(.+?)\s*翻译成?\s*(英文|中文|英语)/,
    /(.+?)\s*翻译成?\s*(英文|中文|英语)/,
    /translate\s+(.+?)\s+to\s+(chinese|english)/i,
    /(.+?)\s*怎么说/,
    /(.+?)的?意思/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return text.replace(/翻译|translate|译成|怎么说|的意思/gi, '').trim();
}

function translate(text, fromLang, toLang) {
  const dictKey = `${fromLang}-${toLang}`;
  const dict = dictionary[dictKey];
  
  if (!dict) {
    return null;
  }
  
  const lowerText = text.toLowerCase();
  
  if (dict[text] || dict[lowerText]) {
    return dict[text] || dict[lowerText];
  }
  
  for (const [key, value] of Object.entries(dict)) {
    if (text.includes(key) || lowerText.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}

function formatResponse(original, translated, fromLang, toLang) {
  const fromLangName = fromLang === 'zh' ? '中文' : '英文';
  const toLangName = toLang === 'zh' ? '中文' : '英文';
  
  return `🌐 翻译结果

📝 原文 (${fromLangName}): ${original}
✨ 译文 (${toLangName}): ${translated}

💡 提示: 这是一个演示用的简单翻译器，词典有限。
   如需更准确的翻译，请使用专业翻译服务。`;
}

try {
  const textToTranslate = extractTranslationRequest(input);
  const sourceLang = detectLanguage(textToTranslate);
  const targetLang = sourceLang === 'zh' ? 'en' : 'zh';
  
  const translated = translate(textToTranslate, sourceLang, targetLang);
  
  if (translated) {
    console.log(formatResponse(textToTranslate, translated, sourceLang, targetLang));
  } else {
    console.log(`🌐 翻译提示

📝 您输入的文本: "${textToTranslate}"
🔄 检测语言: ${sourceLang === 'zh' ? '中文' : '英文'} → ${targetLang === 'zh' ? '中文' : '英文'}

❌ 抱歉，这个词不在演示词典中。

💡 提示: 这是一个演示用的简单翻译器，词典包含常用词汇。
   您可以尝试翻译: 你好、世界、人工智能、Hello、World 等`);
  }
} catch (error) {
  console.log(`抱歉，翻译时出现错误: ${error.message}`);
}
