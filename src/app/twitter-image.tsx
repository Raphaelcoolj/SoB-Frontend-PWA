import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const alt = 'SoB — Connect, Discover & Share at spherebrilliq.online';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function TwitterImage() {
  const logoBase64 = readFileSync(
    join(process.cwd(), 'public/android-chrome-192x192.png')
  ).toString('base64');
  const logoDataUri = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
          background: 'linear-gradient(135deg, #0a0a0c 0%, #1c1c1e 60%, #2a2a2e 100%)',
          color: '#ffffff',
          padding: '64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src={logoDataUri} width={88} height={88} style={{ borderRadius: '20px', objectFit: 'cover' }} />
          <div style={{ fontSize: '72px', fontWeight: 700, letterSpacing: '2px', color: '#ffffff' }}>SoB</div>
        </div>
        <div style={{ fontSize: '42px', fontWeight: 600, color: '#ffffff', textAlign: 'center', lineHeight: 1.35 }}>
          Connect, Discover &amp; Share
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '28px', color: '#9ca3af', lineHeight: 1.35 }}>
          <span>A social platform for discovering ideas, sharing knowledge,</span>
          <span>&amp; connecting with people — SoB · spherebrilliq.online</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}