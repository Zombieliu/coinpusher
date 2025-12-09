'use client'

import { FileText, Download } from 'lucide-react'

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">日志查询</h2>
        <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
          <Download className="h-5 w-5" />
          导出日志
        </button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-2">日志类型</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>全部</option>
              <option>操作日志</option>
              <option>登录日志</option>
              <option>交易日志</option>
              <option>异常日志</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">开始时间</label>
            <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">结束时间</label>
            <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">用户ID</label>
            <input type="text" placeholder="可选" className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            查询
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>请设置筛选条件后查询</p>
        </div>
      </div>
    </div>
  )
}
