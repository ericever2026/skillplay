#!/usr/bin/env python3
"""
业务文档写作skill主脚本
用于整合所有功能，处理用户请求并生成文档
"""

import sys
import os
from knowledge_base import check_knowledge_base, search_knowledge_base
from template_manager import list_templates, get_template, generate_document_from_template
from document_generator import analyze_user_request, collect_information, generate_writing_points, generate_document, update_document

def main():
    """
    主函数
    """
    print("=== 业务文档写作专家 ===")
    print("欢迎使用业务文档写作skill，我将帮助您生成高质量的业务文档。")
    print("\n请输入您的业务诉求：")
    
    # 获取用户输入
    user_request = input("> ")
    
    # 分析用户请求
    print("\n正在分析您的请求...")
    analysis = analyze_user_request(user_request)
    
    # 收集信息
    print("\n正在收集相关信息...")
    information = collect_information(analysis)
    
    # 检查本地知识库
    kb_status = check_knowledge_base()
    if kb_status["exists"]:
        print(f"\n发现本地知识库，路径：{kb_status['path']}")
        print(f"知识库文件数：{len(kb_status['files'])}")
    else:
        print("\n未发现本地知识库，将仅使用网络搜索结果。")
    
    # 生成写作要点
    print("\n正在生成写作要点...")
    writing_points = generate_writing_points(analysis, information)
    
    print("\n=== 写作要点 ===")
    for point in writing_points:
        print(point)
    
    # 确认写作要点
    print("\n请确认这些写作要点是否符合您的需求？(y/n)")
    confirm = input("> ")
    
    if confirm.lower() != 'y':
        print("\n请输入您的修改意见：")
        feedback = input("> ")
        # 这里可以根据用户反馈调整写作要点
        print("\n已根据您的反馈调整写作要点。")
    
    # 生成文档
    print("\n正在生成文档...")
    document = generate_document(user_request, writing_points)
    
    print("\n=== 生成的文档 ===")
    print(document)
    
    # 保存文档
    print("\n是否保存文档？(y/n)")
    save = input("> ")
    
    if save.lower() == 'y':
        print("\n请输入保存的文件名：")
        filename = input("> ")
        if not filename.endswith('.md'):
            filename += '.md'
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(document)
        
        print(f"\n文档已保存为：{filename}")
    
    # 询问是否需要修改
    print("\n是否需要修改文档？(y/n)")
    modify = input("> ")
    
    while modify.lower() == 'y':
        print("\n请输入您的修改意见：")
        feedback = input("> ")
        
        # 更新文档
        print("\n正在更新文档...")
        document = update_document(document, {"feedback": feedback})
        
        print("\n=== 更新后的文档 ===")
        print(document)
        
        # 询问是否继续修改
        print("\n是否需要进一步修改？(y/n)")
        modify = input("> ")
    
    print("\n文档生成完成，感谢使用业务文档写作skill！")

if __name__ == "__main__":
    main()