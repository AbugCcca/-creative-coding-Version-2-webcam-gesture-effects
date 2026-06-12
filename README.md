# Vibe Particles

一个适合初学者维护的 Vite + React + JavaScript 全屏互动粒子 demo。

## 安装依赖

```bash
npm install
```

如果你在 Windows PowerShell 遇到 `npm.ps1` 执行策略问题，可以改用：

```bash
npm.cmd install
```

## 本地运行

```bash
npm run dev
```

浏览器打开终端里显示的本地地址，通常是 `http://localhost:5173`。

## 文件作用

- `src/App.jsx`：保存粒子参数状态，并组合画布与控制面板。
- `src/components/ParticleCanvas.jsx`：使用原生 Canvas 绘制粒子、缓动、拖尾和发光效果。
- `src/components/ControlPanel.jsx`：右上角控制面板，调整粒子数量、速度、扩散半径和颜色。
- `src/style.css`：全屏布局、黑色背景、Canvas 与控制面板样式。
- `src/main.jsx`：React 应用入口。
- `vite.config.js`：Vite React 插件配置。

## 后续接入 MediaPipe 手势识别

1. 安装 MediaPipe 手部识别相关包。
2. 新增一个 `useHandTracking` hook，负责摄像头权限、视频流和手部关键点识别。
3. 把识别到的手掌中心点转换成屏幕坐标。
4. 在 `ParticleCanvas.jsx` 中把当前的鼠标位置来源替换成“鼠标或手势坐标”。
5. 可以把手势距离、张合程度映射到 `radius` 或 `speed`，让粒子根据手势扩散或收缩。
