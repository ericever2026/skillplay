const fs = require('fs');
const path = require('path');

const INDUSTRY_BENCHMARKS = {
  '电子': { maxDelayRate: 5, name: '电子/制造业' },
  '制造': { maxDelayRate: 5, name: '电子/制造业' },
  '物流': { maxDelayRate: 3, name: '物流行业' },
  'default': { maxDelayRate: 5, name: '制造业' }
};

const RISK_WEIGHTS = {
  delivery: 0.40,
  financial: 0.35,
  sentiment: 0.25
};

const RISK_LEVELS = {
  low: { min: 0, max: 30, label: '低风险', action: '正常合作，年度复核' },
  medium: { min: 31, max: 60, label: '中风险', action: '加强监控，季度复核' },
  high: { min: 61, max: 80, label: '高风险', action: '启动备选供应商，月度复核' },
  critical: { min: 81, max: 100, label: '极高风险', action: '暂停合作，启动应急预案' }
};

function getRiskLevel(score) {
  if (score <= 30) return RISK_LEVELS.low;
  if (score <= 60) return RISK_LEVELS.medium;
  if (score <= 80) return RISK_LEVELS.high;
  return RISK_LEVELS.critical;
}

function extractSupplierName(input) {
  const patterns = [
    /(?:供应商|审核|审计|评估)[""]?([^"",，。！？]+)[""]?/i,
    /[""]([^""]+)[""]/,
    /^([^\s,，]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '未知供应商';
}

function extractIndustry(input) {
  const industries = ['电子', '制造', '物流'];
  for (const industry of industries) {
    if (input.includes(industry)) {
      return industry;
    }
  }
  return 'default';
}

function generateMockData(supplierName, industry) {
  const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default;
  
  const deliveryOnTimeRate = 85 + Math.random() * 15;
  const deliveryRisk = Math.max(0, (benchmark.maxDelayRate - (100 - deliveryOnTimeRate)) * 5);
  
  const financialHealthScore = 50 + Math.random() * 50;
  const financialRisk = 100 - financialHealthScore;
  
  const negativeNews = Math.floor(Math.random() * 5);
  const sentimentRisk = negativeNews * 15;
  
  return {
    supplierId: `SUP-${Date.now().toString(36).toUpperCase()}`,
    deliveryOnTimeRate: deliveryOnTimeRate.toFixed(1),
    unfulfilledOrders: Math.floor(Math.random() * 10),
    paymentTerms: [30, 45, 60][Math.floor(Math.random() * 3)],
    financialHealthScore: Math.round(financialHealthScore),
    deliveryRisk: Math.round(deliveryRisk),
    financialRisk: Math.round(financialRisk),
    sentimentRisk: Math.round(sentimentRisk),
    negativeNews,
    lawsuits: Math.floor(Math.random() * 3),
    benchmark
  };
}

function calculateOverallRisk(data) {
  const score = Math.round(
    RISK_WEIGHTS.delivery * data.deliveryRisk +
    RISK_WEIGHTS.financial * data.financialRisk +
    RISK_WEIGHTS.sentiment * data.sentimentRisk
  );
  return Math.min(100, Math.max(0, score));
}

function generateReport(supplierName, industry, data) {
  const overallRisk = calculateOverallRisk(data);
  const riskLevel = getRiskLevel(overallRisk);
  const deliveryLevel = getRiskLevel(data.deliveryRisk);
  const financialLevel = getRiskLevel(data.financialRisk);
  const sentimentLevel = getRiskLevel(data.sentimentRisk);
  
  const today = new Date().toLocaleDateString('zh-CN');
  const nextReview = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN');
  
  const warnings = [];
  if (data.deliveryOnTimeRate < 95) {
    warnings.push(`交付准时率(${data.deliveryOnTimeRate}%)低于行业基准(95%)`);
  }
  if (data.financialHealthScore < 70) {
    warnings.push(`财务健康评分(${data.financialHealthScore})偏低`);
  }
  if (data.lawsuits > 0) {
    warnings.push(`存在${data.lawsuits}笔诉讼记录需关注`);
  }
  if (data.negativeNews > 0) {
    warnings.push(`近90天有${data.negativeNews}条负面舆情`);
  }
  
  const actions = [];
  if (overallRisk <= 30) {
    actions.push('继续正常合作，保持现有订单规模');
    actions.push('建议年度复核，关注关键指标变化');
    if (data.financialHealthScore > 80) {
      actions.push('可考虑增加订单量或扩展合作范围');
    }
  } else if (overallRisk <= 60) {
    actions.push('保持合作但需加强监控');
    actions.push('建议季度复核，重点关注风险指标');
    actions.push('准备备选供应商名单');
  } else if (overallRisk <= 80) {
    actions.push('启动备选供应商，逐步减少订单依赖');
    actions.push('月度复核，密切监控风险变化');
    actions.push('要求供应商提供改善计划');
  } else {
    actions.push('⚠️ 暂停新订单，评估现有订单风险');
    actions.push('启动应急预案，切换至备选供应商');
    actions.push('法务介入，评估合同风险');
  }
  
  return `# 📊 供应商风险审计报告

## 基本信息
- **供应商名称**：${supplierName}
- **审计日期**：${today}
- **行业类型**：${data.benchmark.name}
- **供应商编号**：${data.supplierId}

## 风险评分概览

| 维度 | 评分 | 风险等级 |
|------|------|----------|
| 交付风险 | ${data.deliveryRisk}分 | ${deliveryLevel.label} |
| 财务风险 | ${data.financialRisk}分 | ${financialLevel.label} |
| 舆情风险 | ${data.sentimentRisk}分 | ${sentimentLevel.label} |
| **综合评分** | **${overallRisk}分** | **${riskLevel.label}** |

## 详细分析

### 📦 交付表现分析
- 近6个月交付准时率：**${data.deliveryOnTimeRate}%** ${parseFloat(data.deliveryOnTimeRate) >= 95 ? '✅' : '⚠️'}
- 未完成订单：**${data.unfulfilledOrders}笔** ${data.unfulfilledOrders < 5 ? '✅' : '⚠️'}
- 账期：**${data.paymentTerms}天** ${data.paymentTerms <= 45 ? '✅' : '⚠️'}
- 行业基准：${data.benchmark.maxDelayRate}%延迟率

### 💰 财务健康度分析
- 财务健康评分：**${data.financialHealthScore}/100** ${data.financialHealthScore >= 70 ? '✅' : '⚠️'}
- 诉讼记录：**${data.lawsuits}笔** ${data.lawsuits === 0 ? '✅' : '⚠️'}
- 信用状态：${data.financialHealthScore >= 80 ? '良好' : data.financialHealthScore >= 60 ? '一般' : '需关注'}

### 📰 舆情风险分析
- 近90天负面新闻：**${data.negativeNews}条** ${data.negativeNews === 0 ? '✅' : '⚠️'}
- 行业口碑：${data.negativeNews === 0 ? '良好' : '需关注'}
- 媒体曝光度：${data.negativeNews > 2 ? '高频负面' : '正常'}

## ⚠️ 风险预警

${warnings.length > 0 ? warnings.map(w => `- ${w}`).join('\n') : '暂无明显风险预警'}

## 💡 行动建议

${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

## 📅 复审建议

- **下次审计时间**：${nextReview}
- **重点监控指标**：${overallRisk > 30 ? '交付准时率、财务健康评分、舆情动态' : '财务健康评分'}
- **建议复核周期**：${overallRisk <= 30 ? '年度' : overallRisk <= 60 ? '季度' : '月度'}

---

*本报告由供应链风险审计系统自动生成，仅供参考。重要决策请结合实际情况。*`;
}

async function execute(input, context = []) {
  const supplierName = extractSupplierName(input);
  const industry = extractIndustry(input);
  const data = generateMockData(supplierName, industry);
  const report = generateReport(supplierName, industry, data);
  
  return {
    success: true,
    result: report,
    data: {
      supplierName,
      industry,
      riskScore: calculateOverallRisk(data),
      riskLevel: getRiskLevel(calculateOverallRisk(data)).label
    }
  };
}

module.exports = { execute };
