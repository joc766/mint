# Hot Reload in Docker

This document explains how hot reload (Hot Module Replacement / HMR) works for the Next.js frontend when running in Docker, and how to troubleshoot issues.

## Overview

Hot reload allows you to see your code changes instantly in the browser without manually restarting the container or refreshing the page. This is essential for a smooth development experience.

## How It Works

Hot reload in Docker requires three components working together:

1. **Volume Mounts** - Your local source code is mounted into the container
2. **File Watching** - The container detects when files change on the host
3. **HMR Client** - The browser connects to the dev server and receives updates

## Configuration

### 1. Volume Mount Strategy

In `docker-compose.yml` and `docker-compose.override.yml`:

```yaml
volumes:
  - ./frontend:/app:cached  # cached mode for macOS performance
  - /app/node_modules        # Prevent host from overwriting container's node_modules
  - /app/.next               # Prevent host from overwriting container's build cache
```

#### Volume Mount Modes on macOS

Docker Desktop on macOS supports three consistency modes:

- **`consistent`** (default): Perfect two-way sync between host and container (SLOWEST)
- **`cached`**: Host is authoritative, container reads are cached (BEST for development)
- **`delegated`**: Container is authoritative, host writes are delayed

**We use `:cached`** because:
- Next.js development server reads files frequently from the mounted volume
- The host (your editor) writes files, and the container needs to read them quickly
- Fast read performance is critical for hot reload responsiveness
- Slight delay in container-to-host sync is acceptable in development

### 2. File Watching Environment Variables

In `docker-compose.yml` and `docker-compose.override.yml`:

```yaml
environment:
  - WATCHPACK_POLLING=true      # Enable webpack polling
  - CHOKIDAR_USEPOLLING=true    # Enable chokidar polling
```

#### Why Polling is Needed

Docker containers on macOS and Windows use virtualization, which breaks native file system events. Polling mode explicitly checks for file changes at regular intervals instead of relying on OS events.

- **WATCHPACK_POLLING**: Used by webpack (Next.js's bundler) to detect file changes
- **CHOKIDAR_USEPOLLING**: Used by Next.js's file watcher for detecting page/component changes

### 3. Webpack Configuration

In `frontend/next.config.mjs`:

```javascript
webpack: (config, { dev, isServer }) => {
  if (dev && !isServer) {
    config.watchOptions = {
      poll: 1000,           // Check for changes every 1 second
      aggregateTimeout: 300 // Wait 300ms after change before rebuilding
    };
  }
  return config;
}
```

This configuration:
- **poll: 1000**: Checks for file changes every second (1000ms)
- **aggregateTimeout: 300**: Waits 300ms after detecting a change before triggering a rebuild
  - This prevents multiple rapid rebuilds when you save several files quickly

### 4. Dockerfile Configuration

The development stage in `frontend/Dockerfile`:

```dockerfile
FROM base AS development

# Development-specific environment variables
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3000

# Use pnpm dev with polling enabled
CMD ["pnpm", "dev"]
```

**Important**: The development stage does NOT copy source code (`COPY . .`) because the code is mounted via volumes. This prevents conflicts between the container's built-in code and the mounted code.

## Testing Hot Reload

### Quick Test

1. Start the development environment:
   ```bash
   docker-compose up
   ```

2. Open your browser to http://localhost:3000

3. Edit a file (e.g., `frontend/app/page.tsx`):
   ```typescript
   // Add or change some text
   <h1>Hello World - Test Change!</h1>
   ```

4. Save the file

5. Check the container logs:
   ```bash
   docker-compose logs -f frontend
   ```
   
   You should see:
   ```
   expense-tracker-app  | ⚠ Fast Refresh had to perform a full reload.
   expense-tracker-app  | ✓ Compiled /page in 234ms
   ```

6. The browser should automatically refresh with your changes

### Browser Console Test

Open the browser console (F12) and look for HMR messages:
```
[HMR] connected
[Fast Refresh] rebuilding
[Fast Refresh] done
```

## Troubleshooting

### Issue: Changes Not Appearing

**Symptoms:**
- You save a file but nothing happens in the browser
- No recompilation messages in logs
- Browser doesn't refresh

**Solutions:**

1. **Verify volume mounts:**
   ```bash
   docker-compose config | grep -A 10 volumes
   ```
   
   Should show:
   ```yaml
   - ./frontend:/app:cached
   - /app/node_modules
   - /app/.next
   ```

2. **Check environment variables:**
   ```bash
   docker-compose exec frontend env | grep -E "WATCH|CHOKIDAR"
   ```
   
   Should show:
   ```
   WATCHPACK_POLLING=true
   CHOKIDAR_USEPOLLING=true
   ```

3. **Verify file changes are reaching the container:**
   ```bash
   # Make a change to a file
   echo "// test" >> frontend/app/page.tsx
   
   # Check if the file changed in the container
   docker-compose exec frontend cat app/page.tsx | tail -n 1
   ```
   
   Should show your test comment.

4. **Restart the container:**
   ```bash
   docker-compose restart frontend
   docker-compose logs -f frontend
   ```

5. **Clean rebuild:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### Issue: "Not a directory" Error

**Symptom:**
```
Error: ENOTDIR: not a directory, open '/app/next-env.d.ts'
```

**Cause:**
Docker tried to mount `/app/next-env.d.ts` as an anonymous volume, but it's a file, not a directory.

**Solution:**
Ensure `docker-compose.yml` and `docker-compose.override.yml` do NOT have:
```yaml
volumes:
  - /app/next-env.d.ts  # ❌ REMOVE THIS
```

### Issue: Slow Hot Reload (>5 seconds)

**Symptoms:**
- Changes take a long time to appear
- Multiple second delay between save and reload

**Solutions:**

1. **Increase Docker Desktop resources:**
   - Docker Desktop → Settings → Resources
   - Increase CPUs to 4+ and Memory to 4GB+

2. **Verify `:cached` mount mode is used:**
   ```bash
   docker-compose config | grep "frontend:/app"
   ```
   
   Should show `:cached`, not `:delegated` or `:consistent`

3. **Adjust polling interval** (if 1 second is too aggressive):
   
   In `frontend/next.config.mjs`:
   ```javascript
   poll: 2000,  // Change from 1000 to 2000 (check every 2 seconds)
   ```

4. **Check system resources:**
   ```bash
   docker stats
   ```
   
   If CPU/memory usage is high, close other applications or increase Docker resources.

### Issue: "ENOSPC: System limit for file watchers reached" (Linux only)

**Symptom:**
```
Error: ENOSPC: System limit for number of file watchers reached
```

**Solution (Linux hosts only):**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Note:** This is not an issue on macOS or Windows.

### Issue: Hot Reload Works but Browser Doesn't Refresh

**Symptoms:**
- Container logs show compilation
- Changes are applied (visible after manual refresh)
- Browser doesn't auto-refresh

**Solutions:**

1. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for WebSocket connection errors
   - Look for CORS errors

2. **Verify port 3000 is accessible:**
   ```bash
   curl http://localhost:3000
   ```

3. **Hard refresh the browser:**
   - macOS: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

4. **Check for browser extensions blocking WebSocket:**
   - Try in incognito/private mode
   - Disable ad blockers or security extensions

5. **Ensure you're accessing via `localhost:3000`, not `127.0.0.1:3000`**
   - Some HMR implementations are sensitive to the hostname

## Production Mode (No Hot Reload)

In production mode, hot reload is disabled:

```bash
BUILD_MODE=production docker-compose up --build
```

**Differences:**
- No volume mounts (code is baked into the image)
- No file watching (WATCHPACK_POLLING and CHOKIDAR_USEPOLLING not needed)
- Optimized standalone build
- Faster startup and better performance
- Changes require rebuilding the container

## Performance Tips

### Optimal Development Setup

1. **Use `:cached` mount mode** - Best for read-heavy workloads (development server reading your code)

2. **Set reasonable polling interval** - 1000ms (1 second) is good for most cases
   - Decrease to 500ms for faster feedback (higher CPU usage)
   - Increase to 2000ms for slower machines

3. **Exclude unnecessary files** - In `frontend/.dockerignore`:
   ```
   node_modules
   .next
   .git
   *.log
   ```

4. **Allocate sufficient Docker resources** - At least:
   - 4 CPU cores
   - 4GB RAM
   - 1GB swap

### When Hot Reload Isn't Worth It

In some cases, you might want to run the frontend outside Docker:

```bash
cd frontend
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev
```

**Consider this when:**
- Your machine is resource-constrained
- You're only working on the frontend (not the backend)
- You need the absolute fastest hot reload times
- You're experiencing persistent Docker issues

## Reference

### Key Files

- `docker-compose.yml` - Base configuration with file watching variables
- `docker-compose.override.yml` - Development overrides with volume mounts
- `frontend/Dockerfile` - Multi-stage build (development target)
- `frontend/next.config.mjs` - Webpack polling configuration

### Environment Variables

| Variable | Purpose | Value |
|----------|---------|-------|
| `WATCHPACK_POLLING` | Enable webpack file watching | `true` |
| `CHOKIDAR_USEPOLLING` | Enable Next.js file watching | `true` |
| `NODE_ENV` | Node environment mode | `development` |

### Volume Mounts

| Mount | Purpose | Mode |
|-------|---------|------|
| `./frontend:/app` | Source code | `:cached` |
| `/app/node_modules` | Prevent host override | anonymous |
| `/app/.next` | Prevent host override | anonymous |

## Additional Resources

- [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [Docker Volume Performance](https://docs.docker.com/storage/bind-mounts/#configure-mount-consistency)
- [Webpack Watch Options](https://webpack.js.org/configuration/watch/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
