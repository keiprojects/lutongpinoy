# LutongPinoy — Next.js PWA

Filipino meal planner with day/week/month recipe rotations, cooking instructions, photos and grocery lists.

## Uploading the full app
The completed Next.js/TypeScript source is available as `LutongPinoy_Nextjs_PWA_GitHub.zip` in the ChatGPT conversation that generated this project. Extract the ZIP and upload the **contents of `lutongpinoy-next/`**, including the hidden `.github/` folder, to the root of this repository.

## Run locally
```bash
npm install
npm run dev
```

## Deploy to GitHub Pages
1. In Settings → Pages, choose **GitHub Actions** as the build/deployment source.
2. The included `.github/workflows/deploy.yml` publishes automatically after each push to `main`.
3. The production URL will be https://keiprojects.github.io/lutongpinoy/ after a successful deployment.

## PWA
The site includes an installable manifest, icons, and a service worker for caching. Open the HTTPS site in Chrome for Android and choose **Install app** or **Add to Home screen**.

**Status:** This repository is initialized; the application source still needs to be uploaded.
