"""
供应链风险审计 - 外部数据获取脚本
用于从外部API获取供应商舆情和征信数据
"""

import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class ExternalDataFetcher:
    """外部数据获取器"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    def fetch_news_sentiment(self, supplier_name: str, days: int = 90) -> Dict:
        """
        获取供应商舆情数据
        实际使用时替换为真实API调用
        """
        mock_news = []
        negative_count = random.randint(0, 3)
        
        for i in range(random.randint(5, 15)):
            date = datetime.now() - timedelta(days=random.randint(0, days))
            is_negative = i < negative_count
            
            mock_news.append({
                "title": f"关于{supplier_name}的{'负面' if is_negative else '正面'}报道",
                "source": random.choice(["财经日报", "行业周刊", "企业观察", "市场快报"]),
                "date": date.strftime("%Y-%m-%d"),
                "sentiment": "negative" if is_negative else "positive",
                "relevance": round(random.uniform(0.5, 1.0), 2)
            })
        
        return {
            "supplier": supplier_name,
            "period_days": days,
            "total_news": len(mock_news),
            "negative_count": negative_count,
            "positive_count": len(mock_news) - negative_count,
            "news": mock_news
        }
    
    def fetch_credit_info(self, supplier_name: str) -> Dict:
        """
        获取企业征信信息
        实际使用时替换为真实API调用
        """
        return {
            "supplier": supplier_name,
            "credit_score": random.randint(60, 95),
            "registration_status": "正常",
            "lawsuits": random.randint(0, 3),
            "tax_issues": random.randint(0, 1),
            "business_years": random.randint(3, 20),
            "registered_capital": f"{random.randint(100, 5000)}万元",
            "last_update": datetime.now().strftime("%Y-%m-%d")
        }
    
    def fetch_industry_benchmark(self, industry: str) -> Dict:
        """
        获取行业基准数据
        """
        benchmarks = {
            "电子": {
                "avg_delivery_rate": 95.5,
                "avg_payment_terms": 35,
                "avg_financial_score": 72,
                "risk_threshold": 5
            },
            "制造": {
                "avg_delivery_rate": 94.8,
                "avg_payment_terms": 40,
                "avg_financial_score": 70,
                "risk_threshold": 5
            },
            "物流": {
                "avg_delivery_rate": 97.2,
                "avg_payment_terms": 25,
                "avg_financial_score": 75,
                "risk_threshold": 3
            }
        }
        
        return benchmarks.get(industry, benchmarks["制造"])


def calculate_sentiment_risk(news_data: Dict) -> float:
    """计算舆情风险评分"""
    negative_ratio = news_data["negative_count"] / max(news_data["total_news"], 1)
    return round(negative_ratio * 100, 1)


def calculate_credit_risk(credit_data: Dict) -> float:
    """计算信用风险评分"""
    risk = 0
    
    risk += (100 - credit_data["credit_score"]) * 0.5
    risk += credit_data["lawsuits"] * 10
    risk += credit_data["tax_issues"] * 15
    
    return min(100, round(risk, 1))


if __name__ == "__main__":
    fetcher = ExternalDataFetcher()
    
    supplier = "华鑫电子"
    
    news = fetcher.fetch_news_sentiment(supplier)
    credit = fetcher.fetch_credit_info(supplier)
    benchmark = fetcher.fetch_industry_benchmark("电子")
    
    print(f"\n{'='*50}")
    print(f"供应商: {supplier}")
    print(f"{'='*50}")
    
    print(f"\n舆情数据:")
    print(f"  - 总报道数: {news['total_news']}")
    print(f"  - 负面报道: {news['negative_count']}")
    print(f"  - 舆情风险分: {calculate_sentiment_risk(news)}")
    
    print(f"\n征信数据:")
    print(f"  - 信用评分: {credit['credit_score']}")
    print(f"  - 诉讼记录: {credit['lawsuits']}笔")
    print(f"  - 信用风险分: {calculate_credit_risk(credit)}")
    
    print(f"\n行业基准:")
    print(f"  - 平均交付率: {benchmark['avg_delivery_rate']}%")
    print(f"  - 平均账期: {benchmark['avg_payment_terms']}天")
