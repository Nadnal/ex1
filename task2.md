## Section 6: Supabase Object Store
Supabase is an open-source Firebase alternative that provides developers with a complete backend-as-a-service platform centered around PostgreSQL, a powerful relational database system offering full SQL capabilities, real-time subscriptions, and robust extensions for scalable data management. Its object storage is an S3-compatible service designed for storing and serving files like images, videos, and user-generated content.

Website: https://supabase.com/

**Requirements**:
- Build a document upload and file management system powered by Supabase. The backend will include API endpoints to interact with Supabse.
- **Note:** The detailed requirement will be discussed in week 4 lecture.
- Make regular commits to the repository and push the update to Github.
- Capture and paste the screenshots of your steps during development and how you test the app. Show a screenshot of the documents stored in your Supabase Object Database.

Test the app in your local development environment, then deploy the app to Vercel and ensure all functionality works as expected in the deployed environment.

**Steps with major screenshots:**

### 前置准备

#### 1. 注册并配置 Supabase 账号

1. 访问 [https://supabase.com/](https://supabase.com/) 并注册账号（使用 GitHub 登录更快）
2. 创建一个新的 Supabase 项目：
   - 项目名称：`ai-summary-app`
   - Database 密码：自行保存
   - 区域：选择距离最近的数据中心（如 Hong Kong）

3. 等待项目初始化完成（约 1-2 分钟）

#### 2. 创建 Storage Bucket

1. 在 Supabase 仪表盘左侧导航中选择 **Storage**
2. 点击 **Create a new bucket**：
   - Bucket 名称：`documents`
   - **Public bucket**：勾选（允许前端直接访问上传文件）
   - 点击 **Create bucket**

> [截图占位符] — 显示创建 `documents` bucket 后的 Storage 列表界面

#### 3. 创建数据表

在 Supabase 仪表盘选择 **SQL Editor**，执行以下 SQL 创建表结构：

```sql
-- 存储文档元信息
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  size INT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 存储 AI 生成的摘要
CREATE TABLE IF NOT EXISTS document_summaries (
  id SERIAL PRIMARY KEY,
  document_path TEXT NOT NULL REFERENCES documents(file_path) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_summaries_document_path ON document_summaries(document_path);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON document_summaries(created_at DESC);
```

点击 **Run** 执行。成功后刷新 **Database → Tables** 确认 `documents` 和 `document_summaries` 表已创建。

> [截图占位符] — 显示 `documents` 和 `document_summaries` 表结构的数据库表列表

#### 4. 获取 API 密钥

1. 在 Supabase 仪表盘选择 **Settings → API**
2. 复制以下两项内容：
   - **Project URL**: `https://xxxx.supabase.co`
   - **service_role key** (在 **Project API keys** 下方，点击展开后复制，注意不是 `anon` key)

#### 5. 配置本地环境变量

在 `my-app/` 根目录创建 `.env` 文件（此文件已被 `.gitignore` 忽略），内容如下：

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...
SUPABASE_BUCKET=documents
OPENAI_API_KEY=sk-proj-xxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
MAX_UPLOAD_BYTES=5000000
```

说明：
- `OPENAI_API_KEY` 可在 [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) 获取（需要信用卡绑定）
- **如果没有 OpenAI key**，可以暂时留空，代码会自动使用回退策略生成基础摘要
- **切勿将 `.env` 文件提交到 GitHub！** `.gitignore` 已包含 `.env*` 规则，确保安全

---

### Supabase 对象存储实施（上传与文件管理）

#### 已实现的功能

在前置准备步骤中已创建以下代码：

1. **Supabase 客户端工具** (`app/lib/supabase-server.ts`)：
   - 使用 `service_role` 密钥初始化服务端客户端，绕过 RLS 权限限制

2. **上传 API** (`app/api/upload/route.ts`)：
   - 接收客户端 FormData 上传的文件
   - 校验文件大小（默认 5 MB 限制）
   - 上传至 Supabase Storage `documents` bucket
   - 同步写入 `documents` 表记录元信息（文件名、路径、大小、MIME 类型）

3. **文件列表与删除 API** (`app/api/files/route.ts`)：
   - `GET /api/files`：从 Storage 查询最近上传的 100 个文件
   - `DELETE /api/files`：根据 `filePath` 删除 Storage 对象 + 数据库记录

4. **前端交互界面** (`app/page.tsx`)：
   - 文件上传表单（支持拖拽或点击选择）
   - 上传成功后自动刷新文件列表
   - 每个文件提供"Summarize"和"Delete"按钮

#### 本地测试步骤

1. **启动开发服务器**：
   ```bash
   cd /workspaces/ex1/my-app
   npm run dev -- --port 3000
   ```

2. **访问应用**：
   - 打开浏览器访问 `http://localhost:3000`
   - 点击"Check backend"按钮确认后端正常

3. **上传测试文件**：
   - 点击文件上传区域，选择一个 `.txt` 文件（建议 1-10 KB 的纯文本文件，方便后续摘要测试）
   - 点击"Upload"按钮
   - 上传成功后页面状态栏显示"Upload success: xxx.txt"
   - 文件列表自动刷新，显示刚上传的文件名、大小

4. **验证 Supabase Storage**：
   - 返回 Supabase 仪表盘 → **Storage → documents**
   - 确认文件出现在存储桶中，文件名格式为 `{timestamp}-{safe_filename}`

> [截图占位符] — 显示 Supabase Storage `documents` bucket 中上传的文件列表

5. **验证数据库记录**：
   - 打开 Supabase **Table Editor → documents** 表
   - 确认出现一条新记录，包含 `filename`、`file_path`、`size`、`mime_type`、`created_at` 字段

> [截图占位符] — 显示 `documents` 表中的文件元数据记录

6. **删除文件测试**：
   - 在前端文件列表中点击任意文件的 **Delete** 按钮
   - 确认文件从列表中消失
   - 返回 Supabase Storage 和数据库表确认文件已被彻底删除

#### 故障排查

- **上传失败 "Missing env vars"**：
  - 检查 `.env` 文件是否存在于 `my-app/` 目录
  - 确认 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 已正确配置
  - 重启开发服务器 (`Ctrl+C` 后重新运行 `npm run dev`)

- **上传失败 "Bucket not found"**：
  - 确认 Supabase 中已创建名为 `documents` 的 bucket
  - 确认 `.env` 中 `SUPABASE_BUCKET=documents` 拼写正确

- **403 Forbidden**：
  - 确认使用的是 `service_role` key 而非 `anon` key
  - 检查 Supabase bucket 是否设置为 Public（或配置了正确的 RLS 策略）

#### 提交检查点

```bash
cd /workspaces/ex1
git add my-app
git commit -m "feat(section6): implement Supabase upload, file listing and deletion"
git push
```

## Section 7: AI Summary for documents
**Requirements:**  
- **Note:** The detailed requirement will be discussed in week 4 lecture.
- Make regular commits to the repository and push the update to Github.
- Capture and paste the screenshots of your steps during development and how you test the app.
- The app should be mobile-friendly and have a responsive design.
- **Important:** You should securely handlle your API keys when pushing your code to GitHub and deploying your app to the production.
- When testing your app, try to explore some tricky and edge test cases that AI may miss. AI can help generate basic test cases, but it's the human expertise to  to think of the edge and tricky test cases that AI cannot be replace. 

Test the app in your local development environment, then deploy the app to Vercel and ensure all functionality works as expected in the deployed environment. 


**Steps with major screenshots:**

### AI 文档摘要实施

#### 已实现的功能

1. **AI 摘要工具** (`app/lib/summarize.ts`)：
   - 优先使用 OpenAI API (`gpt-4o-mini` 模型) 生成中文摘要
   - 当 `OPENAI_API_KEY` 未配置时，自动切换为**回退模式**：截取文档前 360 字符作为预览摘要
   - 返回摘要文本 + 使用的模型名称

2. **摘要 API** (`app/api/summarize/route.ts`)：
   - 从 Supabase Storage 下载指定文件
   - 提取文件文本内容（支持 `.txt`、`.md`、`.json` 等纯文本格式）
   - 调用 `summarizeText` 生成摘要
   - 将摘要写入 `document_summaries` 表，关联原始文件路径

3. **摘要列表 API** (`app/api/summaries/route.ts`)：
   - 查询最近 20 条摘要记录

4. **前端展示** (`app/page.tsx`)：
   - 在文件列表中为每个文件提供 **Summarize** 按钮
   - 点击后调用 `POST /api/summarize`，等待摘要生成
   - 成功后自动刷新"Recent summaries"区域，显示摘要内容

#### 本地测试步骤

1. **确保 OpenAI API Key 配置**（可选）：
   - 如果希望生成高质量 AI 摘要，在 `.env` 中配置：
     ```env
     OPENAI_API_KEY=sk-proj-xxxxxxxxxx
     ```
   - 如果不配置，系统会自动使用回退模式，仍能正常运行

2. **上传测试文档**：
   - 准备一个包含至少 100 字以上内容的 `.txt` 文件（中文或英文均可）
   - 在前端上传该文件

3. **生成摘要**：
   - 在文件列表中找到刚上传的文件，点击 **Summarize** 按钮
   - 页面状态栏显示"Summarizing xxx.txt..."
   - 等待 2-5 秒（取决于文件大小和 API 响应速度）
   - 成功后状态栏显示"Summary ready (gpt-4o-mini)" 或 "(fallback)"

4. **查看摘要**：
   - 滚动到页面底部"Recent summaries"区域
   - 确认出现新生成的摘要，包含：
     - 文件路径
     - 摘要文本（中文，3-5 句话）
     - 使用的模型名称

> [截图占位符] — 显示前端"Recent summaries"区域展示的 AI 摘要卡片

5. **验证数据库记录**：
   - 打开 Supabase **Table Editor → document_summaries** 表
   - 确认出现一条新记录：
     - `document_path`：对应文件路径
     - `summary`：生成的摘要文本
     - `model`：`gpt-4o-mini` 或 `fallback`
     - `created_at`：时间戳

> [截图占位符] — 显示 `document_summaries` 表中的摘要记录

#### 边缘测试用例

以下是一些容易被忽略的测试场景，建议手动验证：

- **空文件测试**：上传一个 0 字节或只有空行的文件，确认摘要显示为"文档为空，暂无可总结内容"
- **超长文件测试**：上传一个 1 MB+ 的文本文件，确认系统只处理前 15000 字符（避免 token 限制）
- **特殊字符文件名**：上传包含中文、空格、特殊符号的文件，确认系统能正确转义并存储
- **连续摘要测试**：快速点击多个文件的 Summarize 按钮，确认异步请求不会互相干扰
- **无网络环境测试**：断开网络后尝试摘要，确认错误信息友好展示

#### 移动端响应式验证

按 `F12` 打开浏览器开发者工具，切换到移动设备模拟模式（iPhone/Android）：
- 确认按钮足够大，易于点击
- 文件列表在小屏幕下垂直排列，不出现横向滚动
- 摘要文本自动换行，无溢出
- 表单输入框宽度自适应

> [截图占位符] — 显示手机屏幕下的应用界面（竖屏模式）

#### API Key 安全处理

**本地开发**：
- `.env` 文件已被 `.gitignore` 排除，不会提交到 GitHub

**生产环境（Vercel 部署）**：
1. 打开 Vercel 项目面板 → **Settings → Environment Variables**
2. 依次添加以下变量：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`（如果使用 OpenAI）
   - `SUPABASE_BUCKET` = `documents`
3. Environment 选择：**Production, Preview, Development** 全部勾选
4. 点击 **Save** 后重新部署

**验证安全性**：
- 查看 GitHub 仓库源代码，确认 `.env` 文件未被提交
- 在浏览器中打开部署的应用，按 `F12` → **Network** 标签，确认请求头中不包含 API Key（密钥仅存在于服务端）

#### 提交检查点

```bash
git add my-app
git commit -m "feat(section7): implement AI summarization with OpenAI and fallback mode"
git push
```


## Section 8: Database Integration with Supabase  
**Requirements:**  
- Enhance the app to integrate with the Postgres database in Supabase to store the information about the documents and the AI generated summary.
- Make regular commits to the repository and push the update to Github.
- Capture and paste the screenshots of your steps during development and how you test the app.. Show a screenshot of the data stored in your Supabase Postgres Database.

Test the app in your local development environment, then deploy the app to Vercel and ensure all functionality works as expected in the deployed environment.

**Steps with major screenshots:**

### Supabase PostgreSQL 数据库集成

**状态：已完成**

Section 6 和 Section 7 已实现完整的数据库集成：

1. **documents 表**：存储文件元信息（见 Section 6）
2. **document_summaries 表**：存储 AI 生成的摘要（见 Section 7）
3. **外键关联**：`document_summaries.document_path` 关联 `documents.file_path`，支持级联删除

#### 数据一致性验证

1. **上传文件后查询**：
   ```sql
   SELECT * FROM documents ORDER BY created_at DESC LIMIT 5;
   ```

2. **生成摘要后查询**：
   ```sql
   SELECT 
     ds.id,
     ds.document_path,
     ds.summary,
     ds.model,
     d.filename,
     d.size
   FROM document_summaries ds
   LEFT JOIN documents d ON ds.document_path = d.file_path
   ORDER BY ds.created_at DESC
   LIMIT 5;
   ```

3. **级联删除测试**：
   - 在前端删除一个已生成摘要的文件
   - 在 Supabase SQL Editor 中执行：
     ```sql
     SELECT * FROM document_summaries WHERE document_path = '{已删除的文件路径}';
     ```
   - 确认结果为空（外键级联删除已生效）

> [截图占位符] — 显示关联查询结果，包含文件名和对应的摘要内容

#### 提交检查点

```bash
git add my-app
git commit -m "docs(section8): verify database integration and cascading deletes"
git push
```

---

### 部署到 Vercel

1. **安装 Vercel CLI**（如果未安装）：
   ```bash
   npm i -g vercel
   ```

2. **登录并部署**：
   ```bash
   cd /workspaces/ex1/my-app
   vercel login
   vercel --prod
   ```

3. **配置环境变量**：
   - 在 Vercel 仪表盘为项目添加所有必需的环境变量（见 Section 7 安全处理部分）

4. **验证生产环境**：
   - 访问 Vercel 提供的部署 URL
   - 依次测试：健康检查 → 上传文件 → 生成摘要 → 删除文件
   - 确认所有功能在生产环境正常工作

> [截图占位符] — 显示 Vercel 部署成功界面和生产环境 URL

---

### 最终提交

```bash
git add .
git commit -m "feat: complete AI Summary App with Supabase and OpenAI integration"
git push
```


## Section 9: Additional Features [OPTIONAL]
Implement at least one additional features that you think is useful that can better differentiate your app from others. Describe the feature that you have implemented and provide a screenshot of your app with the new feature.

### 示例扩展功能建议

以下是一些可以提升应用价值的可选功能方向：

1. **批量上传与处理**：
   - 支持一次上传多个文件并自动生成摘要队列
   - 在前端显示处理进度条

2. **文档预览功能**：
   - 点击文件名后通过 Modal 或侧边栏显示文件原始内容
   - 支持 Markdown 渲染、代码高亮

3. **摘要导出功能**：
   - 添加"Export as PDF"或"Export as JSON"按钮
   - 将所有摘要打包下载

4. **智能搜索功能**：
   - 在摘要列表中添加关键词搜索框
   - 使用向量数据库（如 Supabase pgvector）实现语义搜索

5. **多语言摘要**：
   - 允许用户选择摘要语言（中文/英文/日文等）
   - 在 API 中动态调整 prompt

6. **用户认证系统**：
   - 集成 Supabase Auth 实现 Email/OAuth 登录
   - 每个用户只能查看和管理自己的文件

7. **文件分类标签**：
   - 上传时允许添加标签（如"技术文档"、"财务报表"）
   - 在文件列表中按标签筛选

8. **AI 对话增强**：
   - 在摘要基础上添加"Ask follow-up questions"功能
   - 使用 OpenAI Assistant API 构建交互式问答

**实施步骤**：
- 选择其中一个功能，在现有代码基础上扩展
- 创建新的 API 路由和前端组件
- 更新数据库 schema（如果需要）
- 在本地完整测试后部署到 Vercel
- 在下方记录实现过程和最终效果截图

> [你的附加功能描述与截图放在这里]
