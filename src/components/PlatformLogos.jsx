/**
 * Native SVG logos for each social media platform.
 * Brand colors and paths sourced from official brand guidelines.
 */

export function LinkedInLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path d="M7.5 9.5h-2v7h2v-7zm-1-3.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm10 3.2h-1.8c-.9 0-1.5.5-1.7.9V9.5h-2v7h2v-3.5c0-1 .4-1.5 1.2-1.5.7 0 1.1.5 1.1 1.5v3.5h2v-4.2c0-2-1-2.8-2.5-2.8h1.7z" fill="white" />
      <path d="M6.5 8.5H8.5V16.5H6.5V8.5ZM7.5 5.5C6.67 5.5 6 6.17 6 7C6 7.83 6.67 8.5 7.5 8.5C8.33 8.5 9 7.83 9 7C9 6.17 8.33 5.5 7.5 5.5Z" fill="white"/>
      <path d="M17.5 8.3C16.6 8.3 15.9 8.7 15.5 9.2V8.5H13.5V16.5H15.5V13C15.5 12 15.9 11.5 16.7 11.5C17.4 11.5 17.8 12 17.8 13V16.5H19.8V12.3C19.8 10.3 18.8 8.3 17.5 8.3Z" fill="white"/>
    </svg>
  );
}

export function XLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path d="M13.808 10.469L18.244 5.5H17.114L13.31 9.737L10.243 5.5H6.5L11.155 12.51L6.5 17.72H7.63L11.653 13.242L14.897 17.72H18.64L13.808 10.469ZM12.224 12.574L11.721 11.848L8.036 6.355H9.706L12.674 10.432L13.177 11.158L17.114 16.905H15.444L12.224 12.574Z" fill="white" />
    </svg>
  );
}

export function RedditLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#FF4500" />
      <path d="M19.5 12c0-.8-.7-1.5-1.5-1.5-.4 0-.7.1-1 .4-1-.7-2.2-1.1-3.5-1.2l.7-3.1 2.1.5c0 .6.5 1 1 1s1-.4 1-1-.4-1-1-1c-.4 0-.7.2-.9.5l-2.4-.5c-.1 0-.3.1-.3.2l-.8 3.5c-1.3.1-2.6.5-3.6 1.2-.3-.2-.6-.4-1-.4-.8 0-1.5.7-1.5 1.5 0 .6.3 1 .8 1.3 0 .2 0 .3 0 .5 0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5c0-.2 0-.3 0-.5.5-.2.8-.7.8-1.3zM9 13.5c0-.6.4-1 1-1s1 .4 1 1-.4 1-1 1-1-.4-1-1zm5.9 2.9c-.7.7-2 .8-2.9.8s-2.2-.1-2.9-.8c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0 .5.5 1.5.7 2.5.7s2-.2 2.5-.7c.1-.1.3-.1.4 0 .1.1.1.3 0 .4zm-.2-1.9c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" fill="white" />
    </svg>
  );
}

export function SnapchatLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#FFFC00" />
      <path d="M12 5c1.6 0 2.9.7 3.5 2 .3.5.3 1.3.2 2.2l-.1.8c.3.1.6.1.9 0 .4-.1.7.1.8.4.1.3 0 .7-.4.9-.2.1-.5.2-.8.2-.2 0-.3 0-.5 0-.1.5-.4 1-1 1.5-.7.6-1.5 1-2.6 1s-1.9-.4-2.6-1c-.6-.5-.9-1-1-1.5-.2 0-.3 0-.5 0-.3 0-.6-.1-.8-.2-.4-.2-.5-.6-.4-.9.1-.3.4-.5.8-.4.3.1.6.1.9 0l-.1-.8c-.1-.9-.1-1.7.2-2.2.6-1.3 1.9-2 3.5-2zm3.5 10.5c.1.3-.1.5-.3.6-.5.1-1 .3-1.4.5-.3.2-.5.5-.7.9-.1.2-.3.3-.5.3h-.1c-.3 0-.6-.2-.9-.2-.4 0-.7.1-1.1.2-.3.1-.5.1-.6 0-.2-.1-.4-.2-.5-.4-.2-.3-.4-.6-.7-.8-.4-.2-.9-.4-1.4-.5-.2-.1-.4-.3-.3-.6.1-.2.3-.4.5-.3.6.2 1.2.4 1.7.7.5.3.8.7 1.1 1.1.1 0 .2 0 .3 0 .4-.1.8-.2 1.2-.2.4 0 .8.1 1.2.2.1 0 .2 0 .3 0 .3-.4.6-.8 1.1-1.1.5-.3 1.1-.5 1.7-.7.2-.1.4.1.5.3z" fill="#333" />
    </svg>
  );
}

export function FacebookLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#1877F2" />
      <path d="M16.5 12.5h-2.5v7h-3v-7h-2v-2.5h2v-1.5c0-2 1.2-3.5 3.5-3.5h2v2.5h-1.5c-.6 0-1 .4-1 1v1.5h2.5l-.5 2.5z" fill="white" />
    </svg>
  );
}

export function InstagramLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="20%" stopColor="#fa7e1e" />
          <stop offset="40%" stopColor="#d62976" />
          <stop offset="60%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="4" fill="url(#ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="3.5" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="16" cy="8" r="1" fill="white" />
    </svg>
  );
}

export function SpotifyLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#1DB954" />
      <path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm3.2 10.1c-.1.2-.4.2-.6.1-1.6-1-3.7-1.2-6.1-.7-.2 0-.4-.1-.5-.3 0-.2.1-.4.3-.5 2.6-.6 4.9-.3 6.7.8.2.1.3.4.2.6zm.8-1.9c-.2.2-.5.3-.7.1-1.9-1.1-4.7-1.5-6.9-.8-.3.1-.5-.1-.6-.3-.1-.3.1-.5.3-.6 2.5-.7 5.6-.4 7.8.9.2.2.3.5.1.7zm.1-2c-2.2-1.3-5.8-1.4-7.9-.8-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 2.4-.7 6.4-.6 8.9.9.3.2.4.5.2.8-.2.2-.6.3-.9.2z" fill="white" />
    </svg>
  );
}

export function YouTubeLogo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="4" fill="#FF0000" />
      <path d="M19.6 8.3c-.2-.8-.8-1.4-1.6-1.6C16.8 6.5 12 6.5 12 6.5s-4.8 0-6 .2c-.8.2-1.4.8-1.6 1.6C4.2 9.5 4.2 12 4.2 12s0 2.5.2 3.7c.2.8.8 1.4 1.6 1.6 1.2.2 6 .2 6 .2s4.8 0 6-.2c.8-.2 1.4-.8 1.6-1.6.2-1.2.2-3.7.2-3.7s0-2.5-.2-3.7zM10.5 14.5v-5l4 2.5-4 2.5z" fill="white" />
    </svg>
  );
}

export const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', Logo: LinkedInLogo, color: '#0A66C2', defaultUrl: 'https://www.linkedin.com' },
  { key: 'x', label: 'X', Logo: XLogo, color: '#000000', defaultUrl: 'https://x.com' },
  { key: 'reddit', label: 'Reddit', Logo: RedditLogo, color: '#FF4500', defaultUrl: 'https://www.reddit.com' },
  { key: 'snapchat', label: 'Snapchat', Logo: SnapchatLogo, color: '#FFFC00', defaultUrl: 'https://www.snapchat.com' },
  { key: 'facebook', label: 'Facebook', Logo: FacebookLogo, color: '#1877F2', defaultUrl: 'https://www.facebook.com' },
  { key: 'instagram', label: 'Instagram', Logo: InstagramLogo, color: '#E4405F', defaultUrl: 'https://www.instagram.com' },
  { key: 'spotify', label: 'Spotify', Logo: SpotifyLogo, color: '#1DB954', defaultUrl: 'https://open.spotify.com' },
  { key: 'youtube', label: 'YouTube', Logo: YouTubeLogo, color: '#FF0000', defaultUrl: 'https://www.youtube.com' },
];
