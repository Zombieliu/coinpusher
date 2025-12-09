#!/usr/bin/env python3
"""
🔍 性能测试结果分析工具

用法:
  python3 analyze-perf.py                    # 生成文本报告
  python3 analyze-perf.py --html             # 生成HTML报告
  python3 analyze-perf.py --plot             # 生成图表（需要matplotlib）
"""

import json
import csv
import glob
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

class PerfAnalyzer:
    def __init__(self, results_dir='./perf-results'):
        self.results_dir = results_dir
        self.results = []
        self.monitors = {}

    def load_data(self):
        """加载所有测试结果"""
        # 加载 JSON 结果
        result_files = glob.glob(f'{self.results_dir}/*_results.json')
        for f in result_files:
            try:
                with open(f) as fp:
                    data = json.load(fp)
                    self.results.append(data)
            except Exception as e:
                print(f'⚠️  读取 {f} 失败: {e}')

        # 加载监控数据
        monitor_files = glob.glob(f'{self.results_dir}/*_monitor.csv')
        for f in monitor_files:
            try:
                profile = os.path.basename(f).replace('_monitor.csv', '')
                with open(f) as fp:
                    reader = csv.DictReader(fp)
                    self.monitors[profile] = list(reader)
            except Exception as e:
                print(f'⚠️  读取 {f} 失败: {e}')

        self.results.sort(key=lambda x: x.get('total_coins', 0))

    def print_summary(self):
        """打印汇总报告"""
        if not self.results:
            print('❌ 未找到测试结果')
            return

        print('\n' + '━' * 90)
        print('📊 性能测试汇总报告')
        print('━' * 90)
        print(f'测试时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        print(f'测试配置数: {len(self.results)}')
        print('━' * 90)
        print()

        # 表头
        print(f'{"配置":<12} {"总硬币":<10} {"消息/秒":<12} {"平均延迟":<12} {"P95延迟":<12} {"P99延迟":<12} {"错误率":<10}')
        print('─' * 90)

        # 数据行
        for r in self.results:
            error_rate = (r['errors'] / r['messages_sent'] * 100) if r['messages_sent'] > 0 else 0
            print(f"{r['config']:<12} {r['total_coins']:<10} "
                  f"{r['msg_per_sec']:<12.1f} {r['avg_latency']:<12.2f}ms "
                  f"{r['p95_latency']:<12.2f}ms {r['p99_latency']:<12.2f}ms "
                  f"{error_rate:<10.2f}%")

        print('━' * 90)
        print()

        # 性能分析
        self._print_analysis()

        # 资源分析
        self._print_resource_analysis()

    def _print_analysis(self):
        """打印性能分析"""
        print('📈 性能分析:')
        print()

        for r in self.results:
            status_emoji = '✅' if r['p95_latency'] < 10 else '⚠️' if r['p95_latency'] < 50 else '❌'

            # 性能评级
            if r['p95_latency'] < 10 and r['errors'] == 0:
                rating = '优秀'
                recommendation = '延迟低，适合生产环境'
            elif r['p95_latency'] < 50 and r['errors'] == 0:
                rating = '良好'
                recommendation = '可用于生产，建议预留20%余量'
            else:
                rating = '需改进'
                recommendation = '建议升级配置或优化代码'

            print(f"  {status_emoji} {r['config']}")
            print(f"     - 性能评级: {rating}")
            print(f"     - 承载能力: {r['total_coins']} 个金币")
            print(f"     - 吞吐量: {r['msg_per_sec']:.1f} 消息/秒")
            print(f"     - 延迟: P95={r['p95_latency']:.2f}ms, P99={r['p99_latency']:.2f}ms")
            print(f"     - 建议: {recommendation}")
            print()

    def _print_resource_analysis(self):
        """打印资源分析"""
        if not self.monitors:
            return

        print('💻 资源使用分析:')
        print()

        for profile, data in self.monitors.items():
            if not data:
                continue

            # 计算统计数据
            cpu_values = [float(d['cpu_percent']) for d in data if d['cpu_percent']]
            mem_values = [float(d['memory_mb']) for d in data if d['memory_mb']]

            if cpu_values and mem_values:
                avg_cpu = sum(cpu_values) / len(cpu_values)
                max_cpu = max(cpu_values)
                avg_mem = sum(mem_values) / len(mem_values)
                max_mem = max(mem_values)

                config_name = None
                for r in self.results:
                    if r['profile'] == profile:
                        config_name = r['config']
                        break

                print(f"  📊 {config_name or profile}")
                print(f"     - CPU: 平均 {avg_cpu:.1f}%, 峰值 {max_cpu:.1f}%")
                print(f"     - 内存: 平均 {avg_mem:.1f}MB, 峰值 {max_mem:.1f}MB")

                # CPU 使用率建议
                if max_cpu < 50:
                    print(f"     - CPU余量充足，可承载更多负载")
                elif max_cpu < 80:
                    print(f"     - CPU使用正常，有一定扩展空间")
                else:
                    print(f"     - CPU接近瓶颈，建议升级配置")

                print()

    def generate_html_report(self, output='perf-report.html'):
        """生成HTML报告"""
        if not self.results:
            print('❌ 未找到测试结果')
            return

        html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>性能测试报告</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            max-width: 1200px;
            margin: 40px auto;
            padding: 0 20px;
            background: #f6f8fa;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 36px;
        }}
        .header p {{
            margin: 10px 0 0;
            opacity: 0.9;
        }}
        .card {{
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e1e4e8;
        }}
        th {{
            background: #f6f8fa;
            font-weight: 600;
        }}
        .status-good {{ color: #22863a; }}
        .status-warn {{ color: #e36209; }}
        .status-bad {{ color: #d73a49; }}
        .metric {{
            display: inline-block;
            background: #f6f8fa;
            padding: 8px 15px;
            border-radius: 5px;
            margin: 5px;
        }}
        .metric-label {{
            font-size: 12px;
            color: #586069;
            display: block;
        }}
        .metric-value {{
            font-size: 24px;
            font-weight: bold;
            color: #24292e;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 性能测试报告</h1>
        <p>生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
    </div>

    <div class="card">
        <h2>📊 测试结果汇总</h2>
        <table>
            <thead>
                <tr>
                    <th>配置</th>
                    <th>总硬币</th>
                    <th>消息/秒</th>
                    <th>平均延迟</th>
                    <th>P95延迟</th>
                    <th>P99延迟</th>
                    <th>错误率</th>
                </tr>
            </thead>
            <tbody>
'''

        for r in self.results:
            error_rate = (r['errors'] / r['messages_sent'] * 100) if r['messages_sent'] > 0 else 0
            status_class = 'status-good' if r['p95_latency'] < 10 else 'status-warn' if r['p95_latency'] < 50 else 'status-bad'

            html += f'''
                <tr>
                    <td><strong>{r['config']}</strong></td>
                    <td>{r['total_coins']}</td>
                    <td>{r['msg_per_sec']:.1f}</td>
                    <td class="{status_class}">{r['avg_latency']:.2f}ms</td>
                    <td class="{status_class}">{r['p95_latency']:.2f}ms</td>
                    <td class="{status_class}">{r['p99_latency']:.2f}ms</td>
                    <td>{error_rate:.2f}%</td>
                </tr>
'''

        html += '''
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>📈 性能指标</h2>
'''

        # 找出最佳配置
        best = min(self.results, key=lambda x: x['p95_latency'])
        fastest = max(self.results, key=lambda x: x['msg_per_sec'])
        highest_capacity = max(self.results, key=lambda x: x['total_coins'])

        html += f'''
        <div>
            <div class="metric">
                <span class="metric-label">最低延迟配置</span>
                <span class="metric-value">{best['config']}</span>
                <span class="metric-label">{best['p95_latency']:.2f}ms (P95)</span>
            </div>
            <div class="metric">
                <span class="metric-label">最高吞吐配置</span>
                <span class="metric-value">{fastest['config']}</span>
                <span class="metric-label">{fastest['msg_per_sec']:.1f} msg/s</span>
            </div>
            <div class="metric">
                <span class="metric-label">最大承载配置</span>
                <span class="metric-value">{highest_capacity['config']}</span>
                <span class="metric-label">{highest_capacity['total_coins']} 硬币</span>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>💡 建议</h2>
        <ul>
'''

        for r in self.results:
            if r['p95_latency'] < 10:
                html += f"<li class='status-good'>✅ <strong>{r['config']}</strong>: 性能优秀，延迟低于10ms，适合生产环境</li>"
            elif r['p95_latency'] < 50:
                html += f"<li class='status-warn'>⚠️ <strong>{r['config']}</strong>: 性能良好，可用于生产，建议预留20%性能余量</li>"
            else:
                html += f"<li class='status-bad'>❌ <strong>{r['config']}</strong>: 性能不足，建议升级配置或优化代码</li>"

        html += '''
        </ul>
    </div>
</body>
</html>
'''

        with open(output, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f'✅ HTML报告已生成: {output}')

    def plot_charts(self):
        """生成性能图表"""
        try:
            import matplotlib.pyplot as plt
            import matplotlib
            matplotlib.use('Agg')  # 非交互式后端
        except ImportError:
            print('❌ 需要安装 matplotlib: pip install matplotlib')
            return

        if not self.results:
            print('❌ 未找到测试结果')
            return

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('性能测试结果', fontsize=16, fontweight='bold')

        configs = [r['config'] for r in self.results]

        # 1. 延迟对比
        ax1 = axes[0, 0]
        avg_latencies = [r['avg_latency'] for r in self.results]
        p95_latencies = [r['p95_latency'] for r in self.results]
        p99_latencies = [r['p99_latency'] for r in self.results]

        x = range(len(configs))
        width = 0.25
        ax1.bar([i - width for i in x], avg_latencies, width, label='平均延迟')
        ax1.bar(x, p95_latencies, width, label='P95延迟')
        ax1.bar([i + width for i in x], p99_latencies, width, label='P99延迟')
        ax1.set_ylabel('延迟 (ms)')
        ax1.set_title('延迟对比')
        ax1.set_xticks(x)
        ax1.set_xticklabels(configs)
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # 2. 吞吐量对比
        ax2 = axes[0, 1]
        msg_rates = [r['msg_per_sec'] for r in self.results]
        ax2.bar(configs, msg_rates, color='#667eea')
        ax2.set_ylabel('消息/秒')
        ax2.set_title('吞吐量对比')
        ax2.grid(True, alpha=0.3)

        # 3. 承载能力
        ax3 = axes[1, 0]
        total_coins = [r['total_coins'] for r in self.results]
        ax3.bar(configs, total_coins, color='#764ba2')
        ax3.set_ylabel('硬币数量')
        ax3.set_title('承载能力对比')
        ax3.grid(True, alpha=0.3)

        # 4. CPU使用率（如果有监控数据）
        ax4 = axes[1, 1]
        if self.monitors:
            cpu_avgs = []
            cpu_labels = []
            for r in self.results:
                profile = r['profile']
                if profile in self.monitors:
                    data = self.monitors[profile]
                    cpu_values = [float(d['cpu_percent']) for d in data if d['cpu_percent']]
                    if cpu_values:
                        cpu_avgs.append(sum(cpu_values) / len(cpu_values))
                        cpu_labels.append(r['config'])

            if cpu_avgs:
                ax4.bar(cpu_labels, cpu_avgs, color='#f093fb')
                ax4.set_ylabel('CPU使用率 (%)')
                ax4.set_title('平均CPU使用率')
                ax4.grid(True, alpha=0.3)
            else:
                ax4.text(0.5, 0.5, '无CPU数据', ha='center', va='center')
        else:
            ax4.text(0.5, 0.5, '无监控数据', ha='center', va='center')

        plt.tight_layout()
        output_file = 'perf-charts.png'
        plt.savefig(output_file, dpi=150)
        print(f'✅ 图表已生成: {output_file}')

def main():
    analyzer = PerfAnalyzer()
    analyzer.load_data()

    if len(sys.argv) > 1:
        if '--html' in sys.argv:
            analyzer.generate_html_report()
        elif '--plot' in sys.argv:
            analyzer.plot_charts()
        else:
            print('用法: python3 analyze-perf.py [--html] [--plot]')
    else:
        analyzer.print_summary()

if __name__ == '__main__':
    main()
