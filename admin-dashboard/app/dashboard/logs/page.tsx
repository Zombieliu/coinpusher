'use client'

import { FileText, Download } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function LogsPage() {
  const { t } = useTranslation('logs')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t('export')}
        </button>
      </div>

      {/* filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('filter.type')}</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>{t('filter.typeOptions.all')}</option>
              <option>{t('filter.typeOptions.action')}</option>
              <option>{t('filter.typeOptions.login')}</option>
              <option>{t('filter.typeOptions.trade')}</option>
              <option>{t('filter.typeOptions.error')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('filter.start')}</label>
            <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('filter.end')}</label>
            <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('filter.userId')}</label>
            <input type="text" placeholder={t('filter.userPlaceholder')} className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            {t('filter.submit')}
          </button>
        </div>
      </div>

      {/* empty state */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>{t('empty')}</p>
        </div>
      </div>
    </div>
  )
}
