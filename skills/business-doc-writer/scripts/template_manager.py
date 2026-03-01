#!/usr/bin/env python3
"""
文档模板管理脚本
用于管理、选择和下载文档模板
"""

import os
import requests
from bs4 import BeautifulSoup

def list_templates():
    """
    列出所有可用的文档模板
    返回: list - 包含模板名称和路径的列表
    """
    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    templates = []
    
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    for file in os.listdir(templates_dir):
        if file.endswith(".md") or file.endswith(".docx") or file.endswith(".pdf"):
            templates.append({
                "name": file,
                "path": os.path.join(templates_dir, file)
            })
    
    return templates

def get_template(template_name):
    """
    获取指定的模板内容
    参数: template_name - 模板名称
    返回: str - 模板内容
    """
    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    template_path = os.path.join(templates_dir, template_name)
    
    if not os.path.exists(template_path):
        return f"Template {template_name} not found"
    
    if template_name.endswith(".md") or template_name.endswith(".txt"):
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content
        except Exception as e:
            return f"Error reading template: {str(e)}"
    else:
        return f"Template {template_name} is not a text file"

def download_template(url, template_name):
    """
    从指定URL下载模板
    参数: url - 模板下载地址
          template_name - 保存的模板名称
    返回: bool - 下载是否成功
    """
    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
    template_path = os.path.join(templates_dir, template_name)
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        with open(template_path, 'wb') as f:
            f.write(response.content)
        
        return True
    except Exception as e:
        print(f"Error downloading template: {str(e)}")
        return False

def search_and_download_templates(query):
    """
    搜索并下载相关的文档模板
    参数: query - 搜索关键词
    返回: list - 下载的模板列表
    """
    # 这里使用一个简单的示例，实际应用中可以使用更复杂的搜索逻辑
    # 例如搜索Google Scholar或其他学术网站的论文格式
    
    # 示例搜索结果
    search_results = [
        {
            "name": "academic-paper-template.md",
            "url": "https://example.com/academic-paper-template.md"
        },
        {
            "name": "business-report-template.md",
            "url": "https://example.com/business-report-template.md"
        }
    ]
    
    downloaded_templates = []
    for result in search_results:
        if download_template(result["url"], result["name"]):
            downloaded_templates.append(result["name"])
    
    return downloaded_templates

def generate_document_from_template(template_name, content):
    """
    根据模板生成文档
    参数: template_name - 模板名称
          content - 文档内容（字典格式）
    返回: str - 生成的文档内容
    """
    template_content = get_template(template_name)
    
    # 替换模板中的占位符
    for key, value in content.items():
        placeholder = f"【{key}】"
        template_content = template_content.replace(placeholder, value)
    
    return template_content

if __name__ == "__main__":
    # 测试列出模板
    print("可用模板:")
    print(list_templates())
    
    # 测试获取模板
    print("\n获取模板内容:")
    print(get_template("business-document-template.md"))
    
    # 测试生成文档
    print("\n生成文档:")
    test_content = {
        "文档标题": "企业数字化转型可行性分析",
        "摘要": "本文分析了企业数字化转型的可行性，包括背景、现状、方案设计和风险评估等内容。",
        "背景": "随着数字技术的快速发展，企业面临着数字化转型的压力和机遇。",
        "现状分析": "当前企业的信息化水平较低，存在流程繁琐、数据孤岛等问题。",
        "目标与目标": "短期目标是建立数字化管理系统，长期目标是实现全面数字化转型。",
        "方案设计": "采用云计算、大数据等技术，分阶段实施数字化转型。",
        "风险评估": "主要风险包括技术风险、组织风险和投资风险。",
        "实施计划": "第一阶段：系统规划（3个月）；第二阶段：系统开发（6个月）；第三阶段：系统上线（3个月）。",
        "成本与收益分析": "总投资约1000万元，预计3年内收回成本。",
        "结论与建议": "企业数字化转型具有可行性，建议尽快启动实施。",
        "参考资料": "[1] 数字化转型白皮书. 2026.\n[2] 企业信息化建设指南. 2025.",
        "附录": "包含详细的技术方案和成本预算。"
    }
    print(generate_document_from_template("business-document-template.md", test_content))