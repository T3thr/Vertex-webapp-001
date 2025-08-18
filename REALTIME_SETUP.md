# Real-time Collaboration Setup Guide

## 🚀 Quick Start

### Option 1: Safe Mode (Recommended for development)
```bash
npm run dev:safe
```
This runs the app without WebSocket features, avoiding connection errors.

### Option 2: Full Real-time Mode
```bash
# Make sure port 3000 is free, then:
npm run dev
```
This runs the custom server with Socket.IO support.

### Option 3: Different Port
```bash
PORT=3001 npm run dev
```
Run on a different port if 3000 is occupied.

## 🔧 Troubleshooting

### WebSocket Connection Errors
If you see WebSocket timeout errors:

1. **Use Safe Mode**: Run `npm run dev:safe` to disable real-time features
2. **Check Port**: Make sure port 3000 is not used by another process
3. **Environment Check**: Run `node scripts/check-env.js` to verify setup

### Common Issues

#### "timeout" or "websocket error"
- **Cause**: Socket.IO server not running or port conflict
- **Solution**: Use `npm run dev:safe` or different port

#### "EADDRINUSE" error
- **Cause**: Port 3000 is already in use
- **Solution**: Stop other processes or use different port

#### Real-time features not working
- **Expected**: Real-time is only enabled in development mode
- **Status**: App continues to work without real-time features

## 🏗️ Architecture Modes

### Development Mode
- **With Socket.IO**: `npm run dev` (requires custom server)
- **Without Socket.IO**: `npm run dev:safe` (standard Next.js)

### Production Mode
- Real-time features are disabled by default
- Use standard Next.js deployment

## 📝 Features Status

### ✅ Always Available
- Command Pattern with undo/redo
- Event Sourcing
- Intelligent Auto-Save
- Offline Support
- Performance Optimizations

### 🔄 Real-time Features (when connected)
- Live collaboration
- Cursor tracking
- Real-time synchronization
- Presence awareness

### 🔧 Environment Variables

```bash
# Optional: Custom port
PORT=3001

# Optional: Disable real-time in development
DISABLE_REALTIME=true
```

## 🎯 Recommended Workflow

1. **Start Development**: `npm run dev:safe`
2. **Test Real-time**: `npm run dev` (when needed)
3. **Debug Issues**: `node scripts/check-env.js`

The app is designed to gracefully fallback to offline mode when real-time features are unavailable.
