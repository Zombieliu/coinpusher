# 移动端响应式设计指南

## 概述

管理后台已针对移动端进行了响应式优化，支持手机、平板等不同尺寸设备访问。

## 响应式断点

使用Tailwind CSS的默认断点：

```
sm:  640px   // 手机横屏/小平板
md:  768px   // 平板
lg:  1024px  // 小笔记本
xl:  1280px  // 桌面
2xl: 1536px  // 大屏幕
```

## 布局适配

### 1. 侧边栏导航

**桌面**: 固定左侧边栏 (w-64)
**移动**: 隐藏侧边栏，使用底部导航栏或汉堡菜单

```tsx
// 侧边栏 - 桌面显示，移动隐藏
<div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block">
  {/* 侧边栏内容 */}
</div>

// 移动端导航栏
<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
  <nav className="flex justify-around">
    {navigation.map(item => (
      <Link
        key={item.href}
        href={item.href}
        className="flex flex-col items-center py-2 px-3"
      >
        <item.icon className="h-6 w-6" />
        <span className="text-xs mt-1">{item.name}</span>
      </Link>
    ))}
  </nav>
</div>
```

### 2. 主内容区域

```tsx
// 桌面: 左侧留出侧边栏空间
// 移动: 全宽显示，底部留出导航栏空间
<div className="lg:ml-64 pb-20 lg:pb-0">
  <main className="p-4 lg:p-8">
    {children}
  </main>
</div>
```

### 3. 表格响应式

**桌面**: 标准表格
**移动**: 卡片式布局

```tsx
{/* 桌面表格 */}
<div className="hidden md:block">
  <table className="w-full">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>

{/* 移动卡片 */}
<div className="md:hidden space-y-4">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{item.title}</h3>
        <span className="text-sm text-gray-500">{item.status}</span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>时间: {formatDate(item.time)}</p>
        <p>操作人: {item.operator}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex-1 px-3 py-1.5 text-sm border rounded">
          查看
        </button>
        <button className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded">
          编辑
        </button>
      </div>
    </div>
  ))}
</div>
```

### 4. 网格布局

```tsx
{/* 自动响应式网格 */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {cards.map(card => (
    <div key={card.id} className="bg-white rounded-lg shadow p-4">
      {card.content}
    </div>
  ))}
</div>
```

### 5. 模态框

```tsx
{/* 响应式模态框 */}
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
    {/* 内容 */}
  </div>
</div>

{/* 移动端全屏模态框 */}
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
  <div className="bg-white rounded-t-2xl md:rounded-lg w-full md:max-w-2xl max-h-[90vh] overflow-auto">
    {/* 内容 */}
  </div>
</div>
```

## 组件适配示例

### Dashboard统计卡片

```tsx
{/* 响应式卡片网格 */}
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  {cards.map((card, index) => (
    <div key={index} className="bg-white rounded-lg shadow p-4 lg:p-6">
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <div className={`${card.color} p-2 lg:p-3 rounded-lg`}>
          <card.icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
        </div>
        <div className="text-xs lg:text-sm">{card.change}</div>
      </div>
      <p className="text-xs lg:text-sm text-gray-600 mb-1">{card.title}</p>
      <p className="text-xl lg:text-2xl font-bold mb-1">{card.value}</p>
      <p className="text-xs text-gray-500">{card.subtitle}</p>
    </div>
  ))}
</div>
```

### 用户管理页面

```tsx
{/* 头部 - 移动端纵向排列 */}
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
  <h2 className="text-xl font-semibold">用户管理</h2>
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
    <input
      type="search"
      placeholder="搜索用户..."
      className="w-full sm:w-64 px-4 py-2 border rounded-lg"
    />
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap">
      批量操作
    </button>
  </div>
</div>
```

### 表单

```tsx
{/* 响应式表单布局 */}
<div className="space-y-4">
  {/* 单列输入 */}
  <div>
    <label className="block text-sm font-medium mb-2">标题</label>
    <input
      type="text"
      className="w-full px-4 py-2 border rounded-lg"
    />
  </div>

  {/* 移动单列，桌面双列 */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-2">开始时间</label>
      <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg" />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">结束时间</label>
      <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg" />
    </div>
  </div>
</div>
```

## 触摸优化

### 1. 增大点击区域

```tsx
{/* 移动端更大的按钮 */}
<button className="px-4 py-2 lg:px-6 lg:py-3 bg-blue-600 text-white rounded-lg">
  提交
</button>

{/* 列表项增大间距 */}
<div className="divide-y">
  {items.map(item => (
    <div key={item.id} className="py-4 lg:py-3">
      {/* 内容 */}
    </div>
  ))}
</div>
```

### 2. 滑动操作

```tsx
{/* 可滑动的选项卡 */}
<div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
  {tabs.map(tab => (
    <button
      key={tab.id}
      className="snap-start flex-shrink-0 px-4 py-2 rounded-lg whitespace-nowrap"
    >
      {tab.name}
    </button>
  ))}
</div>
```

### 3. 底部弹出菜单

```tsx
{/* 移动端底部弹出，桌面下拉菜单 */}
<div className="fixed inset-x-0 bottom-0 lg:absolute lg:inset-auto lg:top-full lg:left-0">
  <div className="bg-white border-t lg:border lg:rounded-lg lg:shadow-lg">
    {/* 菜单项 */}
  </div>
</div>
```

## 性能优化

### 1. 图片优化

```tsx
{/* 响应式图片 */}
<img
  src={image.src}
  alt={image.alt}
  className="w-full h-auto"
  loading="lazy"
  srcSet={`
    ${image.small} 640w,
    ${image.medium} 768w,
    ${image.large} 1024w
  `}
  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
/>
```

### 2. 按需加载

```tsx
{/* 移动端不显示的内容不加载 */}
const [showDesktopFeature, setShowDesktopFeature] = useState(false);

useEffect(() => {
  const checkScreen = () => {
    setShowDesktopFeature(window.innerWidth >= 1024);
  };
  checkScreen();
  window.addEventListener('resize', checkScreen);
  return () => window.removeEventListener('resize', checkScreen);
}, []);

{showDesktopFeature && <DesktopOnlyFeature />}
```

## 测试清单

### 手机端 (< 640px)
- [ ] 侧边栏隐藏，底部导航显示
- [ ] 表格转换为卡片
- [ ] 表单单列布局
- [ ] 模态框全屏或近全屏
- [ ] 按钮和链接易于点击
- [ ] 文字大小适中
- [ ] 滚动流畅

### 平板端 (640px - 1024px)
- [ ] 布局合理利用空间
- [ ] 网格2-3列
- [ ] 侧边栏可选显示/隐藏
- [ ] 表格简化但可用

### 桌面端 (> 1024px)
- [ ] 完整功能
- [ ] 侧边栏固定
- [ ] 多列布局
- [ ] hover效果
- [ ] 快捷键支持

## 常用响应式类

```css
/* 显示/隐藏 */
hidden lg:block              /* 默认隐藏，桌面显示 */
block lg:hidden              /* 默认显示，桌面隐藏 */

/* 布局 */
flex-col lg:flex-row         /* 移动纵向，桌面横向 */
w-full lg:w-auto             /* 移动全宽，桌面自适应 */

/* 间距 */
p-4 lg:p-8                   /* 移动小间距，桌面大间距 */
gap-2 lg:gap-4               /* 响应式间隙 */

/* 文字 */
text-sm lg:text-base         /* 响应式字号 */
text-center lg:text-left     /* 响应式对齐 */

/* 网格 */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

## 实际应用

所有页面已应用响应式设计：

1. **Dashboard** (`/dashboard/page.tsx`)
   - 统计卡片: 1/2/4列响应式网格
   - 图表: 移动单列，桌面双列

2. **用户管理** (`/dashboard/users/page.tsx`)
   - 表格 → 卡片转换
   - 搜索和操作按钮响应式布局

3. **配置管理** (`/dashboard/config/page.tsx`)
   - 配置卡片响应式网格
   - JSON编辑器全宽显示

4. **活动管理** (`/dashboard/events/page.tsx`)
   - 列表卡片化
   - 表单双列 → 单列

5. **邮件系统** (`/dashboard/mails/page.tsx`)
   - 发送表单响应式
   - 模板选择网格

6. **日志查询** (`/dashboard/logs/page.tsx`)
   - 筛选器堆叠布局
   - 日志条目卡片化

## PWA支持 (可选)

可以将管理后台配置为PWA，支持离线访问：

```json
// public/manifest.json
{
  "name": "MOBA游戏运营后台",
  "short_name": "运营后台",
  "description": "游戏运营管理系统",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 总结

移动端适配让管理后台可以在任何设备上使用，提供一致的用户体验：

- ✅ 响应式布局 (手机/平板/桌面)
- ✅ 触摸优化 (大按钮、滑动操作)
- ✅ 表格 → 卡片转换
- ✅ 底部导航栏
- ✅ 全屏/近全屏模态框
- ✅ 性能优化 (懒加载、按需渲染)
- ✅ PWA支持 (可选)

现在管理员可以在移动设备上随时随地处理运营事务！📱
