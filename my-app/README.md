# AI Summary App

一个基于 Next.js + Supabase + OpenAI 构建的文档摘要应用，支持文件上传、管理和自动生成 AI 摘要。

## 功能特性

- **文件上传**：支持上传文本文件至 Supabase 对象存储
- **文件管理**：列出、删除已上传文件
- **AI 摘要**：使用 OpenAI `gpt-4o-mini` 生成中文摘要（无 API Key 时自动回退）
- **数据库持久化**：文件元数据和摘要存储在 PostgreSQL
- **响应式设计**：移动端友好的 Tailwind 界面

## 技术栈

- **前端**：Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **后端**：Next.js API Routes (Serverless Functions)
- **数据库**：Supabase PostgreSQL + Storage
- **AI**：OpenAI API (可选)
- **部署**：Vercel

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Nadnal/ex1.git
cd ex1/my-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

在 `.env` 中填入你的 Supabase 凭据：

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OPENAI_API_KEY=sk-proj-xxx  # 可选
```

### 4. 初始化 Supabase

在 [Supabase 仪表盘](https://supabase.com/dashboard) 中：

1. 创建名为 `documents` 的 Storage Bucket（Public）
2. 在 SQL Editor 中执行以下 SQL：

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  size INT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_summaries (
  id SERIAL PRIMARY KEY,
  document_path TEXT NOT NULL REFERENCES documents(file_path) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_file_path ON documents(file_path);
CREATE INDEX idx_summaries_document_path ON document_summaries(document_path);
CREATE INDEX idx_summaries_created_at ON document_summaries(created_at DESC);
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 部署到 Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

在 Vercel 项目设置中添加环境变量：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`（可选）
- `SUPABASE_BUCKET=documents`

## 项目结构

```
my-app/
├── app/
│   ├── api/                 # API 路由
│   │   ├── health/          # 健康检查
│   │   ├── upload/          # 文件上传
│   │   ├── files/           # 文件列表/删除
│   │   ├── summarize/       # 生成摘要
│   │   └── summaries/       # 查询摘要
│   ├── lib/                 # 共享工具
│   │   ├── config.ts        # 配置管理
│   │   ├── supabase-server.ts # Supabase 客户端
│   │   └── summarize.ts     # AI 摘要逻辑
│   ├── page.tsx             # 首页
│   └── layout.tsx           # 全局布局
├── .env.example             # 环境变量模板
└── package.json
```

## 许可证

MIT
