# 璀璨圣诞树 · Merry Christmas

一个从零构建的 3D 交互式圣诞树网页，支持星光粒子圣诞树、金色丝带礼盒与彩球、螺旋彩灯、飘雪、内置圣诞八音盒与本地音乐频谱律动、拍立得回忆相册（点击放大 / 手势轮播），以及浏览器端摄像头 AI 手势控制。

## 在线体验（GitHub Pages）

推送代码并在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions** 后，即可通过以下链接访问：

- 电脑完整版：https://zhangzhe189.github.io/chris/
- 手机轻量版：https://zhangzhe189.github.io/chris/?lite=1

## 核心功能

- **4 套一键主题预设 + 自由调色**：默认午夜蓝金，内置黑金奢华、冰雪极光、经典松绿，并支持微调粒子、礼盒、丝带与彩球颜色及数量。
- **3D 拍立得回忆相册**：支持批量上传 JPG / PNG / WebP（纯本地 IndexedDB 存储，不上传服务器），鼠标/触屏直接点击 3D 相框即可飞至镜头前放大浏览，也支持手势捏合轮播。
- **圣诞音乐与实时频谱律动**：内置 Web Audio API 圣诞八音盒旋律，同时支持上传本地 MP3 / WAV 音频，灯光与装饰随音乐节拍闪烁缩放。
- **AI 摄像头手势控制**：本地静态托管 MediaPipe Hands 模型（不依赖海外 CDN、不上传摄像头画面）：
  - 张开手掌：圣诞树星光粒子与礼盒绽放散开；
  - 握拳 / 悬停：聚拢回圣诞树形态；
  - 拇指与食指捏合：轮播放大下一张拍立得照片。
- **圣诞倒计时 & 轻量模式**：实时显示距圣诞节倒计时；`?lite=1` 自动降低粒子与后处理开销，适配移动端。

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```
