#!/usr/bin/env python3
"""
文档生成脚本
用于根据用户需求和收集到的信息生成完整的业务文档
"""

import os
import json
from knowledge_base import check_knowledge_base, search_knowledge_base
from template_manager import list_templates, get_template, generate_document_from_template

def analyze_user_request(request):
    """
    分析用户请求
    参数: request - 用户输入的业务诉求
    返回: dict - 分析结果
    """
    # 简单的请求分析，实际应用中可以使用更复杂的NLP技术
    analysis = {
        "original_request": request,
        "keywords": [],
        "document_type": "business_report",
        "industry": "general",
        "target_audience": "business_stakeholders"
    }
    
    # 提取关键词
    # 这里使用简单的关键词匹配，实际应用中可以使用更复杂的NLP技术
    keywords = [
        "数字化转型", "可行性分析", "市场调研", "商业计划",
        "风险评估", "项目提案", "战略规划", "运营分析"
    ]
    
    for keyword in keywords:
        if keyword in request:
            analysis["keywords"].append(keyword)
    
    # 确定文档类型
    if "可行性分析" in request:
        analysis["document_type"] = "feasibility_study"
    elif "市场调研" in request:
        analysis["document_type"] = "market_research"
    elif "商业计划" in request:
        analysis["document_type"] = "business_plan"
    elif "风险评估" in request:
        analysis["document_type"] = "risk_assessment"
    
    return analysis

def collect_information(analysis):
    """
    收集相关信息
    参数: analysis - 用户请求分析结果
    返回: dict - 收集到的信息
    """
    information = {
        "web_search_results": [],
        "knowledge_base_results": []
    }
    
    # 检查本地知识库
    kb_status = check_knowledge_base()
    if kb_status["exists"]:
        # 搜索本地知识库
        for keyword in analysis["keywords"]:
            kb_results = search_knowledge_base(keyword)
            if kb_results:
                information["knowledge_base_results"].extend(kb_results)
    
    # 这里应该调用WebSearch工具搜索网络信息
    # 由于这是一个脚本，我们模拟搜索结果
    information["web_search_results"] = [
        {
            "title": "企业数字化转型最佳实践",
            "content": "数字化转型是企业发展的必然趋势，需要从战略、技术、组织等多个维度推进。"
        },
        {
            "title": "数字化转型风险评估",
            "content": "数字化转型面临技术风险、组织风险和投资风险等多种挑战，需要进行全面的风险评估。"
        }
    ]
    
    return information

def generate_writing_points(analysis, information):
    """
    生成写作要点
    参数: analysis - 用户请求分析结果
          information - 收集到的信息
    返回: list - 写作要点列表
    """
    writing_points = []
    
    # 根据文档类型生成不同的写作要点
    if analysis["document_type"] == "feasibility_study":
        writing_points = [
            "1. 背景介绍：说明数字化转型的背景和必要性",
            "2. 现状分析：分析企业当前的信息化水平和存在的问题",
            "3. 技术可行性：评估所需技术的成熟度和可获取性",
            "4. 经济可行性：分析投资成本和预期收益",
            "5. 组织可行性：评估企业的组织能力和变革管理能力",
            "6. 风险评估：识别和分析可能面临的风险",
            "7. 实施计划：制定详细的实施步骤和时间线",
            "8. 结论与建议：总结可行性分析结果，提出具体建议"
        ]
    elif analysis["document_type"] == "market_research":
        writing_points = [
            "1. 市场概述：介绍目标市场的规模和增长趋势",
            "2. 竞争分析：分析主要竞争对手的优势和劣势",
            "3. 客户分析：了解目标客户的需求和行为",
            "4. 市场机会：识别潜在的市场机会",
            "5. 市场威胁：分析可能面临的市场威胁",
            "6. 市场策略：提出针对目标市场的营销策略",
            "7. 结论与建议：总结市场调研结果，提出具体建议"
        ]
    else:
        # 默认写作要点
        writing_points = [
            "1. 背景介绍：说明文档的背景和目的",
            "2. 现状分析：分析当前状况和存在的问题",
            "3. 目标设定：明确文档的目标和目标",
            "4. 方案设计：提出具体的解决方案",
            "5. 实施计划：制定详细的实施步骤",
            "6. 风险评估：分析可能面临的风险",
            "7. 成本与收益：分析项目的成本和收益",
            "8. 结论与建议：总结文档内容，提出具体建议"
        ]
    
    return writing_points

def generate_document(request, writing_points, user_feedback=None):
    """
    生成文档
    参数: request - 用户输入的业务诉求
          writing_points - 写作要点
          user_feedback - 用户反馈（可选）
    返回: str - 生成的文档内容
    """
    # 分析用户请求
    analysis = analyze_user_request(request)
    
    # 收集信息
    information = collect_information(analysis)
    
    # 选择模板
    templates = list_templates()
    template_name = "business-document-template.md"
    
    # 准备文档内容
    content = {
        "文档标题": request,
        "摘要": f"本文基于用户需求，针对{request}进行了详细分析和阐述。",
        "背景": "根据用户需求，本文旨在分析和解决相关业务问题。",
        "现状分析": "通过对当前状况的分析，我们发现了以下问题和机会：",
        "目标与目标": "本文的目标是为用户提供全面、专业的业务文档，帮助用户做出明智的决策。",
        "方案设计": "基于分析结果，我们提出了以下解决方案：",
        "风险评估": "在实施过程中，可能面临以下风险：",
        "实施计划": "建议按照以下计划实施：",
        "成本与收益分析": "项目的成本和收益分析如下：",
        "结论与建议": "基于以上分析，我们得出以下结论和建议：",
        "参考资料": "",
        "附录": ""
    }
    
    # 根据写作要点和收集到的信息填充内容
    # 这里使用简单的填充逻辑，实际应用中可以使用更复杂的内容生成技术
    content["现状分析"] = "\n".join([f"- {point}" for point in writing_points[:2]])
    content["方案设计"] = "\n".join([f"- {point}" for point in writing_points[2:5]])
    content["实施计划"] = "\n".join([f"- {point}" for point in writing_points[5:7]])
    content["结论与建议"] = "\n".join([f"- {point}" for point in writing_points[7:]])
    
    # 应用用户反馈
    if user_feedback:
        # 这里可以根据用户反馈调整文档内容
        # 例如，如果用户要求增加成本分析部分，可以在文档中添加相关内容
        pass
    
    # 生成文档
    document = generate_document_from_template(template_name, content)
    
    return document

def update_document(document, user_feedback):
    """
    根据用户反馈更新文档
    参数: document - 当前文档内容
          user_feedback - 用户反馈
    返回: str - 更新后的文档内容
    """
    # 这里可以根据用户反馈调整文档内容
    # 例如，替换特定部分的内容，添加新的章节等
    
    # 简单的示例：替换摘要部分
    if "摘要" in user_feedback:
        import re
        document = re.sub(r"## 摘要\n\n.*?\n\n", f"## 摘要\n\n{user_feedback['摘要']}\n\n", document, flags=re.DOTALL)
    
    # 替换其他部分...
    
    return document

if __name__ == "__main__":
    # 测试文档生成
    test_request = "企业数字化转型可行性分析"
    print("分析用户请求:")
    analysis = analyze_user_request(test_request)
    print(analysis)
    
    print("\n收集信息:")
    information = collect_information(analysis)
    print(information)
    
    print("\n生成写作要点:")
    writing_points = generate_writing_points(analysis, information)
    print(writing_points)
    
    print("\n生成文档:")
    document = generate_document(test_request, writing_points)
    print(document)
    
    # 测试文档更新
    print("\n更新文档:")
    user_feedback = {"摘要": "本文分析了企业数字化转型的可行性，包括技术、经济和组织等多个维度。"}
    updated_document = update_document(document, user_feedback)
    print(updated_document)