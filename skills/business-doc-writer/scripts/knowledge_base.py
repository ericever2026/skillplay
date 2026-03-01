#!/usr/bin/env python3
"""
本地知识库检查和管理脚本
用于检查用户是否配置了本地知识库，并提供访问本地知识的功能
"""

import os
import json

def check_knowledge_base():
    """
    检查本地知识库是否存在
    返回: dict - 包含知识库状态和路径的字典
    """
    # 知识库默认路径
    kb_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "references"),
        os.path.expanduser("~/.business-doc-writer/knowledge_base"),
        "./knowledge_base"
    ]
    
    for path in kb_paths:
        if os.path.exists(path) and os.path.isdir(path):
            # 检查知识库中是否有文件
            files = os.listdir(path)
            if files:
                return {
                    "exists": True,
                    "path": path,
                    "files": files
                }
    
    return {
        "exists": False,
        "message": "未找到本地知识库，请在references目录或~/.business-doc-writer/knowledge_base目录中添加相关文档"
    }

def load_knowledge_base():
    """
    加载本地知识库中的内容
    返回: dict - 包含知识库内容的字典
    """
    kb_status = check_knowledge_base()
    if not kb_status["exists"]:
        return {"status": "error", "message": kb_status["message"]}
    
    kb_path = kb_status["path"]
    knowledge = {}
    
    # 遍历知识库中的文件
    for root, dirs, files in os.walk(kb_path):
        for file in files:
            if file.endswith(".md") or file.endswith(".txt") or file.endswith(".pdf"):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, kb_path)
                
                # 读取文件内容（仅支持文本文件）
                if file.endswith(".md") or file.endswith(".txt"):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        knowledge[relative_path] = content
                    except Exception as e:
                        knowledge[relative_path] = f"Error reading file: {str(e)}"
                else:
                    knowledge[relative_path] = f"File type: {os.path.splitext(file)[1]}"
    
    return {
        "status": "success",
        "knowledge": knowledge
    }

def search_knowledge_base(query):
    """
    在本地知识库中搜索相关内容
    参数: query - 搜索关键词
    返回: list - 包含搜索结果的列表
    """
    kb_content = load_knowledge_base()
    if kb_content["status"] != "success":
        return []
    
    results = []
    knowledge = kb_content["knowledge"]
    
    for file_path, content in knowledge.items():
        if query.lower() in content.lower():
            # 提取相关段落
            lines = content.split('\n')
            relevant_lines = []
            for i, line in enumerate(lines):
                if query.lower() in line.lower():
                    # 提取上下文（前后3行）
                    start = max(0, i - 3)
                    end = min(len(lines), i + 4)
                    context = '\n'.join(lines[start:end])
                    relevant_lines.append(context)
            
            if relevant_lines:
                results.append({
                    "file": file_path,
                    "content": '\n---\n'.join(relevant_lines)
                })
    
    return results

if __name__ == "__main__":
    # 测试知识库检查
    print("检查知识库状态:")
    print(check_knowledge_base())
    
    # 测试加载知识库
    print("\n加载知识库内容:")
    print(load_knowledge_base())
    
    # 测试搜索知识库
    print("\n搜索知识库:")
    print(search_knowledge_base("digital transformation"))